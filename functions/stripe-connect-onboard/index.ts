import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    // Extract JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Create Supabase client with user's JWT to get authenticated user
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the caregiver record for this user
    const { data: caregiver, error: caregiverError } = await supabaseAdmin
      .from("caregivers")
      .select("id, stripe_account_id, stripe_onboarding_complete")
      .eq("profile_id", user.id)
      .single();

    if (caregiverError || !caregiver) {
      return new Response(
        JSON.stringify({ error: "Caregiver record not found. Only caregivers can onboard with Stripe." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    let stripeAccountId = caregiver.stripe_account_id;

    // Create a Stripe Express account if one doesn't exist
    if (!stripeAccountId) {
      // Get the user's profile for account creation
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("id", user.id)
        .single();

      const account = await stripe.accounts.create({
        type: "express",
        email: profile?.email || user.email,
        metadata: {
          careconnect_user_id: user.id,
          careconnect_caregiver_id: caregiver.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        individual: {
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          email: profile?.email || user.email,
        },
      });

      stripeAccountId = account.id;

      // Save the Stripe account ID to the caregiver record
      const { error: updateError } = await supabaseAdmin
        .from("caregivers")
        .update({ stripe_account_id: stripeAccountId })
        .eq("id", caregiver.id);

      if (updateError) {
        console.error("Failed to update caregiver stripe_account_id:", updateError);
        throw new Error("Failed to save Stripe account");
      }
    }

    // Parse the request body for return/refresh URLs
    let returnUrl = "careconnect://stripe-onboard-complete";
    let refreshUrl = "careconnect://stripe-onboard-refresh";

    try {
      const body = await req.json();
      if (body.returnUrl) returnUrl = body.returnUrl;
      if (body.refreshUrl) refreshUrl = body.refreshUrl;
    } catch {
      // Body is optional; use defaults
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        stripeAccountId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("stripe-connect-onboard error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

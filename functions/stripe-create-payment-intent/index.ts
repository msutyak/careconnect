import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLATFORM_FEE_PERCENT = 15;

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

    // Create Supabase clients
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
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

    // Parse request body
    const { bookingId } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the booking with caregiver and recipient details
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        total_amount_cents,
        platform_fee_cents,
        caregiver_amount_cents,
        status,
        caregiver_id,
        recipient_id,
        caregivers!inner (
          id,
          stripe_account_id,
          stripe_onboarding_complete,
          profile_id
        ),
        care_recipients!inner (
          id,
          profile_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the caregiver has a Stripe account
    const caregiver = booking.caregivers as any;
    if (!caregiver?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: "Caregiver has not completed Stripe onboarding" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate amounts
    const totalAmountCents = booking.total_amount_cents;
    const platformFeeCents = Math.round(totalAmountCents * (PLATFORM_FEE_PERCENT / 100));
    const caregiverAmountCents = totalAmountCents - platformFeeCents;

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the recipient's profile for Stripe customer creation
    const recipient = booking.care_recipients as any;
    const { data: recipientProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name")
      .eq("id", recipient.profile_id)
      .single();

    if (!recipientProfile) {
      return new Response(
        JSON.stringify({ error: "Recipient profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create a Stripe customer for the recipient
    let customerId: string;

    const existingCustomers = await stripe.customers.list({
      email: recipientProfile.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: recipientProfile.email,
        name: `${recipientProfile.first_name} ${recipientProfile.last_name}`,
        metadata: {
          careconnect_user_id: recipientProfile.id,
        },
      });
      customerId = newCustomer.id;
    }

    // Create an ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2023-10-16" }
    );

    // Create the PaymentIntent with destination charges
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: "usd",
      customer: customerId,
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: caregiver.stripe_account_id,
      },
      metadata: {
        careconnect_booking_id: bookingId,
        careconnect_recipient_id: recipient.profile_id,
        careconnect_caregiver_id: caregiver.profile_id,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create or update payment record in database
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .single();

    if (existingPayment) {
      await supabaseAdmin
        .from("payments")
        .update({
          stripe_payment_intent_id: paymentIntent.id,
          amount_cents: totalAmountCents,
          platform_fee_cents: platformFeeCents,
          caregiver_amount_cents: caregiverAmountCents,
          status: "processing",
        })
        .eq("id", existingPayment.id);
    } else {
      await supabaseAdmin.from("payments").insert({
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: totalAmountCents,
        platform_fee_cents: platformFeeCents,
        caregiver_amount_cents: caregiverAmountCents,
        status: "processing",
      });
    }

    // Update booking with calculated fee amounts
    await supabaseAdmin
      .from("bookings")
      .update({
        platform_fee_cents: platformFeeCents,
        caregiver_amount_cents: caregiverAmountCents,
      })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        ephemeralKey: ephemeralKey.secret,
        customerId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("stripe-create-payment-intent error:", error);
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

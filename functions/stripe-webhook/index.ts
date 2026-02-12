import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
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
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the raw request body and signature for verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(supabaseAdmin, paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(supabaseAdmin, paymentIntent);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(supabaseAdmin, account);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("stripe-webhook error:", error);
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

/**
 * Handle a successful payment intent.
 * Updates the payment record, confirms the booking, and notifies the caregiver.
 */
async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId = paymentIntent.metadata?.careconnect_booking_id;

  if (!bookingId) {
    console.error("No booking ID found in payment intent metadata");
    return;
  }

  // Update the payment record status to succeeded
  const { error: paymentError } = await supabase
    .from("payments")
    .update({ status: "succeeded" })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (paymentError) {
    console.error("Failed to update payment status:", paymentError);
  }

  // Update the booking status to confirmed
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", bookingId)
    .select(`
      id,
      date,
      start_time,
      end_time,
      total_amount_cents,
      caregiver_id,
      caregivers!inner (
        profile_id
      )
    `)
    .single();

  if (bookingError) {
    console.error("Failed to update booking status:", bookingError);
    return;
  }

  // Create a notification for the caregiver
  const caregiver = (booking as any).caregivers;
  if (caregiver?.profile_id) {
    const amountDollars = (booking.total_amount_cents / 100).toFixed(2);
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        recipient_id: caregiver.profile_id,
        type: "payment_received",
        title: "Payment Received",
        body: `You received a payment of $${amountDollars} for your booking on ${booking.date}.`,
        data: {
          booking_id: bookingId,
          payment_intent_id: paymentIntent.id,
          amount_cents: booking.total_amount_cents,
        },
      });

    if (notifError) {
      console.error("Failed to create caregiver notification:", notifError);
    }
  }
}

/**
 * Handle a failed payment intent.
 * Updates the payment record and notifies the recipient.
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId = paymentIntent.metadata?.careconnect_booking_id;

  if (!bookingId) {
    console.error("No booking ID found in payment intent metadata");
    return;
  }

  // Update the payment record status to failed
  const { error: paymentError } = await supabase
    .from("payments")
    .update({ status: "failed" })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (paymentError) {
    console.error("Failed to update payment status:", paymentError);
  }

  // Look up the booking to find the recipient
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      id,
      date,
      recipient_id,
      care_recipients!inner (
        profile_id
      )
    `)
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    console.error("Failed to look up booking:", bookingError);
    return;
  }

  // Create a notification for the recipient
  const recipient = (booking as any).care_recipients;
  if (recipient?.profile_id) {
    const failureMessage =
      paymentIntent.last_payment_error?.message || "Your payment could not be processed.";

    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        recipient_id: recipient.profile_id,
        type: "payment_sent",
        title: "Payment Failed",
        body: `Payment for your booking on ${booking.date} failed: ${failureMessage}`,
        data: {
          booking_id: bookingId,
          payment_intent_id: paymentIntent.id,
          error: failureMessage,
        },
      });

    if (notifError) {
      console.error("Failed to create recipient notification:", notifError);
    }
  }
}

/**
 * Handle Stripe Connect account updates.
 * Updates the caregiver's onboarding status when their account becomes fully set up.
 */
async function handleAccountUpdated(
  supabase: ReturnType<typeof createClient>,
  account: Stripe.Account
) {
  if (account.charges_enabled && account.payouts_enabled) {
    const { error } = await supabase
      .from("caregivers")
      .update({ stripe_onboarding_complete: true })
      .eq("stripe_account_id", account.id);

    if (error) {
      console.error("Failed to update caregiver onboarding status:", error);
    }
  }
}

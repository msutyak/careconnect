import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
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

    // Verify the caller is authenticated
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
    const { recipientId, title, body, data } = await req.json();

    if (!recipientId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "recipientId, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the recipient's push token from the profiles table
    const { data: recipientProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, push_token, first_name, last_name")
      .eq("id", recipientId)
      .single();

    if (profileError || !recipientProfile) {
      return new Response(
        JSON.stringify({ error: "Recipient profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the notification type from data, default to 'reminder'
    const notificationType = data?.type || "reminder";

    // Create an entry in the notifications table
    const { error: notifError } = await supabaseAdmin
      .from("notifications")
      .insert({
        recipient_id: recipientId,
        type: notificationType,
        title,
        body,
        data: data || null,
      });

    if (notifError) {
      console.error("Failed to create notification record:", notifError);
      // Continue sending push even if DB insert fails
    }

    // Send push notification via Expo Push API if the user has a push token
    let pushResult = null;

    if (recipientProfile.push_token) {
      const pushToken = recipientProfile.push_token;

      // Validate it looks like an Expo push token
      if (!pushToken.startsWith("ExponentPushToken[") && !pushToken.startsWith("ExpoPushToken[")) {
        console.warn(`Invalid push token format for user ${recipientId}: ${pushToken}`);
      } else {
        const pushPayload = {
          to: pushToken,
          title,
          body,
          data: data || {},
          sound: "default",
          priority: "high",
        };

        const pushResponse = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(pushPayload),
        });

        pushResult = await pushResponse.json();

        if (!pushResponse.ok) {
          console.error("Expo Push API error:", pushResult);
        }
      }
    } else {
      console.log(`No push token for user ${recipientId}, notification saved to database only`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationSaved: !notifError,
        pushSent: !!recipientProfile.push_token,
        pushResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-push-notification error:", error);
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

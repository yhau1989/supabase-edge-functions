import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { WhatsAppWebhookBody } from "./types.ts";

// Environment variables validation
const SUPABASE_URL = Deno.env.get("ENV_SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("ENV_SUPABASE_ANON_KEY");
const VERIFY_TOKEN = Deno.env.get("ENV_VERIFY_TOKEN");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !VERIFY_TOKEN) {
  throw new Error("Missing required environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async (req) => {
  const url = new URL(req.url);

  switch (req.method) {
    case "GET": // Webhook verification (Meta sends GET to validate)
      return handleVerification(url);

    case "POST": // Webhook events reception
      return await handleWebhookEvent(req);

    default:
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
  }
});

/**
 * Handles WhatsApp webhook verification
 */
function handleVerification(url: URL): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    return new Response(challenge, { status: 200 });
  }

  console.warn("⚠️ Verification attempt with invalid token");
  return new Response("Invalid token", { status: 403 });
}

/**
 * Handles WhatsApp webhook events
 */
async function handleWebhookEvent(req: Request): Promise<Response> {
  try {
    const body: WhatsAppWebhookBody = await req.json();

    console.log("📩 Webhook received:", JSON.stringify(body, null, 2));

    // Validate basic webhook structure
    if (!body.entry || body.entry.length === 0) {
      console.warn("⚠️ Webhook without entries, ignoring");
      return new Response("EVENT_RECEIVED", { status: 200 });
    }

    // Process webhook (non-blocking for fast response)
    saveMessageStatuses(body).catch((error) => {
      console.error("❌ Error processing webhook in background:", error);
    });

    // Meta requires immediate HTTP 200 response
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("❌ Error parsing webhook:", error);
    // Still respond 200 to avoid unnecessary retries
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}

/**
 * Saves message statuses to Supabase
 */
async function saveMessageStatuses(data: WhatsAppWebhookBody): Promise<void> {
  const { id, status } = data.entry[0].changes[0].value.statuses![0];

  try {
    const { error } = await supabase
      .from("messages_status")
      .insert({ message_id: id, status: status.toUpperCase() });

    if (error) {
      console.error("❌ Error saving to Supabase:", error.message);
      throw error;
    }

    console.log(
      `✅ saveMessageStatuses inserts ok for message_id: ${id} with status: ${status.toUpperCase()}`
    );
  } catch (error) {
    console.error("❌ Error in saveMessageStatuses:", error);
  }
}

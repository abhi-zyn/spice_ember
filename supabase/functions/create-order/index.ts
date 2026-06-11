// Spice & Ember — create-order Edge Function
// Creates a Razorpay order server-side so the amount/order_id cannot be
// tampered with on the client. Deploy with: supabase functions deploy create-order --no-verify-jwt
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { amount, currency = "INR", receipt, notes } = await req.json();
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) throw new Error("Razorpay keys are not configured on the server.");

    const paise = Math.round(Number(amount) * 100);
    if (!paise || paise < 100) throw new Error("Invalid amount.");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: paise,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: notes || {},
      }),
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order?.error?.description || "Razorpay order creation failed.");

    return new Response(
      JSON.stringify({ id: order.id, amount: order.amount, currency: order.currency, key_id: keyId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

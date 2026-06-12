// Spice & Ember — create-qr Edge Function
// Generates a single-use, fixed-amount UPI QR code via the Razorpay QR Codes API,
// then records a pending row in `qr_payments` (service role). The razorpay-webhook
// function flips that row to 'paid' when the customer pays.
// Deploy with: supabase functions deploy create-qr --no-verify-jwt
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { amount, description } = await req.json();
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) throw new Error("Razorpay keys are not configured on the server.");

    const rupees = Number(amount);
    const paise = Math.round(rupees * 100);
    if (!paise || paise < 100) throw new Error("Enter a valid amount (minimum 1).");

    // Auto-close the QR 30 minutes from now (Razorpay needs a future unix timestamp).
    const closeBy = Math.floor(Date.now() / 1000) + 30 * 60;

    const res = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        type: "upi_qr",
        name: "Spice & Ember",
        usage: "single_use",
        fixed_amount: true,
        payment_amount: paise,
        description: description || "Spice & Ember payment",
        close_by: closeBy,
      }),
    });
    const qr = await res.json();
    if (!res.ok) throw new Error(qr?.error?.description || "Razorpay QR creation failed.");

    // Record a pending row so the admin page can poll for the result.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await supabase.from("qr_payments").upsert({
      id: qr.id,
      amount: rupees,
      description: description || null,
      status: "pending",
      image_url: qr.image_url,
    });

    return new Response(
      JSON.stringify({ id: qr.id, image_url: qr.image_url, amount: rupees, status: qr.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

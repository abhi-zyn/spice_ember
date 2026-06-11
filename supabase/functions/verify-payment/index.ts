// Spice & Ember — verify-payment Edge Function
// Verifies the Razorpay payment signature with the Key SECRET, then logs the
// payment to the `payments` table using the service-role key (bypasses RLS).
// Deploy with: supabase functions deploy verify-payment --no-verify-jwt
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order } = await req.json();
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) throw new Error("Razorpay secret is not configured on the server.");
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing payment verification fields.");
    }

    const expected = createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const verified = expected === razorpay_signature;

    if (!verified) {
      return new Response(JSON.stringify({ verified: false, error: "Signature verification failed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rawUid = order?.user_id;
    const userId = (typeof rawUid === "string" && /^[0-9a-fA-F-]{36}$/.test(rawUid)) ? rawUid : null;

    const row = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: order?.total ?? order?.amount ?? null,
      currency: "INR",
      status: "paid",
      user_id: userId,
      customer_name: order?.customer_name ?? null,
      customer_email: order?.customer_email ?? null,
      customer_phone: order?.customer_phone ?? null,
      order_payload: order ?? null,
    };

    const { data, error } = await supabase.from("payments").insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ verified: true, payment: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ verified: false, error: String((e as Error).message || e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

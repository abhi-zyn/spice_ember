// Spice & Ember — razorpay-webhook Edge Function
// Receives Razorpay webhook events and verifies the signature with the webhook
// secret. On `qr_code.credited` it marks the matching qr_payments row as paid
// and logs the payment to the `payments` table (service role).
// Deploy with: supabase functions deploy razorpay-webhook --no-verify-jwt
// Then in the Razorpay Dashboard add this function URL as a Webhook,
// subscribe to the `qr_code.credited` event, and paste the same secret you set
// as RAZORPAY_WEBHOOK_SECRET in the Supabase function secrets.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!secret) throw new Error("Webhook secret is not configured on the server.");

    const raw = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    if (expected !== signature) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), { status: 400 });
    }

    const body = JSON.parse(raw);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (body.event === "qr_code.credited") {
      const qr = body?.payload?.qr_code?.entity;
      const payment = body?.payload?.payment?.entity;
      const qrId = qr?.id;
      const amountRupees = payment?.amount ? Number(payment.amount) / 100 : null;

      if (qrId) {
        await supabase.from("qr_payments").update({
          status: "paid",
          payment_id: payment?.id ?? null,
          paid_at: new Date().toISOString(),
        }).eq("id", qrId);
      }

      // Also log into the main payments table for the super-admin view.
      // Ignored silently if the legacy schema rejects the row.
      await supabase.from("payments").insert({
        razorpay_payment_id: payment?.id ?? null,
        amount: amountRupees,
        currency: "INR",
        status: "paid",
        customer_name: "QR payment",
        order_payload: { source: "qr_code", qr_id: qrId, payment },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message || e) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

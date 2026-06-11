// ============================================================
// SPICE & EMBER — PASSKEY (WebAuthn) EDGE FUNCTION
// True passwordless auth: register a passkey (while signed in)
// and sign in with it. WebAuthn responses are verified here,
// server-side, and a real Supabase session is then minted.
//
// Deploy:
//   supabase functions deploy passkey --no-verify-jwt
//
// Required secrets (supabase secrets set ...):
//   RP_ID      e.g. abhi-zyn.github.io   (domain only, no scheme/path)
//   RP_NAME    e.g. "Spice & Ember"
//   RP_ORIGIN  e.g. https://abhi-zyn.github.io
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
//  are injected automatically — do not set them.)
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@13";
import { isoBase64URL } from "npm:@simplewebauthn/server@13/helpers";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RP_ID = Deno.env.get("RP_ID") ?? "localhost";
const RP_NAME = Deno.env.get("RP_NAME") ?? "Spice & Ember";
const RP_ORIGIN = Deno.env.get("RP_ORIGIN") ?? "http://localhost:5500";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

async function userFromAuthHeader(req: Request) {
  const authz = req.headers.get("Authorization") ?? "";
  const token = authz.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === ANON_KEY) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const action = body?.action;

  try {
    // ---------------- REGISTER: options ----------------
    if (action === "register-options") {
      const user = await userFromAuthHeader(req);
      if (!user) return json({ error: "Sign in first to add a passkey." }, 401);

      const { data: existing } = await admin
        .from("passkey_credentials")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email ?? user.id,
        userDisplayName: user.email ?? "Spice & Ember guest",
        attestationType: "none",
        excludeCredentials: (existing ?? []).map((c: any) => ({
          id: c.credential_id,
          transports: c.transports ?? undefined,
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      await admin.from("passkey_challenges").insert({
        user_id: user.id,
        email: user.email,
        challenge: options.challenge,
        type: "registration",
      });
      return json(options);
    }

    // ---------------- REGISTER: verify ----------------
    if (action === "register-verify") {
      const user = await userFromAuthHeader(req);
      if (!user) return json({ error: "Sign in first to add a passkey." }, 401);

      const { data: ch } = await admin
        .from("passkey_challenges")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "registration")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ch) return json({ error: "Challenge expired — please try again." }, 400);

      const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: ch.challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return json({ error: "Could not verify passkey." }, 400);
      }

      const cred = verification.registrationInfo.credential;
      await admin.from("passkey_credentials").insert({
        user_id: user.id,
        email: user.email,
        credential_id: cred.id,
        public_key: isoBase64URL.fromBuffer(cred.publicKey),
        counter: cred.counter ?? 0,
        transports: cred.transports ?? null,
      });
      await admin.from("passkey_challenges").delete().eq("id", ch.id);
      return json({ verified: true });
    }

    // ---------------- LOGIN: options ----------------
    if (action === "login-options") {
      const email = (body.email ?? "").trim().toLowerCase();
      let allowCredentials: Array<{ id: string; transports?: string[] }> = [];
      if (email) {
        const { data: creds } = await admin
          .from("passkey_credentials")
          .select("credential_id, transports")
          .eq("email", email);
        allowCredentials = (creds ?? []).map((c: any) => ({
          id: c.credential_id,
          transports: c.transports ?? undefined,
        }));
      }
      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: "preferred",
        allowCredentials, // empty => discoverable (resident) credentials
      });
      await admin.from("passkey_challenges").insert({
        email: email || null,
        challenge: options.challenge,
        type: "authentication",
      });
      return json(options);
    }

    // ---------------- LOGIN: verify ----------------
    if (action === "login-verify") {
      const resp = body.response;
      if (!resp?.id) return json({ error: "Malformed passkey response." }, 400);

      const { data: cred } = await admin
        .from("passkey_credentials")
        .select("*")
        .eq("credential_id", resp.id)
        .maybeSingle();
      if (!cred) return json({ error: "Unrecognised passkey." }, 400);

      const { data: ch } = await admin
        .from("passkey_challenges")
        .select("*")
        .eq("type", "authentication")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ch) return json({ error: "Challenge expired — please try again." }, 400);

      const verification = await verifyAuthenticationResponse({
        response: resp,
        expectedChallenge: ch.challenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: false,
        credential: {
          id: cred.credential_id,
          publicKey: isoBase64URL.toBuffer(cred.public_key),
          counter: Number(cred.counter) || 0,
          transports: cred.transports ?? undefined,
        },
      });
      if (!verification.verified) {
        return json({ error: "Passkey authentication failed." }, 400);
      }

      await admin
        .from("passkey_credentials")
        .update({ counter: verification.authenticationInfo.newCounter })
        .eq("id", cred.id);
      await admin.from("passkey_challenges").delete().eq("id", ch.id);

      // Mint a Supabase session for the credential's owner.
      const { data: udata, error: uErr } = await admin.auth.admin.getUserById(
        cred.user_id,
      );
      if (uErr || !udata?.user?.email) {
        return json({ error: "Account has no email; cannot create a session." }, 400);
      }
      const email = udata.user.email;

      const { data: link, error: lErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (lErr || !link?.properties?.hashed_token) {
        return json({ error: "Could not create a session." }, 500);
      }

      const anon = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: verified, error: vErr } = await anon.auth.verifyOtp({
        type: "magiclink",
        token_hash: link.properties.hashed_token,
      });
      if (vErr || !verified?.session) {
        return json({ error: "Could not finalise the session." }, 500);
      }

      return json({
        verified: true,
        session: {
          access_token: verified.session.access_token,
          refresh_token: verified.session.refresh_token,
        },
      });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});

/**
 * M4 trust & safety — security-boundary integration tests.
 *
 * MANUAL integration test (not wired into CI — it needs live infrastructure):
 *   • the repo `.env` (Supabase URL + anon + service-role keys),
 *   • the demo seed data (users ahmed/khalid/sara, the Ahmed↔Khalid conversation),
 *   • the NestJS API running on :4000 (`pnpm --filter @swap/api-server dev`),
 *   • migration 0018 applied to the target database.
 *
 * It is fully REVERSIBLE — every write is cleaned up and demo state is restored.
 *
 *   Run:  node apps/api/test/m4-trust-safety.mjs
 *
 * Proves, across BOTH enforcement layers:
 *   A (RLS)  terms gate blocks message send until accepted, then allows.
 *   B (RLS)  a non-participant cannot report a message in a thread they're not in.
 *   C (RLS)  a duplicate PENDING report on the same target is rejected (0018 index).
 *   D (API)  TermsGuard blocks a UGC write with 403 terms_not_accepted, POST /me/terms
 *            records acceptance (server-stamped), and the write then succeeds.
 *   E (API)  ReportsService rejects a non-participant message report (403).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const env = {};
for (const raw of readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
}

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const API = env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const admin = createClient(URL, SR, { auth: { persistSession: false } });
const CONV = "66666666-6666-4666-8666-000000000001"; // Ahmed↔Khalid
const KHALID = "aaaaaaaa-aaaa-4aaa-8aaa-000000000003";

let pass = 0;
let fail = 0;
const ok = (name, cond) => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "  PASS" : "  FAIL"} — ${name}`);
};

const signIn = async (email) => {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const r = await c.auth.signInWithPassword({ email, password: "Swap1234!" });
  if (r.error) throw new Error(`signin ${email}: ${r.error.message}`);
  return { client: c, token: r.data.session.access_token };
};
const call = async (method, path, token, body) => {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch { /* empty body */ }
  return { status: r.status, body: json };
};

async function main() {
  const { data: msgs } = await admin.from("messages").select("id").eq("conversation_id", CONV).limit(1);
  const MSG = msgs?.[0]?.id;
  const { data: sara } = await admin.from("profiles").select("id,email").eq("username", "sara").maybeSingle();
  const { data: lst } = await admin.from("listings").select("id").eq("status", "active").neq("owner_id", KHALID).limit(1);
  const LISTING = lst?.[0]?.id;
  if (!MSG || !sara || !LISTING) throw new Error("missing demo fixtures (message/sara/listing)");

  // clean baseline
  await admin.from("profiles").update({ terms_accepted_version: null, terms_accepted_at: null }).eq("id", KHALID);
  await admin.from("reports").delete().eq("reporter_id", sara.id).eq("target_id", LISTING).eq("target_type", "listing");

  console.log("\n== A: Terms gate on message send (RLS) ==");
  const k = await signIn("khalid@swap.demo");
  let r = await k.client.from("messages").insert({ conversation_id: CONV, sender_id: KHALID, body: "m4-test-a1" }).select("id");
  ok("un-accepted user CANNOT send a message", !!r.error);
  await admin.from("profiles").update({ terms_accepted_version: 1, terms_accepted_at: new Date().toISOString() }).eq("id", KHALID);
  r = await k.client.from("messages").insert({ conversation_id: CONV, sender_id: KHALID, body: "m4-test-a2" }).select("id");
  ok("after accepting, the same user CAN send", !r.error && !!r.data?.[0]?.id);
  if (r.data?.[0]?.id) await admin.from("messages").delete().eq("id", r.data[0].id);

  console.log("\n== B/C: Report participation + duplicate (RLS) ==");
  const s = await signIn(sara.email);
  r = await s.client.from("reports").insert({ reporter_id: sara.id, target_type: "message", target_id: MSG, reason: "spam", status: "pending" }).select("id");
  ok("non-participant CANNOT report another thread's message", !!r.error);
  r = await s.client.from("reports").insert({ reporter_id: sara.id, target_type: "listing", target_id: LISTING, reason: "spam", status: "pending" }).select("id");
  ok("a normal listing report still succeeds", !r.error && !!r.data?.[0]?.id);
  const saraReport = r.data?.[0]?.id;
  r = await s.client.from("reports").insert({ reporter_id: sara.id, target_type: "listing", target_id: LISTING, reason: "scam", status: "pending" }).select("id");
  ok("a second PENDING report on the same target is rejected (23505)", r.error?.code === "23505");
  if (saraReport) await admin.from("reports").delete().eq("id", saraReport);

  console.log("\n== D/E: API guards (TermsGuard + accept + report participation) ==");
  await admin.from("profiles").update({ terms_accepted_version: null, terms_accepted_at: null }).eq("id", KHALID);
  const { data: kl } = await admin.from("listings").select("id,title").eq("owner_id", KHALID).eq("status", "active").limit(1);
  const LID = kl?.[0]?.id;
  const ORIG = kl?.[0]?.title;
  const kt = (await signIn("khalid@swap.demo")).token;
  if (LID) {
    r = await call("PATCH", `/listings/${LID}`, kt, { title: `${ORIG} ` });
    ok("PATCH /listings (un-accepted) -> 403 terms_not_accepted", r.status === 403 && r.body?.code === "terms_not_accepted");
    r = await call("POST", "/me/terms", kt);
    ok("POST /me/terms -> accepted, version=1", (r.status === 200 || r.status === 201) && r.body?.terms_accepted_version === 1);
    r = await call("PATCH", `/listings/${LID}`, kt, { title: ORIG });
    ok("PATCH /listings (accepted) -> 200", r.status === 200);
  }
  const st = (await signIn(sara.email)).token;
  r = await call("POST", "/reports", st, { target_type: "message", target_id: MSG, reason: "spam" });
  ok("POST /reports message (non-participant) -> 403", r.status === 403);

  // restore demo state
  await admin.from("profiles").update({ terms_accepted_version: null, terms_accepted_at: null }).eq("id", KHALID);
  if (LID && ORIG) await admin.from("listings").update({ title: ORIG }).eq("id", LID);

  console.log(`\n== RESULT: ${pass} passed, ${fail} failed ==`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

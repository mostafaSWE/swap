/**
 * M5 push-notification foundation — integration tests.
 *
 * MANUAL integration test (needs the same live infra as m4-trust-safety.mjs: repo
 * .env, demo seed users, the NestJS API on :4000, migration 0020 applied). Fully
 * REVERSIBLE — every write is cleaned up in a `finally`, including a TEMPORARY
 * admin promotion used only to exercise the admin "process outbox" endpoint (the
 * real Admin account's password isn't a demo credential).
 *
 *   Run:  node apps/api/test/m5-push.mjs
 *
 * Proves: idempotent per-install token registration; owner-only token RLS; the
 * enqueue-on-notification trigger; and the outbox worker lifecycle (pending →
 * sent, and an invalid token disabling its device).
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
const admin = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const API = env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const KHALID = "aaaaaaaa-aaaa-4aaa-8aaa-000000000003";
const AHMED = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";

let pass = 0;
let fail = 0;
const ok = (name, cond) => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "  PASS" : "  FAIL"} — ${name}`);
};
const token = async (email) => {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const r = await c.auth.signInWithPassword({ email, password: "Swap1234!" });
  if (r.error) throw new Error(`signin ${email}: ${r.error.message}`);
  return { client: c, token: r.data.session.access_token };
};
const call = async (method, path, tok, body) => {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: json };
};

async function main() {
  let promoted = false;
  const notifIds = [];
  try {
    await admin.from("device_tokens").delete().eq("user_id", KHALID).like("installation_id", "pushtest-%");
    const kt = (await token("khalid@swap.demo")).token;

    console.log("\n== Device registration (idempotent, owner-scoped) ==");
    ok("POST /me/devices -> 204", (await call("POST", "/me/devices", kt, { installation_id: "pushtest-ok", token: "ExponentPushToken[OK]", platform: "android" })).status === 204);
    await call("POST", "/me/devices", kt, { installation_id: "pushtest-ok", token: "ExponentPushToken[OK-rotated]", platform: "android" });
    const { data: devs } = await admin.from("device_tokens").select("*").eq("user_id", KHALID).eq("installation_id", "pushtest-ok");
    ok("one row per install, token rotated in place", devs.length === 1 && devs[0].token.includes("rotated"));

    console.log("\n== Owner-only token RLS ==");
    const sara = await token("sara@swap.demo");
    const { data: leak } = await sara.client.from("device_tokens").select("*").eq("user_id", KHALID);
    ok("another user reads 0 of khalid's tokens", (leak ?? []).length === 0);

    console.log("\n== Enqueue trigger (notification -> outbox pending, no send) ==");
    const { data: n1 } = await admin.from("notifications").insert({ user_id: KHALID, type: "new_message", actor_id: AHMED }).select("id").single();
    notifIds.push(n1.id);
    await new Promise((r) => setTimeout(r, 400));
    const { data: ob1 } = await admin.from("push_outbox").select("*").eq("notification_id", n1.id).maybeSingle();
    ok("outbox row auto-created as pending", ob1?.status === "pending");

    // Temporary admin promotion (reverted in finally) to drive the outbox worker.
    await admin.from("profiles").update({ is_admin: true }).eq("id", KHALID);
    promoted = true;

    console.log("\n== Worker: pending -> sent (mock delivers) ==");
    const proc = await call("POST", "/admin/push/process", kt);
    ok("POST /admin/push/process -> 2xx with a numeric result", proc.status >= 200 && proc.status < 300 && typeof proc.body?.processed === "number");
    const { data: ob2 } = await admin.from("push_outbox").select("*").eq("notification_id", n1.id).maybeSingle();
    ok("outbox row now sent (attempts=1)", ob2?.status === "sent" && ob2.attempts === 1);

    console.log("\n== Worker: invalid token disables its device ==");
    await admin.from("device_tokens").update({ enabled: false }).eq("user_id", KHALID).eq("installation_id", "pushtest-ok");
    await call("POST", "/me/devices", kt, { installation_id: "pushtest-bad", token: "ExponentPushToken[MOCK-INVALID]", platform: "android" });
    const { data: n2 } = await admin.from("notifications").insert({ user_id: KHALID, type: "new_follower", actor_id: AHMED }).select("id").single();
    notifIds.push(n2.id);
    await new Promise((r) => setTimeout(r, 400));
    await call("POST", "/admin/push/process", kt);
    const { data: bad } = await admin.from("device_tokens").select("enabled").eq("user_id", KHALID).eq("installation_id", "pushtest-bad").single();
    ok("invalid-token device auto-disabled", bad?.enabled === false);
  } finally {
    if (promoted) await admin.from("profiles").update({ is_admin: false }).eq("id", KHALID);
    if (notifIds.length) await admin.from("notifications").delete().in("id", notifIds);
    await admin.from("device_tokens").delete().eq("user_id", KHALID).like("installation_id", "pushtest-%");
  }
  console.log(`\n== PUSH RESULT: ${pass} passed, ${fail} failed ==`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

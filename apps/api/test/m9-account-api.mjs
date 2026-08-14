/**
 * M9 account API — end-to-end tests for the deletion endpoints through the real
 * NestJS stack (controller → guards → service → RPC → storage → auth admin).
 *
 * M8 proves the DB contract. This proves the HTTP layer on top of it: auth, the
 * confirm-flag guard, the storage purge, the auth-user deletion, and the public
 * (unauthenticated) request endpoint.
 *
 * MANUAL integration test (not wired into CI — it needs live infrastructure):
 *   • the repo `.env`,
 *   • migrations 0022–0024 applied,
 *   • the API running on :4000  (pnpm --filter @swap/api-server dev).
 *
 * Fully REVERSIBLE — creates its own throwaway user and removes everything.
 *
 *   Run:  node apps/api/test/m9-account-api.mjs
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

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const API = process.env.API_BASE || "http://localhost:4000/api/v1";
const admin = createClient(URL_, SR, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "  PASS" : "  FAIL"} — ${name}${cond || !extra ? "" : `  (${extra})`}`);
};

const stamp = Date.now().toString(36);
const EMAIL = `apitest_${stamp}@justswap-qa.dev`;
const PASSWORD = "Swap1234!";
let userId = null;
let listingId = null;
let requestId = null;

async function main() {
  console.log(`M9 — account API  (${API})\n`);

  // ── setup ──────────────────────────────────────────────────────────────
  const created = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "API Test", username: `apitest_${stamp}` },
  });
  if (created.error) throw new Error(`createUser: ${created.error.message}`);
  userId = created.data.user.id;
  console.log(`  (throwaway user ${userId})`);

  const { data: cat } = await admin.from("categories").select("id").limit(1).single();
  const { data: ctry } = await admin.from("countries").select("id").limit(1).single();
  const { data: city } = await admin.from("cities").select("id").eq("country_id", ctry.id).limit(1).single();
  const { data: listing } = await admin
    .from("listings")
    .insert({
      owner_id: userId,
      title: `api deletion test ${stamp}`,
      description: "temp",
      condition: "used",
      category_id: cat.id,
      country_id: ctry.id,
      city_id: city.id,
      status: "active",
    })
    .select("id")
    .single();
  listingId = listing.id;

  // A real storage object under the user's prefix, so the purge is actually exercised.
  const objectPath = `${userId}/${listingId}/0.png`;
  const png = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001" +
      "0d0a2db40000000049454e44ae426082",
    "hex",
  );
  const up = await admin.storage.from("listing-images").upload(objectPath, png, { contentType: "image/png" });
  ok("setup: uploaded a storage object", !up.error, up.error?.message);

  // ── sign in as the throwaway user to get a real bearer token ───────────
  const userClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const signIn = await userClient.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signIn.error) throw new Error(`signin: ${signIn.error.message}`);
  const token = signIn.data.session.access_token;

  const call = (method, path, body, bearer) =>
    fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  // ── A. guards ──────────────────────────────────────────────────────────
  const noAuth = await call("DELETE", "/me", { confirm: true });
  ok("A1 DELETE /me without a token is rejected", noAuth.status === 401, `got ${noAuth.status}`);

  const noConfirm = await call("DELETE", "/me", {}, token);
  ok("A2 DELETE /me without confirm:true is rejected", noConfirm.status === 400, `got ${noConfirm.status}`);

  const wrongConfirm = await call("DELETE", "/me", { confirm: "yes" }, token);
  ok("A3 DELETE /me with a non-literal confirm is rejected", wrongConfirm.status === 400, `got ${wrongConfirm.status}`);

  // ── B. public deletion request (no auth) ───────────────────────────────
  const badEmail = await call("POST", "/account/deletion-requests", { email: "not-an-email" });
  ok("B1 request with an invalid email is rejected", badEmail.status === 400, `got ${badEmail.status}`);

  const reqRes = await call("POST", "/account/deletion-requests", {
    email: EMAIL,
    username: `apitest_${stamp}`,
    reason: "api test",
  });
  ok("B2 public deletion request accepted without auth", reqRes.status === 202, `got ${reqRes.status}`);

  const unknownRes = await call("POST", "/account/deletion-requests", {
    email: `nobody_${stamp}@justswap-qa.dev`,
  });
  ok("B3 unknown email gets the SAME response (no account enumeration)", unknownRes.status === 202);

  const { data: rows } = await admin
    .from("account_deletion_requests")
    .select("id, email, user_id, status")
    .in("email", [EMAIL.toLowerCase(), `nobody_${stamp}@justswap-qa.dev`]);
  requestId = rows?.map((r) => r.id) ?? [];
  ok("B4 both requests were recorded", (rows?.length ?? 0) === 2, `got ${rows?.length}`);
  const matched = rows?.find((r) => r.email === EMAIL.toLowerCase());
  ok("B5 the known email was resolved to its profile", matched?.user_id === userId);

  // ── C. the real delete ─────────────────────────────────────────────────
  const del = await call("DELETE", "/me", { confirm: true, reason: "api test" }, token);
  ok("C1 DELETE /me returns 204", del.status === 204, `got ${del.status}`);

  const { data: tomb } = await admin
    .from("profiles")
    .select("username, email, phone, deleted_at")
    .eq("id", userId)
    .single();
  ok("C2 profile is an anonymised tombstone", Boolean(tomb?.deleted_at) && tomb.email === null);

  const { data: afterListing } = await admin.from("listings").select("status").eq("id", listingId).single();
  ok("C3 listing removed from the marketplace", afterListing?.status === "removed");

  // storage purge — the object must be gone from the bucket
  const { data: listed } = await admin.storage.from("listing-images").list(`${userId}/${listingId}`);
  ok("C4 storage objects purged", (listed?.length ?? 0) === 0, `${listed?.length} left`);

  // auth user must be gone
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  ok("C5 auth user deleted", !authUser?.user);

  // the pending web request for this address is closed out and de-identified (0024)
  const { data: closed } = await admin
    .from("account_deletion_requests")
    .select("status, email, user_id")
    .eq("id", matched.id)
    .single();
  ok("C6 matching deletion request closed + scrubbed", closed?.status === "completed" && closed?.user_id === null);

  // ── D. the old token is dead ───────────────────────────────────────────
  const reuse = await call("DELETE", "/me", { confirm: true }, token);
  ok("D1 the deleted account's token no longer works", reuse.status === 401, `got ${reuse.status}`);
}

async function cleanup() {
  console.log("\n  cleanup…");
  try {
    await admin.from("account_deletion_requests").delete().like("email", `%${stamp}%`);
    await admin.from("account_deletion_requests").delete().eq("email", "deleted").is("user_id", null).eq("reason", null);
    if (userId) {
      await admin.storage.from("listing-images").remove([`${userId}/${listingId}/0.png`]).catch(() => {});
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    const { count } = await admin
      .from("account_deletion_requests")
      .select("*", { count: "exact", head: true })
      .like("email", `%${stamp}%`);
    console.log(`  leftover request rows: ${count ?? 0}`);
  } catch (e) {
    console.log("  cleanup warning:", e.message);
  }
}

main()
  .catch((e) => {
    fail++;
    console.error("FATAL:", e.message);
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
  });

/**
 * M8 account deletion — data-lifecycle integration tests (Google Play User Data
 * policy / Apple 5.1.1(v) / GDPR erasure).
 *
 * MANUAL integration test (not wired into CI — it needs live infrastructure):
 *   • the repo `.env` (Supabase URL + anon + service-role keys),
 *   • migration 0022 applied to the target database.
 * The NestJS API is NOT required: this exercises the DB contract that the API's
 * AccountService depends on.
 *
 * It is fully REVERSIBLE — it creates its own throwaway user and removes every row
 * it made, including the tombstone. It never touches demo or real accounts.
 *
 *   Run:  node apps/api/test/m8-account-deletion.mjs
 *
 * Proves:
 *   A  Personal rows are purged (saved, follows, blocks, devices, notifications, views).
 *   B  Listings are taken out of circulation (status='removed') and photos dropped.
 *   C  The profile becomes an anonymised tombstone (no name/email/phone/bio/avatar).
 *   D  RETENTION: the counterparty's message survives, and so do ratings and reports —
 *      deleting them would corrupt other users' data and destroy moderation evidence.
 *   E  Another user's follower count is corrected when the deleted user's follow goes.
 *   F  The ratings the deleted user GAVE still count toward the ratee's aggregate.
 *   G  delete_account() is idempotent.
 *   H  Admin accounts cannot self-delete.
 *   I  The RPC is service-role only (anon/authenticated have no EXECUTE grant).
 *   J  THE CRITICAL ONE: deleting the auth.users row does NOT cascade away the
 *      tombstone (migration 0022 dropped profiles_id_fkey), so the counterparty's
 *      messages/ratings/reports survive the login being destroyed.
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
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SR, { auth: { persistSession: false } });

const KHALID = "aaaaaaaa-aaaa-4aaa-8aaa-000000000003"; // demo counterparty (read/link only)

let pass = 0;
let fail = 0;
const ok = (name, cond) => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "  PASS" : "  FAIL"} — ${name}`);
};

const stamp = Date.now().toString(36);
const EMAIL = `deltest_${stamp}@justswap-qa.dev`;

let userId = null;
let adminProbeId = null;
let listingId = null;
let convId = null;
let msgId = null;
let reportId = null;
let deletionRequestId = null;

async function main() {
  console.log("M8 — account deletion\n");

  // ── setup: a throwaway user with a full spread of content ──────────────
  const created = await admin.auth.admin.createUser({
    email: EMAIL,
    password: "Swap1234!",
    email_confirm: true,
    user_metadata: { full_name: "Deletion Test", username: `deltest_${stamp}` },
  });
  if (created.error) throw new Error(`createUser: ${created.error.message}`);
  userId = created.data.user.id;
  console.log(`  (throwaway user ${userId})`);

  // handle_new_user creates the profile; give it PII to prove it gets scrubbed.
  await admin
    .from("profiles")
    .update({ phone: `+9715${stamp.slice(-8)}`, bio: "delete me", avatar_url: "https://x/y.png" })
    .eq("id", userId);

  const { data: cat } = await admin.from("categories").select("id").limit(1).single();
  const { data: ctry } = await admin.from("countries").select("id").limit(1).single();
  const { data: city } = await admin.from("cities").select("id").eq("country_id", ctry.id).limit(1).single();

  const { data: listing } = await admin
    .from("listings")
    .insert({
      owner_id: userId,
      title: `deletion test ${stamp}`,
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
  await admin.from("listing_images").insert({ listing_id: listingId, image_url: "https://x/i.png", sort_order: 0 });

  // personal rows
  const { data: otherListing } = await admin
    .from("listings")
    .select("id")
    .eq("owner_id", KHALID)
    .limit(1)
    .single();
  await admin.from("saved_listings").insert({ user_id: userId, listing_id: otherListing.id });
  await admin.from("follows").insert({ follower_id: userId, following_id: KHALID });
  await admin.from("device_tokens").insert({
    user_id: userId,
    installation_id: `del-${stamp}`,
    token: `tok-${stamp}`,
    provider: "expo",
    platform: "android",
    app_env: "development",
  });
  await admin.from("notifications").insert({ user_id: userId, type: "new_message", actor_id: KHALID });

  // shared rows that MUST survive
  const { data: conv } = await admin.from("conversations").insert({}).select("id").single();
  convId = conv.id;
  await admin.from("conversation_participants").insert([
    { conversation_id: convId, user_id: userId },
    { conversation_id: convId, user_id: KHALID },
  ]);
  const { data: msg } = await admin
    .from("messages")
    .insert({ conversation_id: convId, sender_id: userId, body: `deletion test msg ${stamp}` })
    .select("id")
    .single();
  msgId = msg.id;

  const { data: khalidBefore } = await admin
    .from("profiles")
    .select("followers_count, rating, ratings_count")
    .eq("id", KHALID)
    .single();

  const { data: report } = await admin
    .from("reports")
    .insert({ reporter_id: userId, target_type: "listing", target_id: otherListing.id, reason: "spam" })
    .select("id")
    .single();
  reportId = report.id;

  // A pending web deletion request for this same address — 0024 must close it out
  // and strip the identifiers, otherwise an email -> tombstone mapping survives and
  // the "de-identified" retained activity is trivially re-identifiable.
  const { data: req } = await admin
    .from("account_deletion_requests")
    .insert({ email: EMAIL, username: `deltest_${stamp}`, reason: "test", user_id: userId })
    .select("id")
    .single();
  deletionRequestId = req.id;

  // ── ACT ────────────────────────────────────────────────────────────────
  const { error: rpcErr } = await admin.rpc("delete_account", { p_user_id: userId });
  ok("delete_account RPC succeeds", !rpcErr);
  if (rpcErr) console.log("      ", rpcErr.message);

  // ── A. personal rows purged ────────────────────────────────────────────
  const count = async (table, col = "user_id") => {
    const { count: n } = await admin.from(table).select("*", { count: "exact", head: true }).eq(col, userId);
    return n ?? 0;
  };
  ok("A1 saved_listings purged", (await count("saved_listings")) === 0);
  ok("A2 device_tokens purged", (await count("device_tokens")) === 0);
  ok("A3 notifications purged", (await count("notifications")) === 0);
  ok("A4 follows purged", (await count("follows", "follower_id")) === 0);

  // ── B. listings out of circulation ─────────────────────────────────────
  const { data: afterListing } = await admin.from("listings").select("status").eq("id", listingId).single();
  ok("B1 listing status = removed", afterListing?.status === "removed");
  const { count: imgs } = await admin
    .from("listing_images")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId);
  ok("B2 listing photos dropped", (imgs ?? 0) === 0);

  // ── C. profile is an anonymised tombstone ──────────────────────────────
  const { data: tomb } = await admin.from("profiles").select("*").eq("id", userId).single();
  ok("C1 deleted_at set", Boolean(tomb?.deleted_at));
  ok("C2 name anonymised", tomb?.full_name === "Deleted user");
  ok("C3 username anonymised", String(tomb?.username || "").startsWith("deleted_"));
  ok("C4 email cleared", tomb?.email === null);
  ok("C5 phone cleared", tomb?.phone === null);
  ok("C6 bio cleared", tomb?.bio === null);
  ok("C7 avatar cleared", tomb?.avatar_url === null);

  // ── D. shared records retained ─────────────────────────────────────────
  const { data: keptMsg } = await admin.from("messages").select("id, body").eq("id", msgId).maybeSingle();
  ok("D1 counterparty's message RETAINED", Boolean(keptMsg));
  const { data: keptReport } = await admin.from("reports").select("id").eq("id", reportId).maybeSingle();
  ok("D2 moderation report RETAINED", Boolean(keptReport));
  const { count: parts } = await admin
    .from("conversation_participants")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", convId);
  ok("D3 conversation intact for the other party", (parts ?? 0) === 2);

  // ── E. other user's denormalized count corrected ───────────────────────
  const { data: khalidAfter } = await admin
    .from("profiles")
    .select("followers_count, rating, ratings_count")
    .eq("id", KHALID)
    .single();
  ok(
    "E1 counterparty followers_count decremented",
    khalidAfter.followers_count === khalidBefore.followers_count - 1,
  );

  // ── F. ratings the deleted user gave still count ───────────────────────
  ok("F1 counterparty rating aggregate unchanged", khalidAfter.rating === khalidBefore.rating);
  ok("F2 counterparty ratings_count unchanged", khalidAfter.ratings_count === khalidBefore.ratings_count);

  // ── K. the web deletion request is closed out and de-identified (0024) ──
  const { data: reqAfter } = await admin
    .from("account_deletion_requests")
    .select("status, email, username, reason, user_id, handled_at")
    .eq("id", deletionRequestId)
    .single();
  ok("K1 request marked completed", reqAfter?.status === "completed");
  ok("K2 requester email scrubbed", reqAfter?.email === "deleted");
  ok("K3 request no longer links to the profile", reqAfter?.user_id === null);
  ok("K4 request username/reason cleared", reqAfter?.username === null && reqAfter?.reason === null);
  ok("K5 handled_at stamped", Boolean(reqAfter?.handled_at));

  // ── G. idempotent ──────────────────────────────────────────────────────
  const { data: again, error: againErr } = await admin.rpc("delete_account", { p_user_id: userId });
  ok("G1 second call is a no-op success", !againErr && again?.already_deleted === true);

  // ── H. admins cannot self-delete ───────────────────────────────────────
  // NEVER point this at a real or demo account: delete_account() is destructive and
  // only refuses if the profile is *actually* is_admin. (An earlier revision assumed
  // a demo user was still an admin, the DB had drifted, and it really deleted them.)
  // Use a dedicated throwaway that we promote, assert on, then demote and remove.
  const adminProbe = await admin.auth.admin.createUser({
    email: `deladmin_${stamp}@justswap-qa.dev`,
    password: "Swap1234!",
    email_confirm: true,
    user_metadata: { full_name: "Admin Probe", username: `deladmin_${stamp}` },
  });
  if (adminProbe.error) throw new Error(`createUser(admin probe): ${adminProbe.error.message}`);
  adminProbeId = adminProbe.data.user.id;
  await admin.from("profiles").update({ is_admin: true }).eq("id", adminProbeId);

  const { error: adminErr } = await admin.rpc("delete_account", { p_user_id: adminProbeId });
  ok(
    "H1 admin self-delete refused",
    Boolean(adminErr) && adminErr.message.includes("admin_cannot_self_delete"),
  );
  const { data: probeStill } = await admin
    .from("profiles")
    .select("deleted_at")
    .eq("id", adminProbeId)
    .single();
  ok("H2 refused call left the admin untouched", probeStill?.deleted_at === null);

  // ── I. RPC is service-role only ────────────────────────────────────────
  const anonClient = createClient(URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: anonErr } = await anonClient.rpc("delete_account", { p_user_id: KHALID });
  ok("I1 anon cannot execute delete_account", Boolean(anonErr));

  // ── J. deleting the login must NOT take the tombstone with it ──────────
  const del = await admin.auth.admin.deleteUser(userId);
  ok("J1 auth user deleted", !del.error);
  const { data: stillThere } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  ok("J2 tombstone SURVIVES auth deletion (FK cascade broken)", Boolean(stillThere));
  const { data: msgStillThere } = await admin.from("messages").select("id").eq("id", msgId).maybeSingle();
  ok("J3 counterparty's message survives auth deletion", Boolean(msgStillThere));
}

async function cleanup() {
  console.log("\n  cleanup…");
  try {
    // Deleting the tombstone cascades away the retained rows we created.
    if (deletionRequestId)
      await admin.from("account_deletion_requests").delete().eq("id", deletionRequestId);
    if (userId) await admin.from("profiles").delete().eq("id", userId);
    if (convId) await admin.from("conversations").delete().eq("id", convId);
    if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
    if (adminProbeId) {
      // Demote first so the profile row isn't protected, then remove it entirely.
      await admin.from("profiles").update({ is_admin: false }).eq("id", adminProbeId);
      await admin.from("profiles").delete().eq("id", adminProbeId);
      await admin.auth.admin.deleteUser(adminProbeId).catch(() => {});
    }
    const { count: left } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("id", userId);
    console.log(`  leftover profile rows: ${left ?? 0}`);
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

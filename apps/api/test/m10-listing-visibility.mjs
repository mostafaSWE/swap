/**
 * M10 listing visibility — admin/owner status gating on the SHARED query layer.
 *
 * Regression test for a bug found on a physical device: two listings hidden from the
 * admin account were gone from the website but still reachable in the mobile app.
 * Root cause was NOT the database — the RLS read policy is
 *   (status='active' AND NOT blocked) OR owner_id = auth.uid() OR is_admin(auth.uid())
 * so an ADMIN legitimately reads every row — but `getListingById` and
 * `getSavedListings` did no status filtering, so admin (and owner) sessions still
 * opened taken-down listings.
 *
 * This imports the REAL shared functions (not a copy of the logic) via Node's
 * TypeScript type-stripping, so it fails if anyone removes the gate.
 *
 * MANUAL integration test — needs the repo `.env` and the live database.
 * Fully REVERSIBLE: creates its own throwaway owner + admin + listing.
 *
 *   Run:  node --experimental-strip-types apps/api/test/m10-listing-visibility.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
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

// Import the REAL shared implementations (Node strips the types) so this test fails
// if the status gate is ever removed. pathToFileURL is required on Windows.
const { getListingById } = await import(
  pathToFileURL(resolve(ROOT, "packages/api/src/queries/listings.ts")).href
);
const { getSavedListings } = await import(
  pathToFileURL(resolve(ROOT, "packages/api/src/queries/social.ts")).href
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SR, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "  PASS" : "  FAIL"} — ${name}${cond || !extra ? "" : `  (${extra})`}`);
};

const stamp = Date.now().toString(36);
const OWNER_EMAIL = `visowner_${stamp}@justswap-qa.dev`;
const ADMIN_EMAIL = `visadmin_${stamp}@justswap-qa.dev`;
const OTHER_EMAIL = `visother_${stamp}@justswap-qa.dev`;
let ownerId = null;
let adminId = null;
let otherId = null;
let listingId = null;

const signIn = async (email) => {
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const r = await c.auth.signInWithPassword({ email, password: "Swap1234!" });
  if (r.error) throw new Error(`signin ${email}: ${r.error.message}`);
  return c;
};

async function main() {
  console.log("M10 — listing visibility (admin/owner status gating)\n");

  const mk = async (email, username) => {
    const r = await admin.auth.admin.createUser({
      email,
      password: "Swap1234!",
      email_confirm: true,
      user_metadata: { full_name: username, username },
    });
    if (r.error) throw new Error(`createUser ${email}: ${r.error.message}`);
    return r.data.user.id;
  };
  ownerId = await mk(OWNER_EMAIL, `visowner_${stamp}`);
  adminId = await mk(ADMIN_EMAIL, `visadmin_${stamp}`);
  otherId = await mk(OTHER_EMAIL, `visother_${stamp}`);
  await admin.from("profiles").update({ is_admin: true }).eq("id", adminId);

  const { data: cat } = await admin.from("categories").select("id").limit(1).single();
  const { data: ctry } = await admin.from("countries").select("id").limit(1).single();
  const { data: city } = await admin.from("cities").select("id").eq("country_id", ctry.id).limit(1).single();
  const { data: listing } = await admin
    .from("listings")
    .insert({
      owner_id: ownerId,
      title: `visibility test ${stamp}`,
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

  const ownerClient = await signIn(OWNER_EMAIL);
  const adminClient = await signIn(ADMIN_EMAIL);
  const otherClient = await signIn(OTHER_EMAIL);
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });

  // ── while ACTIVE, everyone can see it ─────────────────────────────────
  ok("A1 active: anonymous sees it", Boolean(await getListingById(anonClient, listingId, null)));
  ok("A2 active: owner sees it", Boolean(await getListingById(ownerClient, listingId, ownerId)));
  ok("A3 active: admin sees it", Boolean(await getListingById(adminClient, listingId, adminId)));

  // ── admin HIDES it (what the admin panel does) ────────────────────────
  await admin.from("listings").update({ status: "hidden" }).eq("id", listingId);

  ok("B1 hidden: anonymous gets not-found", (await getListingById(anonClient, listingId, null)) === null);
  ok(
    "B2 hidden: ADMIN gets not-found (was the bug — RLS lets them read the row)",
    (await getListingById(adminClient, listingId, adminId)) === null,
  );
  ok(
    "B3 hidden: OWNER still sees their own paused listing",
    Boolean(await getListingById(ownerClient, listingId, ownerId)),
  );
  // A signed-in ordinary user (not owner, not admin) — RLS alone already hides it.
  ok(
    "B4 hidden: an ordinary signed-in user gets not-found",
    (await getListingById(otherClient, listingId, otherId)) === null,
  );

  // ── admin REMOVES it (delete) ─────────────────────────────────────────
  await admin.from("listings").update({ status: "removed" }).eq("id", listingId);
  ok("C1 removed: anonymous gets not-found", (await getListingById(anonClient, listingId, null)) === null);
  ok("C2 removed: admin gets not-found", (await getListingById(adminClient, listingId, adminId)) === null);
  ok(
    "C3 removed: owner also gets it (their own row) — deletion is a soft status",
    Boolean(await getListingById(ownerClient, listingId, ownerId)),
  );

  // ── saved listings must drop non-active rows ──────────────────────────
  // Saved as an ORDINARY user: a `reject_admin_actor` BEFORE INSERT trigger on
  // saved_listings forbids admins from being marketplace actors, so using the admin
  // here would silently save nothing and make both assertions meaningless.
  const savedIns = await admin.from("saved_listings").insert({ user_id: otherId, listing_id: listingId });
  ok("D0 saved row created for an ordinary user", !savedIns.error, savedIns.error?.message);

  const savedWhileRemoved = await getSavedListings(otherClient, otherId);
  ok(
    "D1 saved: a removed listing no longer appears in Saved",
    !savedWhileRemoved.some((l) => l.id === listingId),
    `${savedWhileRemoved.length} row(s) returned`,
  );

  await admin.from("listings").update({ status: "active" }).eq("id", listingId);
  const savedWhenActive = await getSavedListings(otherClient, otherId);
  ok(
    "D2 saved: it comes back when the listing is re-activated (bookmark kept)",
    savedWhenActive.some((l) => l.id === listingId),
  );

  await ownerClient.auth.signOut();
  await adminClient.auth.signOut();
  await otherClient.auth.signOut();
}

async function cleanup() {
  console.log("\n  cleanup…");
  try {
    if (listingId) {
      await admin.from("saved_listings").delete().eq("listing_id", listingId);
      await admin.from("listing_images").delete().eq("listing_id", listingId);
      await admin.from("listings").delete().eq("id", listingId);
    }
    for (const id of [ownerId, adminId, otherId]) {
      if (!id) continue;
      await admin.from("profiles").update({ is_admin: false }).eq("id", id);
      await admin.from("profiles").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    const { count } = await admin
      .from("listings")
      .select("*", { count: "exact", head: true })
      .like("title", `%${stamp}%`);
    console.log(`  leftover test listings: ${count ?? 0}`);
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

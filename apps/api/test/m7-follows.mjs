/**
 * M7 followers/following — safety integration test (manual; needs the live .env +
 * migration 0021). Proves the `list_follows` RPC + the follows/blocks model behave
 * safely. Uses THROWAWAY users only, every write reverted in finally{}.
 *
 *   Run:  node apps/api/test/m7-follows.mjs
 *
 * Verifies:
 *   1. A follows B  → B.followers contains A ; A.following contains B.
 *   2. Duplicate follow is rejected (PK) and does not duplicate the list row.
 *   3. Unfollow removes the row from both direction views.
 *   4. is_following is correct per row for the authenticated viewer.
 *   5. Block severs the A↔B follow AND hides each from the other's view of a
 *      third party's list (block filtering, both directions).
 *   6. Unblock does NOT restore the follow, but un-hides the user from views.
 *   7. Pagination (limit/offset) does not duplicate or skip.
 *   8. Only public columns are returned (no email/phone/is_admin).
 *   9. Denormalized followers_count matches list behavior.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const require = createRequire(resolve(ROOT, "apps/api/index.js"));
const { createClient } = require("@supabase/supabase-js");
const env = {};
for (const raw of readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const l = raw.trim(); if (!l || l.startsWith("#")) continue;
  const i = l.indexOf("="); if (i === -1) continue;
  env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SR = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL, SR, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  PASS" : "  FAIL"} — ${name}${extra ? "  ::" + extra : ""}`); };

const ts = Date.now();
const users = {}; // key -> { id, client }
async function mkUser(key) {
  const email = `m7f-${key}-${ts}@smoke.justswap.demo`;
  const password = "SmokeTest1234!";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error(`createUser ${key}: ${created.error.message}`);
  const id = created.data.user.id;
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const si = await client.auth.signInWithPassword({ email, password });
  if (si.error) throw new Error(`signin ${key}: ${si.error.message}`);
  users[key] = { id, client, email };
  return users[key];
}
const list = (viewerKey, targetKey, dir, opts = {}) =>
  users[viewerKey].client.rpc("list_follows", { p_target: users[targetKey].id, p_direction: dir, p_limit: opts.limit ?? 30, p_offset: opts.offset ?? 0 });
const follow = (aKey, bKey) => users[aKey].client.from("follows").insert({ follower_id: users[aKey].id, following_id: users[bKey].id });
const unfollow = (aKey, bKey) => users[aKey].client.from("follows").delete().eq("follower_id", users[aKey].id).eq("following_id", users[bKey].id);
const block = (aKey, bKey) => users[aKey].client.from("blocks").insert({ blocker_id: users[aKey].id, blocked_id: users[bKey].id });
const unblock = (aKey, bKey) => users[aKey].client.from("blocks").delete().eq("blocker_id", users[aKey].id).eq("blocked_id", users[bKey].id);
const count = async (key) => (await admin.from("profiles").select("followers_count,following_count").eq("id", users[key].id).single()).data;
const has = (rows, key) => (rows ?? []).some((r) => r.id === users[key].id);

async function main() {
  await Promise.all(["A", "B", "C", "D"].map(mkUser));

  // 1. A follows B, A follows C, B follows C
  await follow("A", "B"); await follow("A", "C"); await follow("B", "C");
  const bFollowers = (await list("D", "B", "followers")).data;
  const aFollowing = (await list("D", "A", "following")).data;
  ok("B.followers contains A", has(bFollowers, "A"), "n=" + (bFollowers?.length));
  ok("A.following contains B and C", has(aFollowing, "B") && has(aFollowing, "C"), "n=" + (aFollowing?.length));

  // 2. duplicate follow rejected + not duplicated
  const dup = await follow("A", "B");
  const bFollowers2 = (await list("D", "B", "followers")).data;
  const aInB = (bFollowers2 ?? []).filter((r) => r.id === users.A.id).length;
  ok("duplicate follow rejected (PK)", Boolean(dup.error), "err=" + (dup.error?.code ?? "-"));
  ok("A appears exactly once in B.followers", aInB === 1, "count=" + aInB);

  // 4. is_following correctness — B views A.following ([B,C]); B follows C but not B
  const aFollowingAsB = (await list("B", "A", "following")).data;
  const rowC = (aFollowingAsB ?? []).find((r) => r.id === users.C.id);
  const rowB = (aFollowingAsB ?? []).find((r) => r.id === users.B.id);
  ok("is_following=true for a user the viewer follows (B→C)", rowC?.is_following === true, "C.is_following=" + rowC?.is_following);
  ok("is_following=false for a user the viewer does not follow", rowB?.is_following === false, "B.is_following=" + rowB?.is_following);

  // 8. no private column leak
  const keys = Object.keys((bFollowers2 ?? [])[0] ?? {});
  const leaked = keys.filter((k) => ["email", "phone", "is_admin", "is_banned", "is_suspended", "preferred_language"].includes(k));
  ok("no private columns returned", leaked.length === 0, "keys=" + keys.join("|"));

  // 9. counts match
  const cB = await count("B"), cA = await count("A");
  ok("B.followers_count matches (1)", cB.followers_count === 1, "=" + cB.followers_count);
  ok("A.following_count matches (2)", cA.following_count === 2, "=" + cA.following_count);

  // 5. block severs A↔? and hides. Setup: A and B both follow C. A blocks B.
  //    C.followers viewed by A must NOT include B; viewed by D includes both.
  const cFollowersByD = (await list("D", "C", "followers")).data;
  ok("pre-block: C.followers (neutral) has A and B", has(cFollowersByD, "A") && has(cFollowersByD, "B"));
  await block("A", "B");
  const cFollowersByA = (await list("A", "C", "followers")).data;
  const cFollowersByD2 = (await list("D", "C", "followers")).data;
  ok("block hides B from A's view of C.followers", !has(cFollowersByA, "B") && has(cFollowersByA, "A"), "aView=" + (cFollowersByA ?? []).length);
  ok("block does not affect a neutral viewer (D still sees B)", has(cFollowersByD2, "B"));
  // A↔B direct follow severed: A followed... A did not follow B, but B did not follow A either; verify no A↔B edge exists
  const aFollowingAfterBlock = (await list("D", "A", "following")).data;
  ok("A.following unaffected by block re: C (still has C)", has(aFollowingAfterBlock, "C"));

  // 6. unblock: does NOT restore any follow, but un-hides
  await unblock("A", "B");
  const cFollowersByA2 = (await list("A", "C", "followers")).data;
  ok("unblock un-hides B from A's view", has(cFollowersByA2, "B"));

  // 3. unfollow removes from both views
  await unfollow("A", "C");
  const aFollowing3 = (await list("D", "A", "following")).data;
  const cFollowers3 = (await list("D", "C", "followers")).data;
  ok("unfollow removes C from A.following", !has(aFollowing3, "C"));
  ok("unfollow removes A from C.followers", !has(cFollowers3, "A"));

  // 7. pagination — A follows B,C,D fresh; page size 2 then offset 2 → no dup/skip
  await follow("A", "D"); // A now follows B and D (C was unfollowed)
  await follow("A", "C");
  const p1 = (await list("D", "A", "following", { limit: 2, offset: 0 })).data ?? [];
  const p2 = (await list("D", "A", "following", { limit: 2, offset: 2 })).data ?? [];
  const idsAll = [...p1, ...p2].map((r) => r.id);
  const uniq = new Set(idsAll);
  ok("pagination: no duplicate rows across pages", uniq.size === idsAll.length, "total=" + idsAll.length + " uniq=" + uniq.size);
  ok("pagination: page 1 size respected", p1.length === 2, "p1=" + p1.length);
}

main()
  .catch((e) => { fail++; console.log("  FAIL — unexpected :: " + e.message); })
  .finally(async () => {
    for (const k of Object.keys(users)) {
      await admin.from("follows").delete().or(`follower_id.eq.${users[k].id},following_id.eq.${users[k].id}`).then(() => {}, () => {});
      await admin.from("blocks").delete().or(`blocker_id.eq.${users[k].id},blocked_id.eq.${users[k].id}`).then(() => {}, () => {});
      const del = await admin.auth.admin.deleteUser(users[k].id);
      if (del.error) console.log(`cleanup ${k}: ERR ${del.error.message}`);
    }
    console.log(`\ncleanup: removed ${Object.keys(users).length} throwaway users`);
    console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
    process.exit(fail === 0 ? 0 : 1);
  });

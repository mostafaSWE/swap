# Swap — Mobile Release Plan & Session Tracker

> **Agent: read this file before touching `apps/mobile`. Update it before ending any session.**
> This plan **extends Phase 7 of `BUILD_PLAN.md`** ("Mobile Applications"). It does **not** re-document the web app, the backend, the DB schema, or Phases 1–6 — see `BUILD_PLAN.md`. This file tracks the mobile-specific work of getting `apps/mobile` from skeleton to **live on the Apple App Store and Google Play**.
> Format mirrors `BUILD_PLAN.md`: `[x]` done · `[~]` partial · `[ ]` not started · `[!]` blocked-on-human. Each phase has an **exit criterion**. Store-requirement facts are current as of **2026-07** and carry source links; **re-verify the ⚠ ones before submission — they change often.**

> **Sequencing (locked 2026-07-22):** build the **complete apps locally first**; developer accounts, store registration, listings, and compliance forms come **after** the app is done, not in parallel. So the build phases **M0–M6** come first, then a single hard stop, then everything that needs you (accounts/legal/submission) is consolidated in **Phase S** at the end. Native, not a PWA/Capacitor wrapper (a wrapper fails Apple Guideline 4.2).

---

## ▶ RESUME HERE

**Current phase:** **Phase M1 — Navigation, i18n/RTL & RN Component Kit (IN PROGRESS).** Nav shell + **RTL-first i18n foundation** (full catalog, `ar` fallback, `forceRTL`) + core components landed & **verified on the emulator in both LTR and RTL**. Next: build the **remaining component kit RTL-first**, then per-screen content (M2/M3). **M0 DONE — verified on-device (2026-07-22).**

**Dev runtime (locked 2026-07-22):** a **local development build on the Android emulator** (`expo run:android` + `expo-dev-client`) — **not Expo Go, not EAS cloud**. Android SDK/NDK/CMake/emulator + a local NestJS API are set up on this machine.

**What's DONE:** `apps/mobile` runs on **Expo SDK 57** (RN 0.86 / React 19.2.3, New Arch on); reaches the **live backend** via shared `@swap/api` (Supabase auth + **AsyncStorage persistence**, wired `SwapApiClient`, RLS reads, Realtime); the cold-start-logout root cause (`createSupabaseClient` ignoring a storage adapter) is **fixed**; bundle id **`me.justswap.app`**, name **"JustSwap"**. **Build infra:** Android env persisted (User scope); NDK 27.1.12297006 / CMake 3.22.1 / platform-36 / build-tools 36 installed; `expo-dev-client` + `expo prebuild` (android/ + ios/ gitignored — CNG). The Windows New-Arch path wall is handled by **machine-local setup only** — `LongPathsEnabled=1` + **ninja 1.12.1** (long-path-aware) + a native-build parallelism cap (low free RAM). **No repo resolution change:** `nodeLinker` stays pnpm's default **isolated** (phantom-dep-safe; see Known gaps). **Typecheck 8/8 green**; `expo-doctor` 19/20.

**✅ M0 verified — the build works and the app reaches the live backend.** The local Android dev build succeeds and the M0 smoke passed **5/5** on `emulator-5554`: Supabase auth (`signin=ok`), **session persistence across a cold restart** (`boot-session=ahmed@swap.demo`), RLS read via `@swap/api` (`count=6`), Realtime (`SUBSCRIBED`), authenticated REST `/me` (`user=@ahmed`). The Windows path-length wall took **two** fixes: `LongPathsEnabled=1` (you, elevated) **+** upgrading the CMake-bundled **ninja 1.10.2 → 1.12.1** (long-path-aware — LongPaths alone wasn't enough because the old ninja isn't manifested for it).

**Last worked on:** **Phase M1 — component kit COMPLETE (Session 12, 2026-07-23)** — built + verified LTR+RTL the full RN kit (~22 components: primitives + composites `SwapPair`/`ItemArtwork`/`FeaturedCard`/`WantedCard`/`CategoryCard`+`Carousel`/`SellerCard`/`ProfileHeader`/`ChatBubble`/`ConversationCard`/`NotificationBell`/`FollowButton`/`MessageButton`/`ReportDialog`/`AvatarUpload`) via the `/ui-kit` route; fixed the `Icon` `mirror` (wrap a `View`, not the svg style). `ProposalContextCard` deferred to M3. (Session 11: RTL direction invariant — native early-set + JS boot guard, verified `ar`/`en`/Urdu with no reload; `reloadAsync` throws in bare prod → native early-set. Session 10: RTL research/decision.) (Session 9: icons + Select/BottomSheet + forms. Session 8: inventory + expo-localization + primitives. Session 7: RTL-first i18n. Session 6: nodeLinker→isolated. Sessions 4–5: M0 + nav shell.)

**Next task (in order):**
1. **M1 exit criterion MET** — navigable shell + i18n/RTL invariant + the **full component kit** (~22 components) are all done & verified on-device (`/ui-kit`). **Next: M2 (Browse / read surface)** — the browse list + listing-detail screens, composing the kit (`FeaturedCard`/`ItemArtwork`/`SwapPair`/`WantedCard`/`SellerCard`) over the `@swap/api` RLS query path (D-1). Keep the RTL+LTR verification discipline on every screen.
2. Then **M3** (auth + swap loop): chat (`ChatBubble`/`ConversationCard`), the proposal flow — incl. building **`ProposalContextCard`** against real data (deferred from the kit) — profile (`ProfileHeader`/`AvatarUpload` + real `expo-image-picker`), and the in-app language switcher restart (D-7 M3 note: no sanctioned iOS programmatic restart → EAS Update / native bridge-reload / manual "reopen" prompt). Then M4 (safety / Apple 1.2) → M5 (native) → M6 (EAS). iOS blocked until M5 (paid Apple account).

> **Dev loop:** the Android emulator + a fresh Metro (`expo start --dev-client`, port 8081) + the local NestJS API (:4000) are running. `pnpm mobile` starts Metro; the installed dev build reconnects. The connectivity harness is at route `/m0-check` (set `EXPO_PUBLIC_M0_AUTOTEST=1` to auto-run it). Rebuild native only when adding a native module (`expo run:android`).

> **Reality check:** M0 is done and **verified on the emulator** — the mobile app is a real, authenticated client with sessions that persist against the live backend, and local Android dev builds work (`expo run:android`). Still zero end-user feature parity (home is the M0 connectivity harness) — that's M1–M4. No developer account is needed until the **iOS hard stop at M5**.

---

## Session Log

| # | Summary | Ended on |
|---|---|---|
| 1 | **Mobile audit + release plan authored.** Read all of `apps/mobile` (single static screen, no nav/live-data/`eas.json`, SDK 51). 8-agent workflow: web-parity, package mobile-safety, UGC/safety-backend, + 5 store-requirement research agents. Verdict: ~3–5% to submission; shared layer ~90% reusable. Wrote this plan (M0–M7). No code changed. | 2026-07-22 |
| 2 | **Phase M0 — toolchain & live-data baseline DONE.** Upgraded Expo **SDK 51→57** (RN 0.86 / React 19.2.3, New Arch on) via `expo install --fix`; added AsyncStorage + `react-native-url-polyfill` + `react-native-get-random-values`. **Fixed `createSupabaseClient`** to accept a storage adapter (additive, non-breaking — web unaffected). Rewrote mobile `supabase.ts` (AsyncStorage, `detectSessionInUrl:false`, non-null, AppState refresh) + new `api.ts` (`SwapApiClient` + `getToken`); polyfills at app entry; `app.json` → name "JustSwap", `me.justswap.app`, scheme `justswap`, removed `newArchEnabled`, migrated splash to the `expo-splash-screen` plugin; `.env`/`.env.example`; tsconfig `baseUrl` removed (TS 6.0 deprecation). Replaced the static home with an **M0 connectivity harness**. Resolved D-4; D-5 left open (no company assumed); D-2 deferred to M4. Reordered this plan (build-first; accounts/store → Phase S). **Typecheck 8/8 green, expo-doctor 19/20.** On-device smoke still to run (Android). | 2026-07-22 |
| 3 | **Phase M0 build bring-up (Android local dev build).** Set ANDROID_HOME/PATH (User scope); installed NDK 27.1.12297006 / CMake 3.22.1 / platform-36 / build-tools 36; booted the Pixel_3a API-34 emulator from the terminal; started the local NestJS API (port 4000). Added `expo-dev-client`, ran `expo prebuild` (android/ + ios/ gitignored), limited the emulator build to x86_64. **Diagnosed + fixed** a pnpm path-length build failure via **`nodeLinker: hoisted`** (deep `.pnpm` paths blew past CMake's object-path limit) — all third-party native modules then compiled. Added an env-gated headless auto-smoke to the harness. **Hit a hard wall:** the New-Arch app-level codegen link produces a **373-char object path** > Windows' 260 limit; the fix (`LongPathsEnabled`) needs an elevated registry write that is **denied** to me. Typecheck 8/8 green under hoisted. **M0 on-device smoke pending the long-paths enablement (human/admin — see Known gaps).** | 2026-07-22 |
| 4 | **Phase M0 CLOSED — verified on the Android emulator.** User enabled `LongPathsEnabled=1` (elevated); the build STILL failed at the New-Arch codegen link (`ninja: Filename longer than 260`) because the CMake-bundled **ninja 1.10.2 isn't long-path-aware** → **upgraded ninja to 1.12.1** (original saved as `ninja.exe.orig`). `expo run:android` then **BUILD SUCCESSFUL**; app installed + launched on `emulator-5554`. **M0 smoke 5/5 green:** auth `signin=ok`; **persistence across cold restart** `boot-session=ahmed@swap.demo`; RLS `count=6`; `realtime=SUBSCRIBED`; REST `/me` `user=@ahmed`. Reverted the temporary auto-smoke env vars. **M0 exit criterion MET.** | 2026-07-22 |
| 5 | **Phase M1 — navigation shell + i18n/RTL + core components (verified on emulator).** expo-router **Tabs** (Home/Browse/Messages/Notifications/Profile — emoji icons, themed, localized); **JS-only i18n** via `Intl` device-locale (ar/en; replaced hardcoded `'ar'`; `allowRTL`); dark theme from `@swap/config`; components **Screen/ListingCard/CategoryGrid/EmptyState**; real **Home** tab (categories + live featured listings via `@swap/api`); M0 harness → `/m0-check` (root anchored on `(tabs)` via `unstable_settings`). Typecheck 8/8; **rendered + screenshotted on emulator-5554** (Home + 5-tab bar, dark theme, en locale). Commit `fc05058`. Stubs: Browse/Messages/Notifications/Profile (M2/M3). | 2026-07-22 |
| 6 | **nodeLinker verification (Correction 1) → reverted to `isolated`.** Confirmed `nodeLinker: hoisted` was unnecessary: the Windows path wall is fixed by **ninja 1.12.1** alone — the isolated mobile build cleared every path error and only hit a clang **OOM** (low free RAM + 12-way parallelism), fixed by capping native parallelism (`org.gradle.parallel=false`, `workers.max=4`) → **BUILD SUCCESSFUL** (app-debug.apk 88 MB). **Reverted `nodeLinker`** to pnpm's strict default `isolated` (phantom-dep-safe; apps/web+api deploy from this repo). Verified under isolated: web `next build` ✓, api `tsc` ✓, api `ts-node` runtime (all modules resolve, `/health`+routes 200) ✓ → no phantom deps. `pnpm-lock.yaml` unchanged. Pushed all commits (backup). | 2026-07-22 |
| 7 | **Correction 2 — RTL-first i18n foundation (verified on device).** Locale fallback fixed to **ar** (Arabic-first) for non-ar/en devices. **Ported the full web `next-intl` catalog** (`src/i18n/{ar,en}.json`, 32 namespaces) into new `src/i18n/index.ts` (nested `t()` + `{param}` interpolation + `ar` fallback + `EXPO_PUBLIC_LOCALE` override) + a `mobile` namespace; rewired tab screens/components to catalog keys; removed the stub `src/i18n.ts`. Implemented **`forceRTL`**. **Verified on emulator:** forced `ar` → relaunch → **full RTL** (header/hero right-aligned, category chips RTL, **tab bar reversed** — screenshot). Typecheck 8/8. Production RTL-flip reload (`expo-updates`) + `expo-localization` = follow-ups. | 2026-07-22 |
| 8 | **Correction 2c — web-component inventory + RN primitive kit (RTL-verified) + expo-localization.** Ran a 5-agent workflow inventorying **all ~130 `apps/web` UI components** (PORT/ADAPT/SKIP + implied primitives) — caught real gaps in the ad-hoc list (no Button/Card/Input/Select/Badge primitives, `SwapPair`, `ItemArtwork`, `SegmentedControl`, `Avatar`). **Swapped `Intl`→`expo-localization` `getLocales()`** (native rebuild via `gradlew`, autolinked — `nodeLinker` stays isolated). **Built the primitive layer** `src/components/ui/`: `Button`, `Card`, `Avatar`, `Badge` (+tone maps), `RatingStars`, `Chip`, `Divider`, `StatCell`; refactored `CategoryGrid`→`Chip` and `ListingCard`→`Card`+`Badge`. Typecheck 8/8; **verified on emulator in LTR (device `en`) and RTL (forced `ar`)** — screenshots. Committed + pushed. Remaining kit (Select/BottomSheet, icon system, composites) tracked in the M1 checklist. | 2026-07-22 |
| 9 | **2c batch 2 — icon system + Select/BottomSheet + form primitives (RTL+LTR verified).** Installed `react-native-svg` + `lucide-react-native` (native rebuild via `gradlew`, autolinked; `nodeLinker` still isolated). Built `Icon`, `IconButton`, **`BottomSheet`** (RN Modal), **`Select`** (BottomSheet-backed — the heaviest form primitive), **`Input`/`Textarea`/`Checkbox`** — all RTL-safe (logical spacing; directional icons take a `mirror` prop). Added a **`/ui-kit`** dev preview route (`justswap://ui-kit`) exercising every primitive. Typecheck 8/8; **verified on emulator in LTR and RTL** — the Select opens its BottomSheet, lucide icons render, the whole kit mirrors (screenshots). Committed + pushed. | 2026-07-23 |
| 10 | **RTL strategy locked + `reloadAsync` verified on-device + first-launch analysis (D-7).** 5-agent research workflow (Fabric `direction`-prop on RN 0.86, New-Arch restart reports, capability loss, JS-RTL libs) + a primitive-conversion audit → **decision: keep the native `forceRTL` flag** (JS-managed `direction` silently breaks native-stack nav / horizontal scroll / TextInput caret with no JS remedy; the 18 primitives were never the cost). Installed `expo-updates`; built a `/rtl-verify` harness; **empirically verified `Updates.reloadAsync()` re-applies the flag on RN 0.86 Android both directions + across a genuine cold start** (screenshots) → **Option A** approved for the M3 switcher (iOS reload unverified till M5). Found the **iOS `CFBundleLocalizations` gap**; worked out the **first-launch mismatch** options (user to pick — D-7). Fixed a recurring clang OOM with a **CMake job pool**. `RatingStars` comment corrected (leading-edge auto-flip is intended). Typecheck 8/8; scaffolding reverted. | 2026-07-23 |
| 11 | **RTL direction invariant IMPLEMENTED + verified (D-7 resolved).** User set the hard invariant — a mismatched direction must never render, not even one frame — and finalized the locale rule (Arabic device ⇒ Arabic, any other language ⇒ English). Built the **Android native early-set** (config plugin `withAndroidRtlEarlySet` → `MainApplication.onCreate` forces `forceRTL(device-lang=="ar")` **before React loads**) + a splash-gated **JS boot guard** (`_layout.tsx`); `i18n` stops mutating `I18nManager`; iOS `CFBundleLocalizations:['ar','en']` base `en`. **Discovered** `Updates.reloadAsync()` throws `ERR_UPDATES_DISABLED` in a bare production release (needs EAS Update) → chose the native early-set (no reload, no account) over a reload. **Verified on-device (RN 0.86 Android):** `ar`→RTL, `en`→LTR, **Urdu→LTR English** (the override), all with **no reload** (`bundle-loads=1`). Fixed a CMake config-eval fail (plugin must `require('expo/config-plugins')`). Typecheck 8/8. Committed + pushed. | 2026-07-23 |
| 12 | **M1 component kit COMPLETE — ~22 components across 4 batches, all verified LTR+RTL on device.** Ported from the web inventory, RTL-first: primitives (`Skeleton`/`SegmentedControl`/`Accordion`/`ListRow`/`StrengthMeter`/`CategoryIcon`) + composites (`SwapPair`, `ItemArtwork`, `FeaturedCard`, `WantedCard`, `CategoryCard`/`Carousel`, `SellerCard`, `ProfileHeader`, `ChatBubble`, `ConversationCard`, `NotificationBell`, `FollowButton`, `MessageButton`, `ReportDialog`, `AvatarUpload`). Each exercised in `/ui-kit` + screenshot-verified both directions (ChatBubble own-bubble flips left in RTL; ConversationCard/ProfileHeader mirror; CategoryCarousel anchors from the right; report BottomSheet opens with its Select). **Fixed** `Icon` `mirror` (svg-style `scaleX` unreliable on Fabric → wrap a `View`; fixes all directional icons). **Deferred `ProposalContextCard`** to M3 (585-line stateful feature, not a kit shell). Typecheck 8/8. Committed in batches 3–6 (`3993e9d` + b76b172/c0dc383/ce16675 — pushing behind a degraded network). | 2026-07-23 |

---

## ⚠ The one hard stop — when you must register a developer account (VERIFIED 2026-07-22)

You asked me to verify exactly where local building/testing breaks. Confirmed:

- **M0 → M4 need NO developer accounts, on either platform.** All code + config builds locally. On this **Windows** machine you'll validate on **Android** (emulator or device via `pnpm mobile` / a dev build). iOS JS-only screens can optionally be smoke-tested on a physical iPhone via **Expo Go** (free), but a Mac is needed for the iOS Simulator — so Android is the practical local target through M4.
- **Android is fully testable locally the ENTIRE way (M0–M6),** with no paid account: dev builds, sideloaded APK/AAB, and **FCM push via a free Firebase project**. The **Google Play account ($25 one-time)** is needed only to *distribute* — Phase S (internal-testing track / production).
- **iOS breaks at M5. This is the register moment.** iOS **push notifications require APNs credentials, which Apple will not issue without a paid Apple Developer membership ($99/yr)**, and building for a **real iPhone / TestFlight** requires distribution signing that also needs the paid account. (Verified against Expo's push-setup docs: on the first EAS iOS build you're prompted to enable push and generate the APNs key, which requires the paid account.) On Windows there is no local iOS build at all, so in practice **the paid Apple account gates every iOS on-device validation** — it is the single unavoidable prerequisite for the iOS half of M5–M6.

**Net:** build M0–M6 locally and validate on Android with zero accounts. **Register the Apple Developer account when you reach M5** (to test iOS push and produce an installable iOS build). **Register Google Play at Phase S** (to publish). Everything else account/legal/store-related is consolidated in **Phase S**.

The `── HARD STOP ──` line below marks the M4→M5 boundary in the checklist.

---

## Phase Checklist

Legend: `[x]` done · `[~]` partial · `[ ]` not started · `[!]` blocked-on-human · tags: `(me)` I can complete with no account · `(me+backend)` also needs a small backend/DB change · `(you)` human-only.

---

### Phase M0 — Toolchain & Live-Data Baseline ✅ DONE `(me)`
> Make the skeleton a real, authenticated app talking to the live backend. (Session 2.)

- [x] **Upgrade Expo SDK 51 → 57** (RN 0.74→0.86, React 18→19.2.3). New Architecture is on (mandatory ≥ SDK 55); removed the `newArchEnabled` flag. `expo-doctor` 19/20.
- [x] **Lock app identity:** `name: "JustSwap"`, `slug/scheme: "justswap"`, `ios.bundleIdentifier` + `android.package` = **`me.justswap.app`** (immutable after first store submit — locked before any store records exist). Universal-Links/App-Links domain will be **justswap.me** (M5).
- [x] Added RN companions: `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, `react-native-get-random-values`; imported `react-native-url-polyfill/auto` + `react-native-get-random-values` at app entry (`app/_layout.tsx`) so REST query strings + crypto work on native.
- [x] **Fixed the storage-adapter gap** in `packages/api/src/client.ts` — `createSupabaseClient(url, anonKey, opts?)` now accepts `{ storage, detectSessionInUrl, autoRefreshToken, persistSession }`. Additive; web (`@supabase/ssr`) unaffected; all 8 workspaces still typecheck.
- [x] Rewrote `apps/mobile/src/lib/supabase.ts`: injects `AsyncStorage`, `detectSessionInUrl:false`; reads `EXPO_PUBLIC_SUPABASE_*`; **throws loudly if unconfigured** (was silently `null`); AppState-driven `startAutoRefresh`/`stopAutoRefresh`.
- [x] Added `apps/mobile/src/lib/api.ts`: a shared `SwapApiClient` whose `getToken()` returns the live Supabase access token.
- [x] `.env` (real live creds — git-ignored) + committed `.env.example`. The anon key is the public publishable key; API base defaults to `http://10.0.2.2:4000/api/v1` (Android-emulator→host).
- [x] Migrated splash to the `expo-splash-screen` plugin; removed the deprecated top-level `splash`; removed tsconfig `baseUrl` (TS 6.0 deprecation). Metro monorepo config cleaned (dropped `disableHierarchicalLookup`).
- [x] CI/turbo: mobile is already covered by `turbo typecheck` (it has a `typecheck` script) and CI runs `pnpm typecheck`. No change needed. *(Mobile has no `dev`/`build` task, so it's correctly skipped by `turbo dev`/`build`.)*
- [x] Temporary **M0 connectivity-harness** home screen exercising auth + persistence + an RLS read + a REST call + Realtime (replaced by real screens from M1).

**Exit criterion:** ✅ **MET (verified on `emulator-5554`, 2026-07-22).** Local Android dev build (`expo run:android`) succeeds; the app boots, **signs in against live Supabase**, **session persists across a cold restart** (AsyncStorage), and an RLS read (6 listings), a Realtime subscription, and an authenticated REST `/me` all succeed. Windows path wall cleared by `LongPathsEnabled` + ninja 1.12.1 (see Known gaps).

---

### Phase M1 — Navigation, i18n/RTL & RN Component Kit `(me)`
- [~] **`expo-router` tabs** (Home · Browse · Messages · Notifications · Profile) — DONE (`app/(tabs)/`, emoji icons, themed, localized labels; root anchored on `(tabs)` via `unstable_settings`). Nested stacks + auth-screens-outside-tabs land with M2/M3.
- [x] **i18n + RTL** — DONE + **verified on device both directions** (Correction 2): device locale via **`expo-localization` `getLocales()`** (reliable cross-Android; replaced Hermes `Intl`) with **Arabic-first `ar` fallback** (non-ar/en → ar); the **full web `next-intl` catalog ported** (`src/i18n/{ar,en}.json`, 32 namespaces) + a `mobile` namespace, loaded by `src/i18n/index.ts` (nested `t()` + `{param}` interpolation + `EXPO_PUBLIC_LOCALE` test override); **`forceRTL`** — an Arabic UI mirrors to RTL even on an LTR device (screenshot-confirmed: header/hero right-aligned, chips RTL, tab bar reversed; `en` device → LTR). **RTL DECIDED + IMPLEMENTED (Sessions 10–11 — see D-7):** native `forceRTL` flag (not JS `direction`). **Locale rule:** Arabic device ⇒ Arabic/RTL, any other language ⇒ English/LTR. **Hard invariant — a mismatched direction never renders (not one frame):** an **Android native early-set** (`plugins/withAndroidRtlEarlySet.js` → `MainApplication.onCreate` forces the flag from the device locale *before* React loads) + a splash-gated **JS boot guard** (`app/_layout.tsx`) as backstop. Verified on-device: `ar`→RTL, `en`/**Urdu**→LTR, all with **no reload** (early-set pre-aligns). iOS aligned by `CFBundleLocalizations:[ar,en]` base `en` (UNVERIFIED till M5). Note: `Updates.reloadAsync()` throws in a bare production release (needs EAS Update), which is why the boot path is native, not a reload. TODO: ICU plural forms; M3 in-app switcher restart mechanism.
- [x] **Theme** from shared `@swap/config` tokens (dark navy; `src/theme.ts`). *(Note: `@swap/config` ships a single dark palette — a light/dark toggle would need light tokens added there; deferred.)*
- [x] **RN component kit — DONE (~22 components, all verified RTL+LTR on device via the `/ui-kit` route).** Derived from a full `apps/web` inventory (5-agent workflow; ~130 web components mapped). **Primitives:** `Button`, `Card`, `Avatar`, `Badge` (+`PROPOSAL_STATUS_TONE`/`STATUS_TONE`), `RatingStars`, `Chip`, `Divider`, `StatCell`, `Icon`/`IconButton` (lucide + react-native-svg; `mirror` flips via a **wrapping `View`** — the svg-style transform is unreliable on Fabric and drops the glyph), `BottomSheet` (RN Modal), `Select` (BottomSheet-backed), `Input`/`Textarea`/`Checkbox`, `Skeleton`, `SegmentedControl`, `Accordion`, `ListRow`, `StrengthMeter`, `CategoryIcon`. **Composites:** `SwapPair` (signature ⇄), `ItemArtwork`, `FeaturedCard`, `WantedCard`, `CategoryCard`/`CategoryCarousel`, `SellerCard`, `ProfileHeader`, `ChatBubble`, `ConversationCard`, `NotificationBell`, `FollowButton`, `MessageButton`, `ReportDialog`, `AvatarUpload`. `Screen`/`EmptyState` present; `ListingCard`/`CategoryGrid` refactored onto the primitives. Reuses `@swap/ui` formatters. **Deferred: `ProposalContextCard`** — a 585-line stateful *feature* (proposal state machine + Realtime + counter/confirm/dispute sheets + rating/celebration); build it with the **M3 swap/chat flow** against real data, not as a hollow kit shell. **Later polish:** gradient `ItemArtwork` placeholder (`expo-linear-gradient`); gesture-driven `@gorhom` sheet; real image picker for `AvatarUpload` (`expo-image-picker`). Dev preview: `justswap://ui-kit`.
- [x] **Decision D-1 confirmed:** browse uses the direct `@swap/api` RLS query layer (`getListings`) — Home already does — not the REST browse endpoint (which skips block-filtering).

**Exit criterion:** Navigable shell, every route reachable (screens may be stubbed), Arabic RTL correct end-to-end, theme applied. **Nav shell + Home verified on `emulator-5554` (2026-07-22); full RTL + remaining screens ongoing.**

---

### Phase M2 — Feature Parity: Browse / Read Surface `(me)`
> All read/discovery/profile surfaces against live data. Shared API for every item already exists.

- [ ] Home (featured + categories) · Browse + search/filters/sort · Listing detail + view tracking · Categories · Saved/wishlist · Own + public profile (listings + reviews) · Following feed.
- [ ] Static legal/info screens (terms/privacy/safety/support/disclaimer) — link to the hosted URLs (Phase S).

**Exit criterion:** Signed-in user browses → opens a listing → saves it → views a seller's public profile & reviews, live data, both locales.

---

### Phase M3 — Feature Parity: Auth + Transactional Loop `(me)`
> Core barter lifecycle + all writes. Needs the image picker (schedule `expo-image-picker` from M5 before create-listing/deal-close).

- [ ] Auth: register (+ email confirm) · login · logout · forgot/reset · onboarding.
- [ ] Create/edit/delete listing incl. image upload + reorder.
- [ ] Messaging inbox + Realtime chat + read receipts; start conversation from a listing.
- [ ] Proposals: propose (bundle) → counter → accept → decline/withdraw.
- [ ] Deal closing: both-sides photo confirm → complete; dispute.
- [ ] Post-swap rating/review · Notifications center + badge · Follow/unfollow.

**Exit criterion:** Two devices complete the **full swap lifecycle** (register → create → propose → chat → counter → accept → both confirm → completed → rate) with live Realtime chat + notifications.

---

### Phase M4 — Trust & Safety Parity + **Apple Guideline 1.2** `(me+backend)`
> Highest store-rejection risk. Build to the stricter of Apple/Google. Backend has reporting + blocking; it lacks proactive filtering + a persisted ToS gate; none of it is in a mobile UI. The **EULA legal text** is hosted in Phase S — here we build the *mechanism* with placeholder copy.

- [ ] **Report** UI (≤2 taps) on listings + user profiles · `createReport`/`reportListing`.
- [ ] **(me+backend)** **Report a message** in chat (schema already allows `message`/`conversation` targets; no UI exists on any platform).
- [ ] **Block/unblock** on every profile + in chat + a Blocked-users screen · `blockUser`/`unblockUser`/`getBlockedUsers`.
- [ ] **(me+backend)** **Proactive content filter** on every UGC write (listing text, messages, uploaded images/avatars) — the real gap; today only reactive auto-hide + admin queue exist. **Decision D-2 (deferred to M4): bring the user the options with real per-item costs and let them choose then.** CSAM detection + reporting path is mandatory for user-uploaded photos.
- [x] Reactive moderation already live (auto-hide at 5 reporters + admin ban/suspend/remove — `BUILD_PLAN.md` Phase 4). Reuse.
- [ ] **(me)** Published contact/support screen (mirror web `/support`); support URL set in listings at Phase S.
- [ ] **(me+backend)** **Persist ToS acceptance** (add `terms_accepted`/`terms_version`/`accepted_at`; re-consent before first UGC) with zero-tolerance copy. Legal text supplied in Phase S.
- [ ] Document the **24h remove-content-and-eject-user** moderation SLA (runbook → App-Review notes in Phase S).

**Exit criterion:** All five Apple-1.2 pillars demonstrable **in the app** by a reviewer following notes: filter blocks a bad post, Report works on listing/user/message, Block hides a user, contact info visible, EULA must be accepted before posting.

---

> ## ── HARD STOP ──  ⚠ Register the **Apple Developer account** ($99/yr) to do the iOS half of M5–M6.
> Everything above (M0–M4) and **all of Android** below needs no account. iOS push (APNs) and iOS device/TestFlight builds do. See "The one hard stop" above.

---

### Phase M5 — Native Integrations `(me)` — Android fully local; iOS push/device needs the Apple account
> All require a dev/production build (none work in Expo Go).

- [ ] **Camera / image capture** · `expo-image-picker` (library + system camera) for listing images, avatar, confirmation photos (overlaps M3). Config-plugin permission strings (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`).
- [ ] **(me+backend)** **Push** · `expo-notifications`. Add a `device_tokens` table + token-register endpoint + a send path on the existing notification triggers. **Android FCM v1 = free (Firebase project). iOS APNs = paid Apple account (the hard stop).**
- [ ] **Deep / universal links** · `expo-linking` + `expo-router`. iOS `associatedDomains: ["applinks:justswap.me"]` + AASA at `justswap.me/.well-known/apple-app-site-association`; Android `intentFilters autoVerify:true` + `assetlinks.json`. Cover listing/profile/chat + the email-confirm callback. *(You host the two well-known files on justswap.me.)*
- [ ] **Biometrics** · `expo-local-authentication` (optional app-lock / quick re-auth); `NSFaceIDUsageDescription`.
- [ ] **Share sheet** · `expo-sharing` / RN `Share` (mirror web `ShareButton`).

**Exit criterion:** On **Android** (no account): FCM push received & deep-taps to the right screen; universal link opens the right listing from cold start; biometric unlock works; share works. **On iOS (after registering):** the same, incl. APNs push.

---

### Phase M6 — Build Config (EAS) `(me)` — Android builds account-free; iOS signed build needs the Apple account
- [ ] Author **`eas.json`**: `development` (dev-client, internal), `preview` (internal, APK), `production` (store, AAB) + a `submit.production` block (iOS ASC API key fields; Android service-account/track/releaseStatus).
- [ ] App-config plugins + all permission strings; **`ios.privacyManifests`** (`PrivacyInfo.xcprivacy`) with required-reason declarations (audit each native dep — a known 2026 upload-rejection cause).
- [ ] Icons/splash/graphics: iOS icon **1024×1024, no alpha, no rounded corners** *(current `assets/icon.png` likely carries alpha — flatten it)*; Google icon **512×512 32-bit PNG w/ alpha ≤1 MB**; **Google feature graphic 1024×500 (required)**.
- [ ] **Android production AAB builds locally / via EAS with no account.** iOS production build is authored here but **produces an installable binary only after the Apple account exists** (Phase S credentials).

**Exit criterion:** `eas build -p android --profile production` succeeds and installs on a device with no account; the iOS build config is complete and ready for signing once the Apple account is registered.

---

> ## ══ HARD STOP — everything below is BLOCKED ON YOU (accounts, legal, console, submission) ══

### Phase S — Store Registration, Compliance & Submission `(you)` `(me: drafts + assets)`
> Do this after the apps are built. All copy/screenshots in **Arabic + English**. See the Blocked-on-you table for IDs.

**Accounts & credentials** — `B-ACC-*`, `B-CRED-*`
- [!] Register **Apple Developer Program** ($99/yr) — needed from M5 for iOS; **Individual vs Organization is Decision D-5 (open)**.
- [!] Register **Google Play Console** ($25 one-time).
- [!] Signing/submit credentials: Apple ASC API key (`.p8` + Key/Issuer IDs); Google Play service-account JSON; APNs key + FCM v1 (push). EAS can manage device-signing.

**Legal & compliance content** — `B-LEGAL-*`, `B-STORE-*` (me drafts → you submit/host)
- [!] Host **privacy policy** + **terms/EULA** (bilingual, reachable) at justswap.me — both stores hard-require the privacy URL; Apple 1.2 needs the accepted EULA (M4 gate points here).
- [!] Apple **App Privacy** nutrition labels + Google **Data Safety** form (from my data-map draft).
- [!] Apple **age rating** (new 4+/9+/13+/16+/18+; UGC+messaging → expect ≥13+; **Social-Media descriptor required from Sept 2026**) + Google **IARC** content rating.

**Store listing & assets** (me generates → you approve/upload)
- [ ] Listing copy per store/locale: name (≤30), Apple subtitle (30)/Google short desc (80), description (4000), Apple keywords (100), promo text (170).
- [ ] Screenshots, RTL-mirrored for Arabic: Apple **iPhone 6.9″ 1320×2868** (+ iPad 13″ 2064×2752 if enabled); Google **phone ≥1080×1920** + **feature graphic 1024×500**. No alpha.

**Pre-release gate & submit** — `B-STORE-3/4`, `B-SUBMIT-1`
- [!] **TestFlight** internal + **Google Play internal testing** pass a real-device run of the M3 lifecycle + M4 safety flows. *(New personal Google accounts: 12 testers / 14 continuous days before production — Org accounts exempt.)*
- [!] Apple **demo account** (buyer/seller/admin) in review notes; keep backend live during review.
- [ ] **(me)** Draft App-Review reviewer notes (exact taps to Report/Block/EULA/contact + the 24h SLA).
- [!] `eas submit` → **Submit for Review** on both stores; respond to any rejection.

**Exit criterion (whole plan):** Live on **both** the App Store and Google Play, installable on device, full swap lifecycle functional on mobile (satisfies `BUILD_PLAN.md` Phase-7 exit) with all five Apple-1.2 pillars in place.

---

### Blocked on you (human-only) — consolidated

| ID | Item | Cost / lead time | Unblocks |
|---|---|---|---|
| **B-ACC-1** | Apple Developer Program enrollment | $99/yr; D-U-N-S can take days if Org | iOS push (M5), iOS build (M6), submit (S) |
| **B-ACC-2** | Google Play Console account | $25 one-time | Play distribution (S) |
| **B-ACC-3** | D-U-N-S number (only if Org — see D-5) | Free; days | Apple Org enrollment |
| **B-CRED-1** | Apple ASC API key (`.p8` + Key/Issuer IDs) | — | EAS Submit iOS |
| **B-CRED-2** | Google Play service-account JSON | — | EAS Submit Android |
| **B-CRED-3** | APNs key + FCM v1 service-account | — | Push (M5) |
| **B-LEGAL-1** | Privacy policy URL (bilingual) at justswap.me | — | Both stores (S) |
| **B-LEGAL-2** | Terms/EULA w/ zero-tolerance clause (bilingual), hosted | — | Apple 1.2 gate (M4), S |
| **B-STORE-1** | Fill App Privacy + Data Safety forms (my draft) | — | S |
| **B-STORE-2** | Apple age rating + Google IARC questionnaires | — | S |
| **B-STORE-3** | Google closed test: ≥12 testers / ≥14 days (new personal accounts only; Org exempt) | 14+ days | Play production |
| **B-STORE-4** | Apple demo account (buyer/seller/admin) + live backend during review | — | Apple review |
| **B-SUBMIT-1** | Submit for Review on both stores; handle rejections | Apple review ~24–48h | Launch |
| **B-DEC** | Resolve open decisions (esp. D-2 at M4, D-5 before S) | — | as noted |

---

## Store-requirement facts (verify the ⚠ before submitting — current 2026-07)

- **Apple build gate (now):** uploads must be built with **Xcode 26 / iOS 26 SDK** (since 2026-04-28). Compile-time only — deployment target can stay iOS 15+. **Expo SDK 57 (now in use) meets this.** SDK 51 did **not** (upgraded in M0). ([apple upcoming-requirements](https://developer.apple.com/news/upcoming-requirements/?id=02032026a), [expo sdk-54](https://expo.dev/changelog/sdk-54))
- **Google target API:** **API 35** required now; **⚠ API 36 required from 2026-08-31** (extension to 2026-11-01). Current Expo SDK handles `targetSdkVersion`. **16 KB page size** required for API-35+ apps with native code since 2025-11-01 (RN/Expo `.so` libs — reason to stay current). ([android target-sdk](https://developer.android.com/google/play/requirements/target-sdk), [16 KB](https://developer.android.com/guide/practices/page-sizes))
- **Apple 1.2 pillars:** filter · report + 24h action · block · published contact · accepted zero-tolerance EULA. Disclaimers don't count — reviewers exercise the UI. ([§1.2](https://developer.apple.com/app-store/review/guidelines/))
- **Accounts:** Apple $99/yr (Org needs D-U-N-S); Google $25 one-time; new personal Google accounts need 12-tester/14-day closed testing (Org exempt). ([google testing](https://support.google.com/googleplay/android-developer/answer/14151465))
- **Screenshots (⚠ changed):** Apple **6.9″ 1320×2868** (+ iPad 13″ 2064×2752); the rest auto-scale. Google **phone ≥1080×1920** + **feature graphic 1024×500**. No alpha; per-locale sets (Arabic from the RTL build). ([apple](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/), [google](https://support.google.com/googleplay/android-developer/answer/9866151))
- **Privacy manifest:** ship `ios.privacyManifests`; audit non-Expo native deps' required-reason declarations. ([expo](https://docs.expo.dev/guides/apple-privacy/))

---

## Open Decisions

| # | Question | Status |
|---|---|---|
| **D-4** | Bundle id / brand name | ✅ **RESOLVED (2026-07-22): `me.justswap.app`** (reverse-DNS of the owned domain `justswap.me`) for both platforms; display name **"JustSwap"** (one word). Set in `app.json` in M0. `justswap.me` is also the Universal-Links / App-Links domain (M5). |
| **D-7** | Mobile RTL direction strategy + first-launch invariant | ✅ **RESOLVED + IMPLEMENTED (Sessions 10–11, 2026-07-23).** **Strategy: native `I18nManager.forceRTL` flag**, not JS-managed Yoga `direction` (which silently breaks native-stack nav / horizontal-scroll / TextInput caret with no JS remedy; the 18 primitives were never the cost — 5-agent research + audit). **Locale rule:** Arabic device ⇒ Arabic/RTL; **any other language ⇒ English/LTR**. **Hard invariant (user, non-negotiable): a mismatched direction must never render, not even one frame.** Enforced by (1) an **Android native early-set** — config plugin `plugins/withAndroidRtlEarlySet.js` injects into `MainApplication.onCreate` a `forceRTL(device-lang == "ar")` **before React loads**, so the first surface is always correct with **no reload** (works in a bare production release); + (2) a splash-gated **JS boot guard** (`app/_layout.tsx`: `SplashScreen.preventAutoHideAsync` → reconcile native flag vs locale → reveal, else `forceRTL`+`reloadAsync`) as a dev-path + safety net. **Verified on-device (RN 0.86 Android):** `ar`→RTL Arabic, `en`→LTR, **Urdu (RTL-script-non-ar)→LTR English** (the override case), all `bundle-loads=1` (no guard reload). **iOS:** `app.json → ios.infoPlist.CFBundleLocalizations:['ar','en']` base `en` aligns every iOS case natively (Arabic→RTL, else→LTR) — **UNVERIFIED till M5** (no Mac; the JS guard is the runtime backstop). **Key finding:** `Updates.reloadAsync()` **throws `ERR_UPDATES_DISABLED` in a bare production release** (needs EAS Update: url+runtimeVersion) — so the boot invariant uses the native early-set, not a reload. **M3 open — the in-app switcher (Option A) restart is ASYMMETRIC across platforms** (record now, decide at M3): the runtime language flip must re-apply the native flag, but there is no single cross-platform mechanism. **Android:** a native activity restart works. **iOS:** there is **NO Apple-sanctioned programmatic restart** — `exit(0)` reads as a crash and risks App Store rejection, and `react-native-restart` is unmaintained with no New-Arch support. So a native activity restart covers Android with **no iOS equivalent.** The real iOS options are: **(a) enable EAS Update** (`reloadAsync` then works on both platforms), **(b) custom native bridge-reload work** (recreate the RN surface natively on iOS), or **(c) a manual "reopen JustSwap to apply" prompt** (no auto-restart). Not decided — bring options at M3. Also: the early-set must then read the *persisted user choice*, not just the device locale. |
| **D-5** | Apple/Google enrollment — Individual or Organization? | ⏸ **OPEN — deliberately deferred (2026-07-22).** JustSwap is a standalone project; **no existing company is assumed.** Decide at Phase S. Trade-off to weigh then: Org needs a D-U-N-S (lead time) but gets team roles and skips Google's 12-tester gate; Individual is faster but publishes under a personal legal name. **Does not block the build (M0–M6).** |
| **D-2** | Proactive content-moderation approach (Apple 1.2 Pillar 3) | ⏸ **DEFERRED to M4 (2026-07-22).** When M4 starts, I bring options with **real per-item costs** (hosted text classifier + image/NSFW + CSAM hash-matching, routed to the existing admin queue) for the user to pick. Doesn't block M0–M3. |
| **D-1** | Mobile browse data path | **Recommend (unconfirmed): direct `@swap/api` RLS queries**, not REST browse (which skips block-filtering — `BUILD_PLAN.md` Known-Issue). M0 harness already uses the RLS path. Confirm in M1. |
| **D-3** | Admin (dashboard/moderation/catalog) on mobile, or web-only? | **Recommend (unconfirmed): web-only for v1.** Consumer safety UI (report/block/blocked-list) is in mobile scope regardless. |
| **D-6** | Push transport — Expo Push vs direct FCM/APNs? | **Recommend (unconfirmed): Expo Push** (simplest with `expo-notifications`; still needs FCM v1 + APNs creds). |

---

## Known gaps / risks

- [RESOLVED] ~~Local Android build needs Windows Long Paths~~ — RN New-Arch codegen produces ~**373-char** object paths (> Windows **260**). **Two fixes, both required:** (1) `LongPathsEnabled=1` (HKLM, elevated — done by the user via `New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -Value 1 -PropertyType DWord -Force`); and (2) the CMake-bundled **ninja 1.10.2 is not long-path-aware**, so the OS flag alone still failed → replaced `Sdk/cmake/3.22.1/bin/ninja.exe` with **ninja 1.12.1** (`\\?\` long-path support; original saved as `ninja.exe.orig`). Build then **succeeded** + M0 smoke 5/5. **⚠ Machine-setup note (not committable — lives in the Android SDK, not the repo):** a fresh Windows machine needs BOTH long paths enabled AND ninja ≥1.12 in `cmake/<ver>/bin/`. Mac/Linux/EAS have no 260 limit → Windows-local only. — added 2026-07-22, resolved 2026-07-22
- [DECISION] **`nodeLinker` stays pnpm's default `isolated` (strict, phantom-dep-safe).** Briefly tried `nodeLinker: hoisted` to shorten `.pnpm` paths, then **reverted** — it's a global resolution change for a Windows-local problem and it drops pnpm's phantom-dep protection (apps/web + apps/api deploy from this repo via `pnpm install --frozen-lockfile`). The mobile build succeeds under **isolated** anyway (ninja 1.12.1 handles the long paths; the only failure was a clang OOM from low free RAM, fixed by capping native parallelism). Verified under isolated: **web `next build`** ✓, **api `tsc` build** ✓, **api `ts-node` runtime** (boots, all modules resolve, `/health`+routes 200) ✓ → no phantom deps. Machine-local tunings live in git-ignored `apps/mobile/android/gradle.properties`: `reactNativeArchitectures=x86_64` (fast emulator builds; EAS/prod uses all ABIs) + `org.gradle.parallel=false` / `org.gradle.workers.max=4` (RAM). — 2026-07-22
- [RESOLVED] ~~iOS did not declare Arabic as a supported localization~~ — added `ios.infoPlist.CFBundleLocalizations:['ar','en']` (base `en`) in `app.json`. iOS now selects Arabic (→RTL) for Arabic devices and English (→LTR) for every other language, matching the JS locale rule with no reload. **UNVERIFIED till M5** (no Mac); the JS boot guard is the runtime backstop. Android was already correct (`android:supportsRtl='true'`). — 2026-07-23 (D-7)
- [RESOLVED] ~~clang OOM on the cold New-Arch native build~~ (recurred when installing `expo-updates` invalidated the CMake cache → full codegen recompile at 12-way parallelism on ~1.9 GB free RAM). **Fix: a CMake job pool** in git-ignored `android/app/build.gradle` (`-DCMAKE_JOB_POOLS:STRING=compile_pool=2;link_pool=1`) caps concurrent compile/link jobs regardless of ninja's `-j` — the gradle `workers.max` cap does **not** reach ninja's internal parallelism (why it recurred). Also pin `sdk.dir` in git-ignored `android/local.properties` (fresh shells have no `ANDROID_HOME`). Both machine-local. Build then succeeded (3m29s). — 2026-07-23
- [NOTE] **`expo-updates` installed** (`~57.0.9`) but the **boot direction guard does NOT depend on it** — `reloadAsync()` throws `ERR_UPDATES_DISABLED` in a bare production release (needs EAS Update url+runtimeVersion), so the invariant is enforced by the **Android native early-set** instead (D-7). expo-updates stays for the **M3 switcher** (Option A) + future OTA; `reloadAsync` works in dev and will work in prod if/when EAS Update is enabled. — 2026-07-23
- [NOTE — every `forceRTL`/`allowRTL` call site (D-7)] The native direction flag is set in exactly two places, both deriving from the same rule (Arabic ⇒ RTL, else ⇒ LTR): (1) **Android native early-set** — `MainApplication.onCreate` via plugin `withAndroidRtlEarlySet`, before React loads, every launch, from the **device** locale — the production mechanism; (2) **JS boot guard** — `app/_layout.tsx`, only if native ≠ required (shouldn't happen given #1), then `forceRTL` + `reloadAsync` (works in dev; the reload throws in bare prod but this path shouldn't trigger). `src/i18n/index.ts` **no longer** touches `I18nManager`. **Future:** the M3 in-app switcher adds a third site and must feed the *persisted user choice* into #1. — 2026-07-23
- [NOTE — config plugin + prebuild] The RTL early-set is a committed Expo config plugin (`apps/mobile/plugins/withAndroidRtlEarlySet.js`; requires `expo/config-plugins`, **not** `@expo/config-plugins` — the latter is a phantom dep under pnpm's isolated linker). It applies on `expo prebuild` / EAS. On this machine it's ALSO applied directly to the git-ignored `MainApplication.kt` so local `gradlew` builds have it with no prebuild. **⚠ A future `expo prebuild` re-injects the plugin but REGENERATES `android/`, wiping the machine-local build tunings** (gradle.properties RAM/ABI caps, `app/build.gradle` CMake job pool, `local.properties`) — re-apply them, or promote them to plugins. — 2026-07-23
- [RESOLVED] ~~Expo SDK 51/RN 0.74 not submittable~~ — **upgraded to SDK 57** (RN 0.86, New Arch on) in M0 (Session 2). — 2026-07-22
- [RESOLVED] ~~`createSupabaseClient` had no storage adapter → cold-start logout on native~~ — **fixed** (accepts `storage`), mobile injects AsyncStorage. — 2026-07-22
- [RESOLVED] ~~`react-native-url-polyfill` absent~~ — added + imported at app entry. — 2026-07-22
- [NOTE] `expo-doctor` reports one "duplicate react" (mobile React 19.2.3 vs web React 18.3.1). **Expected & non-blocking:** web is Next/React 18, mobile is Expo/React 19; pnpm isolates them, so the mobile bundle contains only 19.2.3. Not fixable without a separate (risky) web React 18→19 upgrade — out of scope. — 2026-07-22
- [OPEN — Apple 1.2] **No proactive content filter** (text/image) anywhere. Primary 1.2 rejection risk. Decision D-2 + Phase M4. — 2026-07-22
- [OPEN — Apple 1.2] **ToS acceptance not persisted** (web checkbox only, no DB column). Needs a migration in M4. — 2026-07-22
- [OPEN] **No message-level report UI** on any platform (schema supports it). Add for mobile in M4. — 2026-07-22
- [OPEN] Block-filtering not applied on the REST/service-role browse path (`BUILD_PLAN.md` Known-Issue) — mobile must browse via the RLS query layer (D-1). — 2026-07-22
- [OPEN — M6] iOS app icon likely carries alpha — flatten (no alpha, no rounded corners) or Apple rejects. — 2026-07-22
- [WATCH] Google **API-36 deadline 2026-08-31** + 16 KB page size — stay on a current Expo SDK; re-verify at submission. — 2026-07-22
- [INFO] `EXPO_PUBLIC_API_URL` defaults to `http://10.0.2.2:4000/api/v1` (Android-emulator→host). Real devices need the LAN IP or the deployed API URL; Supabase auth/reads/realtime hit the remote host directly regardless. — 2026-07-22

---

## Agent Instructions for Updating This File

**At the start of every mobile session:**
1. Read "RESUME HERE" and the current phase's checklist.
2. Check **Open Decisions** — D-2 blocks M4; D-5 blocks Phase S enrollment; don't guess, get the call.
3. Re-verify any ⚠ store fact against its source — store rules change monthly.

**At the end of every mobile session:**
1. Update `[x]`/`[~]`/`[ ]`/`[!]` on every item touched.
2. Update RESUME HERE (Current phase / Last worked on / Next task).
3. Add a Session Log row (# + one-line summary + date).
4. Add any new decision/gap; resolve decisions you got a call on.
5. Mirror status to `BUILD_PLAN.md` **Phase 7** so the two stay consistent (this plan is the detail; Phase 7 is the summary).

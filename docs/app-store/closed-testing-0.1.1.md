# JustSwap closed-testing quality update — 0.1.1

Prepared 2026-09-16. The Android production AAB **has been built and verified**. **Nothing has
been uploaded or submitted to Google Play or App Store Connect.**

---

## Changes

- **App icon rebuilt from the canonical brand mark.** The launcher/app icon carried the
  light-surface logo (green J + navy S) on a near-black tile. The S is white on dark
  surfaces, so the icon was both off-brand and low-contrast. All three icon assets are now
  generated from `apps/mobile/assets/logo-mark.png` — the same file the in-app logo, the
  splash screen and the web's dark-surface brand mark already use.
- **Android adaptive icon no longer clipped.** The adaptive foreground was drawn at ~69% of
  its layer, well outside Android's safe zone, so launchers cut off the J's foot and the S's
  outer edge. The mark now sits inside the guaranteed-visible 66dp circle (272px ink radius
  against a 313px budget) and is sized so it appears at the same optical scale as the iOS
  icon.
- **Keyboard no longer covers form fields on Android.** Every form passed
  `behavior={Platform.OS === "ios" ? "padding" : undefined}` to `KeyboardAvoidingView`,
  which is inert on Android. Under Expo SDK 57's edge-to-edge the window also stops resizing
  for the IME, so `adjustResize` no longer compensates. A shared `<KeyboardAvoider>` now
  reserves the measured keyboard height on Android (the technique the chat composer already
  used) and keeps the existing `padding` behaviour on iOS. Applies to sign-in, register,
  onboarding, forgot/reset password, create listing, edit listing, edit profile and delete
  account.
- **Images degrade gracefully instead of going blank.** Listing artwork and avatars rendered
  a bare `<Image>`; a broken or expired URL left an empty grey box with no title or initial.
  The category placeholder and the avatar initial now sit underneath the photo, so they
  cover both the loading gap and `onError`. The listing-detail gallery uses the same
  component.
- **Failed photo uploads are reported when publishing a listing.** Image upload failures were
  swallowed, so a listing could publish with photos missing and no explanation. The user is
  now told how many failed and where to add them. The listing still publishes — behaviour is
  unchanged otherwise.
- **Create-listing steps start at the top.** The three steps share one scroll view, so moving
  between them kept the previous offset and a failed submit could report a field error
  off-screen.
- **Search results stop flashing, and the box can be cleared.** Browse blanked the list to
  skeletons on every debounced keystroke and filter tap. Existing results now stay on screen
  with an inline "Updating…" indicator while the new query runs; skeletons are reserved for a
  genuinely empty screen. The search field gained a clear button.
- **Touch targets enlarged.** Category chips and checkboxes reached ~34pt and ~22pt; both are
  now 46pt. The create-listing remove-photo control moved inside its thumbnail (a control
  that overhangs its parent is only partly tappable on Android but fully tappable on iOS) and
  is 44pt. Auth screen links ("Create one", "Sign in instead", "Forgot password") are now
  real link-role buttons with ~42pt targets. Photo reorder arrows grew from 16pt to ~40×36pt
  — a quarter-width thumbnail cannot fit two 44pt targets side by side.
- **Listing gallery page counter was stuck at "1/N" in Arabic.** A horizontal FlatList is
  mirrored under RTL, so `contentOffset.x === 0` is the *last* page, not the first — measured on
  an Android emulator: with two photos, image 1 reports `offsetX == width` and image 2 reports
  `offsetX == 0`. The counter and dots therefore never advanced in Arabic. Now flipped under
  `I18nManager.isRTL`; verified 1/2 → 2/2 in both Arabic and English on device.
- **Swap-picker tick mirrors under RTL.** The selected-listing tick in the propose-a-swap picker was
  pinned with a physical `right`, so it stayed on the same corner in Arabic while every other artwork
  overlay mirrored. Now uses the logical `end` edge like the rest.
- **Disabled reorder arrows now look disabled** on the edit-listing image manager, matching
  create-listing.

## Testing feedback / issue addressed

- The brand issue was reported directly: the S was rendering blue where it should be white.
- The Android keyboard-over-input problem is recorded in the codebase as "the reported bug"
  (`app/messages/[id].tsx`), where it was fixed for the chat composer only. This release
  applies the same fix to the remaining forms.

No other tester reports are recorded in this repository; the remaining items were found by
inspection during this pass.

## Validation

Run on this machine:

- `turbo run typecheck` — 8/8 workspaces clean, including `@swap/mobile`.
- `turbo run lint` — 8/8. Only `@swap/web` has a linter configured (`next lint`, clean);
  the other seven, mobile included, echo "no lint configured".
- `expo export --platform android` — bundled, 3390 modules.
- `expo export --platform ios` — bundled, 3259 modules.
- `node scripts/check-i18n-parity.mjs` — PASS, both locales in parity on both surfaces.
- `eas config --platform android --profile production` — resolves, production environment
  variables load.
- `expo-doctor` — 19/21. The two failures (duplicate `react` across web/mobile, SDK 57 patch
  drift) predate this change set and are documented in `docs/mobile-release-plan.md`.
- Expo's own Android icon generator (`setIconAsync`) run against the new assets into a
  scratch directory: `ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground` and
  `mipmap-anydpi-v26/ic_launcher.xml` all render the full mark under circular and squircle
  masks with nothing clipped.

### Runtime QA on an Android emulator (Pixel 3a, API 34 / Android 14)

Run against the live Supabase backend through the EAS dev client + Metro, signed in as the
demo account. Screenshots were taken for each step.

**Passed**

- App boots; home, browse, listing detail, profile all render with live data (20 listings).
- Search: typing filters 20 → 2 results **without the list blanking to skeletons**; the clear
  button appears with text, empties the field and restores 20 results.
- **Keyboard avoidance, A/B proven on the same screen.** With the fix, the whole login card
  including the Sign in button sits above the keyboard. With `KeyboardAvoider` temporarily
  reverted to the old no-op Android path, **Sign in and Forgot password were completely hidden
  behind the keyboard** — the regression this release fixes. Re-verified after restoring.
- Keyboard avoidance also verified on create-listing (description) and edit-profile (bio),
  in both English and Arabic.
- Sign in: wrong password shows a styled "Invalid login credentials" alert; correct
  credentials sign in. Required-field validation shows inline errors and clears on typing.
- Create-listing wizard: 3 steps, progress bar, dependent country → city selects, title
  length validation, exchange preview. **Step scroll reset verified** — with the display
  shortened so steps scroll, step 1 was scrolled down and step 2 still opened at its header.
- **Image fallback proven** by temporarily pointing every artwork at a dead URL: cards fell
  back to the branded category tile with the item title instead of an empty grey box.
  Restored and re-verified.
- **Arabic RTL**: full layout mirror across home, browse, profile, settings, edit-profile and
  listing detail — including the new search clear button moving to the trailing (left) edge.
  In-app language switch works both directions.
- Listing gallery page counter now advances correctly in Arabic (1/2 → 2/2) **and** English.

**Not exercised**

- **Publishing a listing.** This build points at `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`,
  and no local NestJS API is running, so `api.createListing` cannot complete. Everything up to
  the publish call was exercised. Not repointed at production to avoid creating real data.
- **Register**, and **edit-listing image management** — not run (session was signed in; the
  image manager also needs gallery images on the emulator).
- **Launcher icon, adaptive icon and splash on device.** The installed dev client carries the
  *old* native assets, so these cannot be seen until a build made from the new assets is
  installed. Verified instead from the produced AAB (see below) and from Expo's own icon
  generator.
- **iOS.** No simulator — this is a Windows machine. iOS is covered by the shared codebase
  (zero platform-specific source files), a clean iOS Metro bundle, and unchanged iOS
  keyboard behaviour.

## Versions

| | Previous | This release |
|---|---|---|
| versionName | 0.1.0 | **0.1.1** |
| Android versionCode | 7 (build `ef3a0cfd`, commit `a9cc61f`) | **8** |
| iOS buildNumber | 6 (build `46bb6559`) | **7** |

### How the version number is resolved (verified, not assumed)

`eas.json` has `cli.appVersionSource: "local"`, so EAS does **not** track versions on its
servers — `eas build:version:get` refuses outright ("This project is not configured for using
remote version source"). `app.json` is the sole source of truth.

`autoIncrement` is set **per platform**, not on the profile: `production.android.autoIncrement
= "versionCode"` and `production.ios.autoIncrement = "buildNumber"`. There is no
`build.production.autoIncrement` key. `production.android.buildType` is `"app-bundle"`.

Because `apps/mobile/android/` is gitignored, eas-cli's `resolveWorkflowAsync` classifies this
as the **MANAGED** workflow, which takes the `bumpVersionInAppJsonAsync` branch: it rewrites
`expo.android.versionCode` in `app.json` **on disk** and never touches the local `build.gradle`.
Confirmed against eas-cli 24.6.0 source and then observed in the build output:

```
Bumping expo.android.versionCode from 7 to 8
```

`apps/mobile/app.json` on disk therefore now reads `versionCode: 8` and **must be committed**.
`ios.buildNumber` was not touched, because this was an Android-only build.

> If an Android build is ever produced locally with Gradle instead of EAS, `autoIncrement`
> does not run at all and the binary would carry whatever `app.json` says. Check it by hand.

Package/bundle identifier unchanged: `me.justswap.app` on both platforms.

## Files changed

```
apps/mobile/app.json                                 versionName 0.1.0 -> 0.1.1
apps/mobile/assets/icon.png                          regenerated (green J / white S)
apps/mobile/assets/icon-ios.png                      regenerated, RGB (no alpha)
apps/mobile/assets/adaptive-icon.png                 regenerated, inside the safe zone
apps/mobile/src/components/KeyboardAvoider.tsx       new
apps/mobile/src/components/ItemArtwork.tsx           image fallback + loading state
apps/mobile/src/components/ListingImageManager.tsx   touch targets, disabled arrows
apps/mobile/src/components/ui/Avatar.tsx             initials fallback on image error
apps/mobile/src/components/ui/Input.tsx              optional clear button
apps/mobile/src/components/ui/Chip.tsx               46pt touch target
apps/mobile/src/components/ui/Checkbox.tsx           46pt touch target
apps/mobile/src/i18n/index.ts                        4 new strings (ar + en)
apps/mobile/src/components/ListingPicker.tsx         RTL: logical `end` for the tick
apps/mobile/app/(tabs)/browse.tsx                    no result wipe, clear button
apps/mobile/app/new-listing.tsx                      upload failures, scroll, targets
apps/mobile/app/listings/[id].tsx                    gallery image fallback + RTL page counter
apps/mobile/app/login.tsx                            KeyboardAvoider, link targets
apps/mobile/app/register.tsx                         KeyboardAvoider, link targets
apps/mobile/app/{onboarding,forgot-password,reset-password,delete-account,
                 profile/edit,listings/[id]/edit}.tsx   KeyboardAvoider
docs/app-store/play-store-icon-512.png               new — Play listing icon
scripts/build-app-icons.py                           new — reproducible icon build
```

## The Android build

| | |
|---|---|
| EAS build id | `d9ecbc58-d97d-4751-a1f3-73b587f169ea` |
| Status | **FINISHED** |
| Profile / distribution | `production` / STORE |
| versionName | **0.1.1** |
| versionCode | **8** (previous highest build: 7) |
| Package | `me.justswap.app` |
| Git commit | `2a4f9d6a0e7ea759b9d9988b5530206dbb71c032` |
| Artifact | https://expo.dev/artifacts/eas/I6-9JAADEiGsOt4m_tSe6vrkw8lqvQO9mh66uTxhpBg.aab |
| Format | `.aab` (App Bundle), 78,492,408 bytes |
| sha256 | `214fc3e8f45810c9384e4017ddc6b89ada5bfa2b22db8a1890db691b787acd7d` |
| Built | 2026-09-16 12:29 → 13:00 UTC |

EAS warnings: none beyond the informational `expo` patch-update notice.

### Artifact verification (the AAB was inspected, not trusted)

- Structure: `BundleConfig.pb`, `base/{manifest,resources.pb,dex,lib,res,root,assets}`, 1454 entries.
- Manifest: `package="me.justswap.app"`, `versionCode="8"`, `versionName="0.1.1"`,
  minSdk 24 / targetSdk 36 / compileSdk 36, `supportsRtl="true"`.
- Permissions: INTERNET, ACCESS_NETWORK_STATE, CAMERA, POST_NOTIFICATIONS, READ_APP_BADGE,
  READ/WRITE_EXTERNAL_STORAGE (`maxSdkVersion=32`), RECEIVE_BOOT_COMPLETED, USE_BIOMETRIC,
  USE_FINGERPRINT, VIBRATE, WAKE_LOCK. **`SYSTEM_ALERT_WINDOW` absent** — `blockedPermissions`
  still works. No new sensitive permissions versus versionCode 1.
- Bundle config (the repo's standing recipe, probing ASCII *and* UTF-16 because the release
  bundle is Hermes bytecode): `supabase true / api true / localhost false` → **PASS**. The
  `10.0.2.2` emulator fallback is also absent.
- Signing: `jar verified`, SHA256withRSA 2048-bit, valid to 2053-12-10, certificate SHA-256
  `7A:F9:FC:29:95:FA:66:AB:66:FE:23:DE:B0:3B:0A:85:FA:75:15:71:76:D7:3D:7B:55:C5:DC:EA:3A:E8:39:E7`
  — **identical to the key used for versionCode 1–7 and to the fingerprint in the live
  `assetlinks.json`**, so App Links keep working and Play will accept the upload.
- **Icons extracted from inside the AAB** and colour-analysed: adaptive foreground, legacy
  `ic_launcher`, `ic_launcher_round` and `splashscreen_logo` all show green J + white S with
  **0.0% navy/blue ink**. Shipped adaptive foreground ink radius 115px against a 132px 66dp
  safe budget → nothing clipped.
- **Installed on the emulator** (universal APK via bundletool, debug-signed for install only):
  reports `versionCode=8 / versionName=0.1.1 / targetSdk=36`, the launcher shows the corrected
  green-J/white-S icon under the Pixel circular mask, the branded splash renders, the app
  boots without crashing and Browse loads 20 live listings from production.

## Remaining risks

- **iOS has had no runtime testing** (no Mac/simulator available). The iOS keyboard path is
  byte-for-byte the shipping `KeyboardAvoidingView behavior="padding"`, so the risk is low,
  but the icon and the UX changes should be eyeballed on a TestFlight build.
- **Publishing a listing was not exercised end-to-end** (no local API). Worth being the first
  thing a tester does on the closed-testing build.
- **The icon change is visible to existing testers.** Installed apps will show a different
  launcher icon after the update. That is the intent, but expect it to be noticed.
- ~~The listing-detail gallery page indicator is untested under RTL.~~ **Checked on an Arabic
  device, found genuinely broken, fixed and re-verified in both directions** (see Changes).
- **The web app still ships the blue-S icons** (`apps/web/public/brand/justswap-app-icon*.png`,
  `justswap-apple-touch-icon.png`, `justswap-favicon*.png`). They are out of scope for a
  mobile release because changing them requires a web deploy, but the PWA/browser icon is
  inconsistent with the app until they are regenerated.
- **Play blockers unrelated to this release remain open** — feature graphic (1024×500),
  Android-aspect screenshots, Data Safety, IARC rating, Child Safety/CSAE declaration,
  App Access demo account. See `docs/mobile-release-plan.md`. The 512×512 store icon that
  was on that list is now generated.
- `expo-doctor`'s SDK 57 patch drift is unchanged from the builds already on the track;
  upgrading 14 packages before a quality release would add more risk than it removes.

---

## Google Play release notes (for testers)

**English**

```
Thanks for testing JustSwap.

• New app icon — the JustSwap mark now matches our branding, and no longer gets
  cropped by the Android launcher.
• Fixed: the keyboard covering the fields on sign-in, sign-up, and the listing
  and profile forms.
• Photos that fail to load now show the item's category tile instead of an
  empty box.
• If a photo fails to upload while publishing a listing, we now tell you
  instead of publishing quietly without it.
• Search results no longer flash while you type, and the search box has a
  clear button.
• Bigger, easier tap targets on category filters, checkboxes and photo controls.

Please keep reporting anything that looks wrong.
```

**Arabic**

```
شكرًا لمشاركتك في اختبار JustSwap.

• أيقونة تطبيق جديدة — شعار JustSwap صار مطابقًا لهويتنا، ولم يعد يُقتطع في شاشة تطبيقات أندرويد.
• إصلاح: لوحة المفاتيح كانت تغطي الحقول في تسجيل الدخول وإنشاء الحساب ونماذج الإعلانات والملف الشخصي.
• الصور التي يتعذّر تحميلها صارت تعرض بطاقة تصنيف الغرض بدل مربع فارغ.
• إذا تعذّر رفع صورة أثناء نشر إعلان، صرنا نُعلمك بذلك بدل النشر بصمت بدونها.
• نتائج البحث لم تعد تختفي وتظهر أثناء الكتابة، وأُضيف زر لمسح مربع البحث.
• أهداف لمس أكبر وأسهل في مرشّحات التصنيفات ومربعات الاختيار وأدوات الصور.

نرجو الاستمرار في الإبلاغ عن أي خلل تلاحظه.
```

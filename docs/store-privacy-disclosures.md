# JustSwap — Google Play Data Safety & Apple Privacy answers

> **Fill the store forms from this file.** Every line was verified against the actual
> schema, migrations, client code and `package.json` files on 2026-08-14 — not from the
> marketing copy. Where the product does *not* do something, that is stated explicitly so
> the forms are not over-declared (over-declaring is as damaging as under-declaring: it
> forces disclosures you cannot justify and can contradict your privacy policy).
>
> Re-verify before each submission if the schema changes.

---

## 0. The one-line summary

JustSwap collects account identity (name, username, email, phone), a **coarse
country/city chosen from a dropdown**, optional photo/bio, and all marketplace
user-generated content (listings, photos, messages, swap records, ratings, reports).
It collects a **push token** on mobile. It contains **zero** analytics, advertising,
attribution, or crash-reporting SDKs. It does **not** access GPS, contacts, microphone,
calendar, health or financial data. Nothing is sold or shared for advertising.

---

## 1. Google Play — Data Safety form

### 1.1 Data collected and linked to the user

| Play category | Data type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|---|
| Personal info | Name | Yes | No | Required | App functionality (public profile) |
| Personal info | Email address | Yes | No | Required | Account management, sign-in |
| Personal info | Phone number | Yes | No | Required | Account management, anti-duplicate (unique per account) |
| Personal info | User IDs | Yes | No | Required | Account management (username + internal id) |
| Personal info | Other info (bio) | Yes | No | Optional | App functionality (public profile) |
| Location | **Approximate location** | Yes | No | Optional | App functionality (marketplace filtering) |
| Photos & videos | Photos | Yes | No | Optional | App functionality (avatar, listing photos, swap-confirmation photos) |
| Messages | Other in-app messages | Yes | No | Optional | App functionality (user-to-user chat) |
| App activity | Other user-generated content | Yes | No | Optional | App functionality (listings, ratings, reports) |
| App activity | App interactions | Yes | No | Optional | Analytics *(listing view counts only — internal, no SDK)* |
| Device or other IDs | Device or other IDs | Yes | No | Optional | App functionality (push notifications) |

**Approximate location — answer carefully.** JustSwap has **no GPS**: there is no
`expo-location` dependency, no location permission in the manifest, and the web app
actively disables it (`Permissions-Policy: geolocation=()`). "Location" is a
**country + city picked from a fixed 9-country / 153-city dropdown**
(`packages/config/src/countries.ts`, `cities.ts`). Declare **Approximate location**,
and if there is a free-text box, say: *user-selected city from a fixed list; no device
location is ever read.*

**Device or other IDs.** This is the **Expo push token** plus a self-generated
`installation_id` stored in `device_tokens` (migration 0020). It is **not** an
advertising ID and **not** a hardware identifier. Note: push delivery is not live yet
(the backend provider is still a mock), but the token *is* collected and stored, so it
must be declared.

### 1.2 Data NOT collected — answer "No" to all of these

Precise location · Financial info (no payments anywhere — the app is barter-only, no
purchase flow) · Health & fitness · Contacts · Calendar · SMS/call logs · Browsing
history · Search history *(searches are not persisted)* · Installed apps · Advertising
ID · Crash logs · Diagnostics/performance data · Audio · Files & docs · Sensitive
categories (race, religion, political views, sexual orientation, biometrics).

**Biometrics — say No.** The optional app-lock uses `expo-local-authentication`, which
delegates to the OS. No biometric data reaches the app; only a boolean "lock enabled"
flag is stored in SecureStore.

### 1.3 Security practices

| Question | Answer | Basis |
|---|---|---|
| Encrypted in transit? | **Yes** | All traffic is HTTPS/TLS (Supabase + the API on Railway). |
| Can users request data deletion? | **Yes** | In-app **Settings → Delete account**, plus the public URL below. |
| Data deletion URL | `https://justswap.me/en/account/delete` (AR: `/ar/account/delete`) | Reachable without installing the app or signing in. |
| Committed to Play Families policy? | Not applicable | App is not directed at children. |
| Independent security review | **No** | None has been done. Do not claim one. |

**Do not claim end-to-end encryption.** Messages are stored as plaintext rows in
Postgres (`public.messages`). They are protected by RLS + TLS + Supabase at-rest
encryption, but staff/admins can read them for moderation. That is disclosed in the
privacy policy.

### 1.4 Other required Play declarations

- **Target audience & content:** 18+ (or 13+ if you prefer, but 18+ matches the CSAE
  page, which states the service is not for children). Answer **"No"** to
  "appeals to children".
- **Ads:** contains no ads.
- **Child Safety Standards / CSAE:** required (social + messaging). Published standards
  URL: `https://justswap.me/en/child-safety`. Named contact: `support@justswap.me`.
- **Government / financial / health apps:** No to all.
- **Account creation:** Yes — email + password. Deletion URL as above.

---

## 2. Apple — App Privacy (Nutrition labels)

Use **"Data Linked to You"** for everything below; JustSwap has no anonymous telemetry.

| Apple category | Types | Used for |
|---|---|---|
| Contact Info | Name, Email Address, Phone Number | App Functionality |
| User Content | Photos, Customer Support, Other User Content (listings, messages, ratings, reports) | App Functionality |
| Identifiers | User ID, Device ID *(push token)* | App Functionality |
| Location | Coarse Location *(city selected from a list — see note)* | App Functionality |
| Usage Data | Product Interaction *(listing view counts, internal only)* | App Functionality |

- **Tracking:** answer **No**. There is no ATT prompt, no advertising identifier, no
  third-party analytics, and no data shared with data brokers. Do not implement
  `AppTrackingTransparency`.
- **Data used to track you:** none.
- **Data not collected:** Financial Info, Health & Fitness, Browsing History, Search
  History, Contacts, Sensitive Info, Diagnostics.
- **Account deletion (Apple 5.1.1(v)):** in-app path is **Settings → Delete account**.
  Point reviewers there in the review notes.
- **Permission strings already shipped** (`apps/mobile/app.json`): camera, photo library,
  Face ID. There is deliberately **no** microphone or location string.

---

## 3. Verified third parties (name these in the privacy policy)

| Service | What it receives | Where |
|---|---|---|
| **Supabase** | Auth identity, all database rows, uploaded files, realtime traffic | Hosting/DB/Storage |
| **JustSwap API** (self-hosted on Railway) | Authenticated API traffic | Own backend |
| **Expo push service** | Issues the push token per install | `getExpoPushTokenAsync` |
| **Resend** | The user's email address + auth links | `supabase/functions/send-email` |

**Verified absent** — searched every `package.json` in the monorepo: no Firebase
Analytics, Sentry, Crashlytics, Amplitude, Segment, Mixpanel, Facebook SDK, AppsFlyer,
Adjust, Branch, or Google Mobile Ads. Do not declare any analytics or ad partner.

---

## 4. Storage buckets and who can read them

| Bucket | Public? | Contents |
|---|---|---|
| `avatars` | **Public read** | Profile photos |
| `listing-images` | **Public read** | Listing photos |
| `chat-images` | Private | *Policied but unused — no client uploads chat images. Do not declare in-chat photo sharing.* |
| `swap-confirmations` | Private (participants only) | Handover proof photos |

---

## 5. Retention & deletion (what to write on the forms)

- **In-app deletion is immediate.** `DELETE /me` purges personal data and removes every
  listing from the marketplace in one transaction, then deletes the login.
- **Web requests** (for people who can no longer sign in) are actioned **within 30 days**.
- **Retained, de-identified** after deletion — disclose this, it is permitted under Play's
  "security, fraud prevention and regulatory compliance" allowance:
  messages already delivered to another person, swap/exchange records, ratings exchanged,
  and safety reports. The account is shown as "Deleted user".
- **Backups:** Supabase's platform backups may retain rows for a short window after
  deletion before rotating out.

---

## 6. Known gaps to disclose honestly (do not paper over these)

1. **Staff can read message content.** `messages` RLS grants a blanket read to admins.
   The privacy policy now says so.
2. **Cross-user PII at the data layer.** Migration 0023 stopped *anonymous* reads of
   email/phone. A *signed-in* user can still query them directly via PostgREST because
   column privileges cannot be row-conditional. Fixing this needs a public-safe view and
   a repoint of every public read — tracked as a follow-up. It does not change any form
   answer (email/phone are already declared as collected), but it should be closed.
3. **No age verification.** The app states 18+ but collects no date of birth and has no
   age gate. Answer the Play target-audience question accordingly; do not claim
   enforcement that does not exist.
4. **`listing_views.ip_hash` exists but is never written.** Do not declare IP collection
   on the basis of that column. Platform request logs at Supabase/Railway are a separate,
   infrastructure-level matter and are described generically in the policy.
5. **Push is collected but not delivered.** The token is stored; the sender is a mock.
   Declare the identifier, not a notification feature you cannot demonstrate.

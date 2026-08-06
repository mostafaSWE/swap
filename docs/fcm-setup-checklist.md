# FCM (Android push) setup checklist — owner action

Real Android push delivery is **owner-gated**: it needs a Firebase project and an
FCM v1 credential that only the account owner should create. Nothing here is
committed to git. Until this is done, the push **foundation** works (device
registration, outbox, worker, mock provider) but **no real notification is
delivered** — `getExpoPushTokenAsync` returns nothing on a build without FCM, and
the backend keeps outbox rows honestly `pending`.

## Architecture (already built)

```
mobile: getExpoPushTokenAsync()  ── provider "expo" ──►  POST /me/devices  (device_tokens)
notification row ──(trigger)──►  push_outbox (pending)
PushService.processOutbox()  ──►  PushProvider.send()   ← MockPushProvider today
                                        │ (real path, once FCM is wired)
                                        ▼
                          Expo Push API (exp.host/--/api/v2/push/send)
                                        ▼
                                   FCM v1  ──►  Android device
```

- Mobile mints an **Expo push token** (`src/lib/push.ts`), not a raw FCM token.
- So delivery goes **through Expo's push service**, which relays to FCM. That means
  Expo needs your **FCM v1 service-account key** on file, and the app build needs
  `google-services.json` so the native Firebase SDK initializes.

## Steps (owner)

1. **Firebase project** — https://console.firebase.google.com → *Add project*
   (name e.g. `justswap`). Google Analytics optional.
2. **Add an Android app** — package name **exactly** `me.justswap.app`
   (must match `apps/mobile/app.json` → `android.package`; do not change it).
3. **Download `google-services.json`** (App settings → *Your apps* → Android).
4. **Generate the FCM v1 service-account key** — Project settings → *Service
   accounts* → *Firebase Admin SDK* / *Cloud Messaging* → **Generate new private
   key** → a JSON file (this is the **FCM V1** credential; the legacy server key
   is deprecated — use V1).
5. **Give Expo the FCM V1 key** so it can deliver:
   `cd apps/mobile && eas credentials` → **Android** → project *justswap* →
   *Push Notifications: Manage your FCM V1 service account key* → **upload** the
   JSON from step 4. (Stored in Expo/EAS credentials, never in git.)
6. **Add `google-services.json` to the build** (gitignored):
   - place at `apps/mobile/google-services.json`, and set
     `android.googleServicesFile: "./google-services.json"` in `app.json`, **or**
   - provide it as an EAS file secret named `GOOGLE_SERVICES_JSON`
     (`eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json`)
     and reference it in `app.json`.
   Then **rebuild** the Android client (config change → new native build).
7. **Backend enable** — on the Railway **api** service set
   `PUSH_WORKER_ENABLED=true` (see `push.module.ts` `PushCron`), and **implement a
   real `ExpoPushProvider`** (`PushProvider` interface in
   `apps/api/src/modules/push/push.provider.ts`) that POSTs batches to
   `https://exp.host/--/api/v2/push/send`, reads push **tickets/receipts**, and
   maps `DeviceNotRegistered` → disable that `device_tokens` row (the worker
   already disables on `invalid`). Swap it in for `MockPushProvider` in
   `push.module.ts`. **Do not enable the worker before the provider is real** or
   rows would be marked "sent" without delivery.

## Exact secret names / locations (nothing committed)

| Secret | Where it lives | Committed? |
| --- | --- | --- |
| `google-services.json` | `apps/mobile/` (gitignored) **or** EAS file secret `GOOGLE_SERVICES_JSON` | **No** |
| FCM V1 service-account JSON | Expo/EAS project credentials (uploaded via `eas credentials`) | **No** |
| `PUSH_WORKER_ENABLED=true` | Railway **api** service variables | n/a |
| `EXPO_ACCESS_TOKEN` (only if the backend calls Expo push API with an auth token) | Railway **api** service variables | **No** |

## iOS (APNs) — blocked on the Apple Developer account

APNs delivery needs a **paid Apple Developer membership**: an APNs key (.p8) or
certificate uploaded to Expo via `eas credentials` (iOS → Push Notifications), the
`aps-environment` entitlement, and a signed device/TestFlight build. All of this is
**blocked** until the Apple account exists — see the release plan's Apple gate.

## Verify after wiring

- `eas credentials` (Android) shows the FCM V1 key present.
- A real build (not Expo Go) logs a token like `ExponentPushToken[…]`.
- `POST /me/devices` stores it; a test notification row → outbox → provider → a
  banner arrives on the device; `DeviceNotRegistered` disables a stale token.

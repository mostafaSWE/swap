# JustSwap — Email (Resend) setup & runbook

How JustSwap sends email, what the code enforces, and the **operational steps** that
must be done in the Resend + Supabase dashboards before email works in production.

---

## 1. Inventory — every email JustSwap sends

There is **one** email path in the whole monorepo: the Supabase **"Send Email" Auth
Hook** → the [`send-email`](../supabase/functions/send-email) edge function → the
Resend API (`https://api.resend.com/emails`). No app/API/mobile code sends mail
directly; in-app notifications (migration `0008`) are in-app only and never emailed.

| # | Supabase action | Product trigger | Wired in UI today |
|---|---|---|---|
| 1 | `signup` | Register → confirm email | ✅ [RegisterForm](../apps/web/src/app/[locale]/register/RegisterForm.tsx) |
| 2 | `recovery` | Forgot password → reset link | ✅ [ForgotPasswordForm](../apps/web/src/app/[locale]/forgot-password/ForgotPasswordForm.tsx) |
| 3 | `magiclink` | Passwordless sign-in | ⚪ template-ready, not triggered |
| 4 | `email_change` | Change email | ⚪ template-ready, not triggered |
| 5 | `invite` | Admin invite | ⚪ template-ready, not triggered |
| 6 | `reauthentication` | Code-based re-auth | ⚪ template-ready, not triggered |

All six render through the shared branded base template in
[`_templates.ts`](../supabase/functions/send-email/_templates.ts) (dark navy theme,
JustSwap logo mark + live-text wordmark, IBM Plex Sans Arabic w/ web-safe fallback, single column,
legal footer) and now ship with a **plain-text part** for deliverability.

---

## 2. Email-verification gate (enforced in code)

An **unverified** user cannot create a listing, propose/counter/accept a swap, send a
message, open a chat, or post a rating. Enforced at **two layers** (the API alone is
insufficient because the web client can write to Supabase directly when
`NEXT_PUBLIC_API_URL` is unset):

- **API** — [`EmailVerifiedGuard`](../apps/api/src/common/auth/email-verified.guard.ts)
  reads `email_confirmed_at` (surfaced by `AuthGuard`) and returns **403** with
  `code: "email_not_verified"`. Applied to: `POST /listings`,
  `POST /listings/:id/start-conversation`, `POST /proposals`,
  `POST /proposals/:id/counter`, `POST /proposals/:id/accept`,
  `POST /proposals/:id/rating`, `POST /conversations/:id/messages`.
  (Intentionally **not** gated: decline, cancel, dispute — declining and safety
  reporting must never be blocked.)
- **Database** — [`0012_email_verification_gate.sql`](../supabase/migrations/0012_email_verification_gate.sql)
  adds `public.is_email_verified()` to the INSERT policies for `listings`,
  `messages`, and `swap_proposals`, so direct supabase-js writes are gated too. The
  API's service-role key bypasses RLS, so the API path is unaffected.

> Belt-and-suspenders: with Supabase **"Confirm email" = ON**, an unverified user
> never receives a session at all, so neither layer is even reachable. Keep it ON.

---

## 3. Operational runbook

### Part A — Resend: verify the sending domain (do this first)
DKIM/SPF must be **Verified** before production mail reaches inboxes.

1. Resend → **Domains → Add Domain** → enter the sending domain (e.g. `justswap.app`,
   or a subdomain like `mail.justswap.app` to keep the root's SPF/DMARC clean).
2. Add the DNS records Resend shows at your DNS provider:
   - **SPF** — TXT `v=spf1 include:amazonses.com ~all` (merge into the existing SPF
     TXT if one exists — only one SPF record per domain is valid).
   - **DKIM** — the CNAME(s) Resend provides (e.g. `resend._domainkey → …resend.dev`).
   - **DMARC** (recommended) — TXT at `_dmarc.<domain>`:
     `v=DMARC1; p=none; rua=mailto:dmarc@justswap.app` (start `p=none`, tighten later).
3. Click **Verify**; wait until SPF + DKIM show **Verified**.
4. **API Keys → Create** → "Sending access" → copy the `re_…` key (shown once).

### Part B — Edge function: deploy + secrets + enable the hook
The CLI is pinned as a workspace dev dependency, so run it with `npx supabase …`
(or `pnpm exec supabase …`) — no global install needed. First authenticate + link
the project (one time):
```bash
npx supabase login                          # opens a browser to get an access token
npx supabase link --project-ref <PROJECT_REF>   # ref is in your Supabase project URL / Settings → General
```
Then deploy + set secrets:
```bash
npx supabase functions deploy send-email --no-verify-jwt
npx supabase secrets set \
  RESEND_API_KEY=re_xxx \
  SEND_EMAIL_HOOK_SECRET=v1,whsec_xxx \
  RESEND_FROM="JustSwap <noreply@justswap.app>" \
  PUBLIC_APP_URL=https://justswap.app
```
- `RESEND_FROM` must be on the **verified** domain from Part A.
- `PUBLIC_APP_URL` = the **production origin, no trailing slash**. This is the single
  most important value — it sets the confirm-link origin and footer legal links.
  (The function logs a warning if the base looks like
  localhost/`*.supabase.co`.)
- The email header keeps the logo mark, but sends it as an opaque JPEG CID
  attachment from `supabase/functions/send-email/justswap-logo-email.jpg`.
  This avoids hosted-image loading delays and removes PNG transparency, which
  Gmail/Outlook mobile dark mode can recolor unpredictably.
- Enable the hook: **Authentication → Hooks → Send Email** → point it at `send-email`.
  Supabase generates `SEND_EMAIL_HOOK_SECRET` (`v1,whsec_…`) when you enable it —
  copy it back into the `secrets set` above.

### Part C — Supabase Auth → URL Configuration
- **Site URL** = `https://justswap.app` (the fallback link base; never localhost).
- **Redirect URLs** — add `https://justswap.app/**` (and a Vercel preview wildcard if
  used). Without this, Supabase silently rewrites `redirect_to` to Site URL and users
  land on the wrong post-confirm page.
- **Authentication → Providers → Email → Confirm email = ON.**

### Part D — Apply the DB gate migration
Run [`0012_email_verification_gate.sql`](../supabase/migrations/0012_email_verification_gate.sql)
against production — paste it into the Supabase **SQL Editor** (simplest), or
`npx supabase db push` if you manage migrations through the linked CLI.

### Part E — Web host (Vercel)
Set `NEXT_PUBLIC_APP_URL=https://justswap.app` for **all** environments (inlined at
build time) and `NEXT_PUBLIC_API_URL` to the production API origin so mutations go
through the gated API.

---

## 4. Testing (Part 5 — do in production after the above)

**Test 1 — Resend delivery (proves domain + key + From):**
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_xxx' -H 'Content-Type: application/json' \
  -d '{"from":"JustSwap <noreply@justswap.app>","to":["you@example.com"],
       "subject":"JustSwap Resend delivery test","html":"<strong>It works.</strong>"}'
```
Expect HTTP 200 `{"id":"…"}`; the mail lands in the **inbox** (check spam — if it's in
spam, revisit SPF/DKIM/DMARC).

**Test 2 — end-to-end branded email + production link.** Sign up on the live site (or
trigger a password reset), then open the email and confirm:
- [ ] Branded: dark navy, JustSwap logo + wordmark, green button, Arabic renders RTL.
- [ ] Plain-text part present (view source / "show original").
- [ ] The confirm/reset link **starts with `https://justswap.app/auth/confirm?…`** —
      not `localhost`, not `*.supabase.co`.
- [ ] Clicking it verifies and lands on the same-origin `next` page (e.g. `/ar/onboarding`).
- [ ] Footer Terms/Privacy/Help links point at the production domain.

**Test 3 — the gate.** With an **unverified** account, confirm the API rejects:
create listing, propose/accept swap, send message → **403 `email_not_verified`**.
After confirming the email, the same actions succeed.

---

## 5. End-to-end checklist
- [ ] A — Resend domain Verified (SPF+DKIM), API key created
- [ ] B — `send-email` deployed; 4 secrets set; Send Email hook enabled
- [ ] C — Site URL + Redirect URLs set; Confirm email ON
- [ ] D — migration `0012` applied to production
- [ ] E — `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_URL` set on Vercel
- [ ] Tests 1–3 pass; emails land in inbox (not spam)

# Decision D-2 — Proactive Content Moderation (Apple 1.2 Pillar "filter" + Google UGC)

> **Status: AWAITING OWNER DECISION.** All *provider-independent* M4 work is built
> (report, block, support, EULA gate, SLA runbook, admin message-report context, a
> provider-agnostic moderation seam). What remains is a genuine **product/pricing/
> privacy choice** — which moderation provider(s) to adopt — that needs your call and
> (for some options) an external account/contract this session must not create.
>
> All figures below were verified from **official sources on 2026-08-05**. Re-verify
> before submission — Apple and Google both changed UGC policy within the last 6 months.

---

## 0. Why this is the only open M4 decision

The store-requirement re-check (official Apple/Google pages, 2026-08-05) confirms JustSwap
has now **built every UGC pillar except proactive filtering**:

| Store obligation | Status after M4 |
|---|---|
| EULA/terms accepted **before** posting (zero-tolerance wording) | ✅ built — mobile terms gate + `TermsGuard` + RLS (0018) |
| In-app **Report** on listing / image / message / profile | ✅ built — mobile report UI (all 4 targets) → shared queue |
| In-app **Block** user | ✅ built — profile + chat + blocked-users screen |
| **Published contact** info | ✅ built — Support screen (`support@justswap.app`) |
| **24h** report-response SLA (documented) | ✅ documented — `docs/moderation-sla.md` |
| **Proactive filter** for incoming UGC (esp. images), adult hidden by default | ⛔ **NOT built — this is D-2** |
| **CSAM** escalation + report-to-authority procedure | ⚠ documented (SLA §6); detection tooling = D-2 |
| Google Play **Child Safety Standards** declaration + public CSAE URL + point of contact | ⛔ Phase-S / owner (form + hosted URL) |

So D-2 = **pick the text + image moderation provider(s)**, decide the **CSAM** path, and
publish the **CSAE standards URL** (Phase S). Nothing else in M4 depends on it.

---

## 1. What must be moderated, and where it enters

| UGC write | Enters via | Sync/async fit |
|---|---|---|
| Listing text (title/description/wanted) | `POST/PATCH /listings` (NestJS) | sync on create/update |
| Listing images | `POST /listings/:id/images` after Storage upload | sync (or async re-scan) |
| Avatar image | direct Supabase Storage + `updateProfile` | sync on upload |
| Message text | mobile: direct-Supabase insert · web: `POST /conversations/:id/messages` | sync on send |
| Proposal note / rating comment | `POST /proposals/*` (NestJS) | sync |

**Choke-point architecture (already seeded):** a `ContentModerationService` NestJS
provider (`apps/api/src/modules/moderation/`) is the single integration seam — swap its
default no-op for a real provider and wire the call at the writes above. Mobile's
direct-Supabase message/avatar writes would need either (a) routing through the NestJS
API, or (b) a Supabase Edge Function / Storage webhook that scans on upload. **Prefer a
Storage-triggered scan for images** (covers every upload path uniformly).

---

## 2. TEXT moderation options (Arabic + English)

Cost basis: one "check" = one listing/message (~300–500 chars). Verified 2026-08-05.

| Provider | Arabic | Cost /1k · /10k | Free tier | Access | Fit / notes |
|---|---|---|---|---|---|
| **OpenAI Moderation** (`omni-moderation`) | Good (40-lang multilingual; below-EN, tune thresholds) | **$0 · $0** | Free (rate-limited) | Open self-serve | **Best free MVP.** 13 harm categories, sync, ~1–2h NestJS. No spam/scam/PII → add own regex. |
| **Hive** Text Moderation | Strong (~30 langs, adversarial-hardened, native spam/off-platform classes) | $0.50 · $5.00 | $50 credits, 100/day dev | Self-serve dev → **enterprise annual contract** for prod | Best *managed* Arabic quality; commercial gate. |
| **Google Cloud NL** `moderateText` | **Officially supported** | ~$1.50 · ~$15 (modeled; exact SKU unverified) | 5k units/mo | Open self-serve (SA JSON key) | Best pay-as-you-go with *official* Arabic. Credential handling clunkier. |
| **Azure AI Content Safety** (text) | Best-effort, **not** in its 8 trained langs | $0.38 · $3.80 | 5k records/mo | Open self-serve | Cheap + enterprise-grade, but Arabic unvalidated — real risk here. |
| **AWS Comprehend** toxicity | ❌ **English only** | $0.30 · $3.00 | 50k units/mo (12 mo) | Open self-serve | **Disqualified** for a bilingual Arabic app. |
| **Perspective API** | Yes | $0 · $0 | Free (1 QPS) | Open self-serve | ❌ **Avoid** — sunsets **Dec 31 2026**, quota frozen since Feb 2026. |

**Marketplace gap (all providers):** harm taxonomies do **not** catch scam / off-platform-contact
(phone, "WhatsApp me", payment-bypass) — the #1 classifieds abuse. Pair any choice with your own
Arabic+English regex/keyword rules (Hive is the only one with native spam/external-link classes).

## 3. IMAGE moderation options (listing photos + avatars — generic NSFW/violence/gore, **not CSAM**)

| Provider | Cost /1k · /10k | Free tier | Access | Supabase fit |
|---|---|---|---|---|
| **AWS Rekognition** DetectModerationLabels | **$1.00 · $10.00** (cheapest) | 1k/mo (12 mo) | Open self-serve | Download object → base64 bytes (S3Object can't read Supabase); 5 MB sync cap; per-label confidence. |
| **Google Vision** SafeSearch | $1.50 · $15 (**$0 if bundled with Label Detection**) | 1k/mo ongoing | Open self-serve | **Accepts a Supabase signed URL directly** — lowest effort. Coarse likelihood enums. |
| **Azure Content Safety** (image) | ~$1.50 · ~$15 (price masked; verify per-region) | 5k/mo ongoing | Open self-serve | base64 only (download first); 0–7 severity. |
| **Sightengine** | ~$2.00 · $20 (+$29/mo min) | 2k ops/mo | Open self-serve | Accepts URL; rich taxonomy + AI/deepfake detection. |
| **Hive** visual | $3.00 · $30 | 100/day + $50 | Self-serve → enterprise | Accepts URL; finest trust-&-safety taxonomy. |

## 4. CSAM — legally & technically SEPARATE from NSFW (do not conflate)

A nudity filter is **not** a CSAM control. CSAM detection = matching curated hash lists of
**known** illegal material (held by NCMEC/IWF/Thorn) or purpose-built classifiers, access-gated
to vetted platforms. **You cannot build your own hash DB** (possessing the material to hash is a crime).

| Option | What it detects | Cost | Access |
|---|---|---|---|
| **Cloudflare CSAM Scanning** | Known-hash (fuzzy), images via CF cache | **Free** (all plans) | ✅ **Open self-serve** — dashboard toggle, email only; 2024 update removed the NCMEC-credential barrier → **usable by non-US/GCC platforms**. |
| **Microsoft PhotoDNA Cloud** | Known-hash, images | Free (approved orgs) | Application + **vetting** (weeks) |
| **Google Content Safety API + CSAI Match** | Novel-material **classifier** + known-video hash | Free (partners) | Application + approval |
| **Thorn Safer** | Known-hash (+ classifier tiers) + review/report tooling | Paid, ~**$30,720/yr floor** | Partnership/contract |
| **Hive CSAM (Combined)** | Known-hash + novel classifier + text grooming | Enterprise (negotiated) | Enterprise sales |
| **NCMEC CyberTipline** | *Reporting destination* (not a detector) | Free to file | ESP registration |

**Legal baseline for a UAE/GCC marketplace:** the binding duty is **UAE Federal Decree-Law
No. 26/2025** (child digital safety): in-app notice-and-takedown, filtering, and **report CSAM to
the UAE competent authority** — *not* NCMEC (voluntary NCMEC reports remain possible where a US
nexus exists). Non-negotiable minimum regardless of tooling: **in-app report + remove/block on
discovery + preserve evidence + report to the correct authority; never download/forward the material.**
This is already codified in `docs/moderation-sla.md §6`. Every detector still requires a trained
**human reviewer** before reporting.

---

## 5. Cross-cutting considerations

- **Sync vs async:** all text/image APIs are synchronous (sub-second). MVP needs no job queue —
  scan on create/upload; add async only for batch re-scans or bursts. Recommended: **hard-block**
  high-confidence hits; **auto-flag → human queue** for mid-confidence (reuse the existing reports/admin queue).
- **False positives / override:** never auto-ban on a model score. Store per-category scores in a
  `moderation_results` table; a hit **hides pending review**, and a moderator override (the existing
  admin actions) is the source of truth. Tune thresholds on a real Arabic corpus first.
- **Privacy / residency:** text/images are sent to a third party (OpenAI/Google/AWS/etc.). Disclose
  in the privacy policy + store data-safety forms (Phase S). PhotoDNA/Cloudflare hash rather than
  retain. Prefer providers with a clear no-retention/for-training-off posture; confirm region.
- **Provider-unavailable behavior:** the moderation service must **fail-safe, not fail-open blindly** —
  on timeout/error, either (a) allow-but-flag-for-review (keeps UX flowing, human catches it) or
  (b) queue the item pending re-scan. Do **not** hard-block all posting on a provider outage. The
  reactive report/auto-hide system remains the backstop.
- **Integration complexity:** OpenAI text = lowest (~1–2h). Google Vision image via signed URL =
  lowest image effort. Rekognition/Azure need a download+bytes step. Credentials go in Railway/Supabase
  secrets (never committed). Mobile direct-Supabase writes → gate via a Storage-trigger Edge Function.

---

## 6. Recommendation (proposed — needs your sign-off)

**A. Low-cost MVP (recommended to start):**
- **Text:** OpenAI `omni-moderation` (free, sync, best free Arabic) + an Arabic/English scam/contact regex layer.
- **Images (listing + avatar):** **AWS Rekognition** ($1/1k, tunable confidence) *or* **Google Vision
  SafeSearch** (simplest Supabase wiring via signed URL). Pick Google for least effort, Rekognition for cost + threshold control.
- **CSAM:** enable **Cloudflare CSAM Scanning** immediately if traffic proxies through Cloudflare (free,
  open, non-US-friendly); **apply for Microsoft PhotoDNA** as the known-hash baseline. Keep NSFW moderation separate.
- **Est. cost at 10k listings + 50k messages/mo:** text ≈ **$0** (OpenAI) + images ≈ **$10–15/mo** (Rekognition/Google). CSAM free.

**B. Stronger managed (upgrade path if Arabic false-negatives hurt):** move the Arabic text path to
**Hive** (native spam/off-platform classes, adversarial-hardened; enterprise annual contract) or
**Google Cloud NL** (official Arabic, pay-as-you-go). Images → Hive/Sightengine for a richer taxonomy.

**C. Hybrid (pragmatic best value):** **OpenAI (free text) + Rekognition (cheap images) + Cloudflare/PhotoDNA
(free CSAM) now**, with a **thresholds-tuned human-review queue**; graduate the Arabic *text* path to
Hive/Google only if measured false-negatives justify the cost. This is the recommended shape.

**Decisions needed from you:** (1) approve the hybrid stack (or pick another); (2) authorize creating the
provider account(s) — OpenAI key, AWS/Google creds, Cloudflare toggle, PhotoDNA application; (3) confirm the
**UAE reporting authority** with counsel; (4) Phase S: host the public **CSAE standards URL** and complete
Google Play's **Child Safety Standards** declaration (a missing form **blocks Play updates**).

_Sources: OpenAI/Azure/Google/AWS/Hive/Sightengine/AWS-Rekognition/Cloudflare/PhotoDNA/Thorn official pricing
& docs; Apple Guideline 1.2 + Feb 6 2026 update; Google Play UGC (answer/9876937), Child Safety Standards
(answer/14747720), Child Endangerment (answer/9878809); 18 U.S.C. 2258A; UAE Federal Decree-Law 26/2025. All verified 2026-08-05._

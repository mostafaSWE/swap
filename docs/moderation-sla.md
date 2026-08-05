# JustSwap — Content Moderation & 24-Hour SLA Runbook

> **Purpose.** The operational procedure for acting on user reports of objectionable
> content or abusive users within **24 hours** (Apple App Store Guideline 1.2;
> Google Play UGC / Child-Safety policy). This is the source for the App-Review
> "reviewer notes" and the moderator's day-to-day playbook. It describes what the
> system does today and, explicitly, **what remains a human responsibility** — it
> does not claim automation that does not exist.

_Last updated: 2026-08-05 (Phase M4). Owner: JustSwap operations._

---

## 1. The commitment

JustSwap commits to **triage and action every report within 24 hours** of receipt,
and to a **zero-tolerance** standard for objectionable content and abusive behaviour
(stated in the Terms/EULA every user must accept before posting — see the mobile
terms gate and `TERMS_VERSION`). Objectionable content is **removed** and offending
accounts are **suspended or banned**.

There is **no automated SLA timer or paging system today** — meeting the 24-hour
window is a **human operational responsibility** (see §7). The only in-product
signal is the pending-report count on the admin dashboard (`AdminOverview.pendingReports`).

---

## 2. Where reports arrive (intake)

Every report — from web or mobile — is written to the **`public.reports`** table
with `status = 'pending'` (via `POST /api/v1/reports`, or `POST /listings/:id/report`).
Report targets and their entry points:

| Target | `target_type` | Filed from (mobile) | Filed from (web) |
|---|---|---|---|
| Listing | `listing` | Listing detail → "Report Issue" | Listing detail → ReportDialog |
| User | `user` | Public profile → "Report Issue" | Profile actions → ReportDialog |
| Message | `message` | **Long-press a chat message → Report** | (mobile-first) |
| Conversation | `conversation` | Chat header ⋮ → "Report conversation" | (mobile-first) |
| Swap dispute | `user` (`reason = "Exchange dispute"`) | Deal-close "Something went wrong" | Deal-close dispute |

**Authorization (anti-abuse):** message/conversation reports are only accepted from a
**participant** of that conversation — enforced server-side in `ReportsService`
(service-role path) **and** in the `reports` INSERT RLS (direct path, migration 0018).
A reporter cannot stack duplicate **pending** reports on the same target (partial
unique index → HTTP 409 "already reported").

**Reactive auto-hide (listings only):** an `AFTER INSERT` trigger
(`auto_hide_reported_listing`, migration 0009) sets a listing to `status = 'hidden'`
once **≥ 5 distinct** users have a pending report against it. This is a holding action,
not a resolution — a human must still review. User/message/conversation reports are
**never** auto-actioned; they always require a moderator.

---

## 3. Review queue

Moderators work the **Admin panel → Reports** (`/admin/reports`, admin-only,
`AuthGuard + AdminGuard`). The queue:

- Sorts by **severity** (derived from `reason`: `scam` > `inappropriate` > `spam` >
  `other`) or newest.
- Shows, per report: severity chip, reason, status, **reporter**, **target**, and the
  reporter's free-text description.
- For **message reports**, resolves and displays the reported message's **author**
  (`@username`, linked to their admin user page) and a **body snippet**; a deleted
  message shows `(message deleted)` — moderation degrades safely.
- The queue is capped at a 500-row working set (older rows are logged as truncated,
  not silently dropped) — a scale note, not a limit reached at current volume.

---

## 4. Moderator actions

All actions run through the admin API (`AuthGuard + AdminGuard`, service-role) and are
**audit-logged** (§5). From the report or the linked entity:

| Situation | Action | Mechanism |
|---|---|---|
| Bad **listing** | Remove / hide | `PATCH /admin/listings/:id { status: 'removed' \| 'hidden' }` |
| Minor user issue | Warn (in-app message) | `POST /admin/users/:id/message` |
| Serious/repeat abuse | **Suspend** (temporary, with reason + until) | `PATCH /admin/users/:id { is_suspended, suspended_until, suspension_reason }` |
| Egregious / illegal | **Ban** (permanent) | `PATCH /admin/users/:id { is_banned: true }` |
| Private moderator note | Add note | `POST /admin/users/:id/note` |
| Close the report | Resolve / Dismiss | `PATCH /admin/reports/:id { status }` |

**Enforcement of suspend/ban is immediate and global:** the API `AuthGuard` rejects
every authenticated request from a **banned** user, and from a **suspended** user until
`suspended_until` passes (a past timestamp is treated as lifted). A suspended/banned
user therefore cannot post, message, propose, or report.

**Always close the report** (`resolve` once actioned, `reject`/`dismiss` if not a
violation) so the pending count reflects real outstanding work and the listing
auto-hide pressure is relieved (auto-hide counts only *pending* reports).

---

## 5. Audit trail

Every moderator action inserts a row into **`public.admin_actions`**
(`admin_id`, `action_type`, `target_type`, `target_id`, `notes`, `ip`, `created_at`).
`AdminService.logAction` **throws on failure** — an action that cannot be audited does
not silently succeed. The full history is viewable at **Admin → Audit**
(`/admin/audit`). Private moderator notes live here (admin-only readable), never on the
public profile.

---

## 6. Urgent & illegal content (CSAM) — escalation

Suspected **child sexual abuse material (CSAM)** or other illegal content is handled
**out of band, immediately, ahead of the 24-hour window**:

1. **Contain:** remove the content (hide/remove listing, delete/hide the message path)
   and **ban** the account at once.
2. **Preserve:** do **not** download, forward, or redistribute the material. Preserve
   the record (report row, message id, account) for authorities — deletion of the
   underlying media is handled per legal guidance, not by casual admin deletion.
3. **Report to authorities:** for a US-hosted platform, file with the **NCMEC
   CyberTipline** (https://report.cybertip.org); report to the relevant authority in
   the operating jurisdiction (UAE/GCC) as required.
4. **Record:** log the action + escalation in `admin_actions`.

> **No automated CSAM/known-hash detection exists today.** Proactive scanning (text +
> image, including a CSAM hash-matching/reporting path) is **Decision D-2** — see
> `docs/d2-content-moderation.md`. Until a provider is live, detection of illegal
> content is **reactive** (user reports) and this escalation path is **entirely human**.

---

## 7. What remains a human responsibility (be honest)

- **Meeting the 24h window** — no SLA timer/alerting exists; monitor the queue
  (recommend at least a daily check + an on-call owner). The dashboard pending count is
  the only signal.
- **Triage decisions** — warn vs. suspend vs. ban vs. remove, and writing the
  user-facing `suspension_reason` — the queue provides severity/sort only, never a
  recommended action.
- **CSAM / illegal-content escalation** (§6) end-to-end.
- **Acting on a message report's author** — `target_id` is the message id; the queue
  links to the author, but choosing and applying the account action is manual.
- **Proactive filtering** — none until D-2 ships; today's safety net is
  report → review → action + the listing auto-hide holding action.

---

## 8. Reviewer-notes summary (for App Review)

> Users report a listing, profile, message, or conversation in ≤ 2 taps (Report on the
> item, or long-press a message). Reports enter an admin queue; moderators remove
> content and suspend/ban users within 24 hours; every action is audit-logged.
> Blocking a user (profile or chat) immediately hides their listings and prevents any
> messaging both ways. Every user must accept the zero-tolerance Terms/EULA before they
> can post. Contact: **support@justswap.me**.

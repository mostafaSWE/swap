# Task List

- `[x]` Modify translations in `en.json` and `ar.json` for "requestEdits.success" and "editsRequested".
- `[x]` Update query in `apps/web/src/lib/admin.ts` to fetch and attach `has_edit_request` to enriched listings.
- `[x]` Update `TextActionButton` in `apps/web/src/components/admin/action-kit.tsx` to handle and display the success state.
- `[x]` Update `apps/web/src/app/[locale]/admin/(panel)/listings/page.tsx` to display the "Edits Requested" badge.
- `[x]` Run compiler checks (`pnpm --filter @swap/web typecheck`) and verify changes.

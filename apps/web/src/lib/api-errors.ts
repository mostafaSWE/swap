import { SwapApiError } from "@swap/api";

/**
 * True when a backend mutation failed because the user's email isn't confirmed —
 * i.e. the API's EmailVerifiedGuard returned 403 with `code: "email_not_verified"`.
 * Lets forms show a "confirm your email" message instead of a generic error.
 */
export function isEmailNotVerifiedError(err: unknown): boolean {
  return (
    err instanceof SwapApiError &&
    err.status === 403 &&
    (err.body as { code?: string } | null | undefined)?.code === "email_not_verified"
  );
}

/**
 * True when account deletion was refused because the caller is an admin — the API
 * returns 403 with `code: "admin_cannot_self_delete"` (AccountService, mirroring the
 * guard in `delete_account()`). Permanent, so the UI must not offer a retry.
 */
export function isAdminSelfDeleteError(err: unknown): boolean {
  return (
    err instanceof SwapApiError &&
    err.status === 403 &&
    (err.body as { code?: string } | null | undefined)?.code === "admin_cannot_self_delete"
  );
}

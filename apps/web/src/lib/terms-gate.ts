import { SwapApiError } from "@swap/api";

/**
 * Bridge between the non-React API client and the React `<TermsGate>` modal.
 *
 * The API client (see `getApi`) intercepts a 403 `terms_not_accepted` from any
 * write, calls {@link requestTermsAcceptance}, and — if the user accepts — retries
 * the request. `<TermsGate>` registers the actual modal-driving function here on
 * mount. This keeps the Apple-1.2 "accept EULA before posting" gate transparent to
 * every form (no per-form wiring) and mirrors the mobile `TermsProvider` gate.
 */
type Requester = () => Promise<boolean>;

let requester: Requester | null = null;

export function setTermsRequester(fn: Requester | null): void {
  requester = fn;
}

/** Show the acceptance modal and resolve true once accepted, false if dismissed.
 *  Resolves false when no modal is mounted (SSR / before hydration). */
export function requestTermsAcceptance(): Promise<boolean> {
  return requester ? requester() : Promise.resolve(false);
}

/** True for the backend's "accept the Terms first" rejection (TermsGuard, 403). */
export function isTermsNotAccepted(err: unknown): boolean {
  return (
    err instanceof SwapApiError &&
    err.status === 403 &&
    (err.body as { code?: string } | null)?.code === "terms_not_accepted"
  );
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { TERMS_VERSION } from "@swap/config";
import type { AuthenticatedRequest } from "./auth.guard";

/**
 * Requires the caller to have accepted the CURRENT Terms/EULA version
 * (Apple Guideline 1.2 — "agreement to terms with no tolerance for objectionable
 * content" must be accepted BEFORE posting). Must run AFTER AuthGuard, which
 * populates `req.profile` (including `terms_accepted_version`).
 *
 * Apply together with AuthGuard on every UGC-posting action — create/edit a
 * listing, upload a listing image, send a message, make/counter a proposal,
 * rate a swap:
 *   `@UseGuards(AuthGuard, EmailVerifiedGuard, TermsGuard)`
 *
 * A user whose `terms_accepted_version` is NULL or below `TERMS_VERSION`
 * (@swap/config) is rejected with a 403 carrying `code: "terms_not_accepted"` so
 * the client can prompt acceptance (POST /me/terms) and retry. The DB mirrors the
 * same rule in the listings/messages INSERT RLS (migration 0018) for the
 * direct-Supabase paths — this guard is the enforcement point for the
 * service-role API paths, which bypass RLS.
 */
@Injectable()
export class TermsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accepted = req.profile?.terms_accepted_version ?? 0;
    if (accepted < TERMS_VERSION) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        code: "terms_not_accepted",
        message: "Please accept the latest Terms of Service before posting.",
      });
    }
    return true;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedRequest } from "./auth.guard";

/**
 * Requires a CONFIRMED email address. Must run AFTER AuthGuard (which populates
 * `req.user.emailVerified` from Supabase Auth's `email_confirmed_at`).
 *
 * Apply it together with AuthGuard on actions that an unverified account must not
 * perform — creating a listing, proposing a swap, opening/answering a chat:
 *   - method-level AuthGuard:     `@UseGuards(AuthGuard, EmailVerifiedGuard)`
 *   - controller-level AuthGuard: `@UseGuards(EmailVerifiedGuard)` on the method
 *     (controller guards run before method guards, so `req.user` is already set).
 *
 * The thrown 403 carries `code: "email_not_verified"` in its body so clients can
 * distinguish "confirm your email" from other forbidden errors and prompt the user.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user?.emailVerified) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        code: "email_not_verified",
        message: "Please confirm your email address before doing this.",
      });
    }
    return true;
  }
}

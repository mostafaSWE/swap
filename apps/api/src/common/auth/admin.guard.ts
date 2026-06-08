import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedRequest } from "./auth.guard";

/**
 * Requires an admin profile. Must run AFTER AuthGuard (which populates
 * `req.profile`). Apply both: `@UseGuards(AuthGuard, AdminGuard)`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.profile?.is_admin) {
      throw new ForbiddenException("Admin access required");
    }
    return true;
  }
}

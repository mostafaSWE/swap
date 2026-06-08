import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Profile } from "@swap/types";
import type { AuthenticatedRequest } from "./auth.guard";

/** Injects the authenticated user's id (from AuthGuard). */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().user.id;
  },
);

/** Injects the authenticated user's full profile (from AuthGuard). */
export const CurrentProfile = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Profile => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().profile;
  },
);

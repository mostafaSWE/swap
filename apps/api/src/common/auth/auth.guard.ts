import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import type { Request } from "express";
import type { Profile } from "@swap/types";
import { SupabaseService } from "../supabase/supabase.service";

export interface AuthenticatedRequest extends Request {
  user: { id: string; email?: string };
  profile: Profile;
}

/**
 * Authenticates the request via the `Authorization: Bearer <supabase jwt>`
 * header, loads the user's profile, and rejects suspended users.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const token = header.slice("Bearer ".length);
    const user = await this.supabase.getUserFromToken(token);
    if (!user) throw new UnauthorizedException("Invalid or expired token");

    const { data: profile } = await this.supabase.admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) throw new UnauthorizedException("Profile not found");
    if ((profile as Profile).is_suspended) {
      throw new ForbiddenException("Account suspended");
    }

    req.user = { id: user.id, email: user.email };
    req.profile = profile as Profile;
    return true;
  }
}

import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { ContentModerationService } from "../modules/moderation/moderation.module";

/** Liveness probe — unauthenticated, unprefixed (`/health`). */
@ApiTags("health")
@SkipThrottle() // load balancers / uptime checks must never be rate-limited
@Controller("health")
export class HealthController {
  constructor(private readonly moderation: ContentModerationService) {}

  @Get()
  check() {
    return {
      status: "ok",
      service: "justswap-api",
      time: new Date().toISOString(),
      // Honest signal that proactive content moderation is not yet active (D-2 open).
      moderation: this.moderation.status(),
    };
  }
}

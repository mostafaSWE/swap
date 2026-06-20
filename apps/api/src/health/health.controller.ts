import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

/** Liveness probe — unauthenticated, unprefixed (`/health`). */
@ApiTags("health")
@SkipThrottle() // load balancers / uptime checks must never be rate-limited
@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", service: "justswap-api", time: new Date().toISOString() };
  }
}

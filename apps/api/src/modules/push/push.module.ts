import { Body, Controller, Delete, Get, HttpCode, Injectable, Logger, Module, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Cron } from "@nestjs/schedule";
import { registerDeviceSchema, type RegisterDeviceInput } from "@swap/validation";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AdminGuard } from "../../common/auth/admin.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";
import { PushService } from "./push.service";
import { MockPushProvider, PUSH_PROVIDER } from "./push.provider";

@ApiTags("push")
@Controller()
class PushController {
  constructor(private readonly push: PushService) {}

  /** Register / rotate this installation's push token (after login). */
  @Post("me/devices")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  register(@CurrentUserId() userId: string, @Body(new ZodBody(registerDeviceSchema)) input: RegisterDeviceInput) {
    return this.push.registerDevice(userId, input);
  }

  /** Revoke this installation's token (on logout). */
  @Delete("me/devices/:installationId")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  revoke(@CurrentUserId() userId: string, @Param("installationId") installationId: string) {
    return this.push.revokeDevice(userId, installationId);
  }

  @Get("me/devices")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  list(@CurrentUserId() userId: string) {
    return this.push.listDevices(userId);
  }

  /** Drain the push outbox once (ops / testing). Admin-only. */
  @Post("admin/push/process")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard, AdminGuard)
  process() {
    return this.push.processOutbox();
  }
}

/**
 * Background worker. **Disabled by default** (`PUSH_WORKER_ENABLED !== "true"`) so
 * that with the mock provider (no FCM/APNs creds yet) the outbox is NOT falsely
 * marked "sent" in production — rows stay honestly `pending`. The admin
 * `POST /admin/push/process` endpoint still drives it for testing. Enable the env
 * flag only once a real provider is wired.
 */
@Injectable()
class PushCron {
  private readonly log = new Logger(PushCron.name);
  constructor(private readonly push: PushService) {}

  @Cron("*/30 * * * * *")
  async tick() {
    if (process.env.PUSH_WORKER_ENABLED !== "true") return;
    try {
      const r = await this.push.processOutbox();
      if (r.processed) this.log.log(`push tick ${JSON.stringify(r)}`);
    } catch (e) {
      this.log.error(`push tick failed: ${(e as Error).message}`);
    }
  }
}

@Module({
  controllers: [PushController],
  providers: [PushService, PushCron, { provide: PUSH_PROVIDER, useClass: MockPushProvider }],
})
export class PushModule {}

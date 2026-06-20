import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { SupabaseModule } from "./common/supabase/supabase.module";
import { HealthModule } from "./health/health.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { ListingsModule } from "./modules/listings/listings.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { ProposalsModule } from "./modules/proposals/proposals.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AdminModule } from "./modules/admin/admin.module";
import { SafetyModule } from "./modules/safety/safety.module";

@Module({
  imports: [
    // Loads root .env (monorepo) so the API shares Supabase config with the web app.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    // Baseline rate limit: 120 requests / minute / IP. Hot endpoints (uploads,
    // proposal/report creation) tighten this with a per-route @Throttle override;
    // `/health` opts out via @SkipThrottle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    SupabaseModule,
    HealthModule,
    ProfileModule,
    ListingsModule,
    CatalogModule,
    ConversationsModule,
    ProposalsModule,
    ReportsModule,
    AdminModule,
    SafetyModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

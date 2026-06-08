import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupabaseModule } from "./common/supabase/supabase.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { ListingsModule } from "./modules/listings/listings.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { VerificationModule } from "./modules/verification/verification.module";
import { AdminModule } from "./modules/admin/admin.module";
import { SafetyModule } from "./modules/safety/safety.module";

@Module({
  imports: [
    // Loads root .env (monorepo) so the API shares Supabase config with the web app.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    SupabaseModule,
    ProfileModule,
    ListingsModule,
    CatalogModule,
    ConversationsModule,
    ReportsModule,
    VerificationModule,
    AdminModule,
    SafetyModule,
  ],
})
export class AppModule {}

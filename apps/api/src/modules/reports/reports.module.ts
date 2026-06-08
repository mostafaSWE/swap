import { Body, Controller, HttpCode, Injectable, Module, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { createReportSchema, type CreateReportInput } from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { AuthGuard } from "../../common/auth/auth.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";

@Injectable()
class ReportsService {
  constructor(private readonly supabase: SupabaseService) {}
  async create(reporterId: string, input: CreateReportInput): Promise<void> {
    const { error } = await this.supabase.admin.from("reports").insert({
      reporter_id: reporterId,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      description: input.description ?? null,
      status: "pending",
    });
    if (error) throw error;
  }
}

@ApiTags("reports")
@Controller("reports")
class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodBody(createReportSchema)) input: CreateReportInput,
  ) {
    return this.reports.create(userId, input);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

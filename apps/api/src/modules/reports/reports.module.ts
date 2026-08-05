import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Post,
  UseGuards,
} from "@nestjs/common";
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
    // A message/conversation report is a SENSITIVE write: the service-role insert
    // below bypasses RLS, so authorize it here — the reporter must be a PARTICIPANT
    // of the referenced conversation (you cannot report a thread you are not in,
    // nor probe for message ids you can't see). Listing/user targets are public.
    if (input.target_type === "message") {
      const { data: message, error } = await this.supabase.admin
        .from("messages")
        .select("conversation_id")
        .eq("id", input.target_id)
        .maybeSingle();
      if (error) throw error;
      if (!message) throw new NotFoundException("Message not found");
      await this.assertParticipant(message.conversation_id, reporterId);
    } else if (input.target_type === "conversation") {
      await this.assertParticipant(input.target_id, reporterId);
    }

    const { error } = await this.supabase.admin.from("reports").insert({
      reporter_id: reporterId,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      description: input.description ?? null,
      status: "pending",
    });
    if (error) {
      // Partial unique index (0018): one PENDING report per reporter per target.
      if (error.code === "23505") {
        throw new ConflictException({
          statusCode: 409,
          error: "Conflict",
          code: "already_reported",
          message: "You have already reported this. Our team is reviewing it.",
        });
      }
      throw error;
    }
  }

  /** Throw 403 unless `userId` participates in `conversationId`. */
  private async assertParticipant(conversationId: string, userId: string): Promise<void> {
    const { count, error } = await this.supabase.admin
      .from("conversation_participants")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);
    if (error) throw error;
    if (!count) {
      throw new ForbiddenException("You can only report messages in your own conversations");
    }
  }
}

@ApiTags("reports")
@Controller("reports")
class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(202) // Accepted — the report is queued for admin review (spec §3.8).
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

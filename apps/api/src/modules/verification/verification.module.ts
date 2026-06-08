import { Body, Controller, Injectable, Module, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { VerificationRequest } from "@swap/types";
import { createVerificationSchema, type CreateVerificationInput } from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { AuthGuard } from "../../common/auth/auth.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";

@Injectable()
class VerificationService {
  constructor(private readonly supabase: SupabaseService) {}
  // TODO (Phase 2): payment + automated workflow. Admin approval is manual.
  async create(userId: string, input: CreateVerificationInput): Promise<VerificationRequest> {
    const { data, error } = await this.supabase.admin
      .from("verification_requests")
      .insert({
        user_id: userId,
        listing_id: input.listing_id ?? null,
        type: input.type,
        country_id: input.country_id ?? null,
        city_id: input.city_id ?? null,
        notes: input.notes ?? null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
}

@ApiTags("verification")
@Controller("verification-requests")
class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Post()
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodBody(createVerificationSchema)) input: CreateVerificationInput,
  ) {
    return this.verification.create(userId, input);
  }
}

@Module({
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}

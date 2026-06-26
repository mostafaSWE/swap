import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  confirmSwapSchema,
  counterProposalSchema,
  createProposalSchema,
  createRatingSchema,
  disputeSwapSchema,
  listProposalsQuerySchema,
  signConfirmationSchema,
  type ConfirmSwapInput,
  type CounterProposalInput,
  type CreateProposalInput,
  type CreateRatingInput,
  type DisputeSwapInput,
  type ListProposalsQuery,
  type SignConfirmationInput,
} from "@swap/validation";
import { AuthGuard } from "../../common/auth/auth.guard";
import { EmailVerifiedGuard } from "../../common/auth/email-verified.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";
import { ProposalsService } from "./proposals.service";

@ApiTags("proposals")
@ApiBearerAuth("supabase-jwt")
@UseGuards(AuthGuard)
@Controller("proposals")
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query(new ZodBody(listProposalsQuerySchema)) query: ListProposalsQuery,
  ) {
    return this.proposals.list(userId, query);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUserId() userId: string) {
    return this.proposals.get(id, userId);
  }

  // Proposing a swap (new offer or a counter-offer) requires a confirmed email.
  @Post()
  @UseGuards(EmailVerifiedGuard)
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodBody(createProposalSchema)) input: CreateProposalInput,
  ) {
    return this.proposals.create(userId, input);
  }

  @Post(":id/counter")
  @UseGuards(EmailVerifiedGuard)
  counter(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(counterProposalSchema)) input: CounterProposalInput,
  ) {
    return this.proposals.counter(id, userId, input);
  }

  // Accepting commits you to a swap (parallel to create/counter) — verified email.
  @Post(":id/accept")
  @UseGuards(EmailVerifiedGuard)
  accept(@Param("id") id: string, @CurrentUserId() userId: string) {
    return this.proposals.accept(id, userId);
  }

  @Post(":id/decline")
  decline(@Param("id") id: string, @CurrentUserId() userId: string) {
    return this.proposals.decline(id, userId);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string, @CurrentUserId() userId: string) {
    return this.proposals.cancel(id, userId);
  }

  /* ── Deal closing (spec §3.4) ── */

  @Post(":id/confirmation/sign")
  // Upload signing is sensitive + abusable — tighter than the global default.
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  signConfirmation(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(signConfirmationSchema)) input: SignConfirmationInput,
  ) {
    return this.proposals.signConfirmationUpload(id, userId, input.fileName);
  }

  @Post(":id/confirm")
  confirm(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(confirmSwapSchema)) input: ConfirmSwapInput,
  ) {
    return this.proposals.confirm(id, userId, input);
  }

  @Post(":id/dispute")
  dispute(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(disputeSwapSchema)) input: DisputeSwapInput,
  ) {
    return this.proposals.dispute(id, userId, input);
  }

  /* ── Ratings (post-swap reviews, spec §3.4/§3.6) ── */

  // Ratings are public review content — verified email required.
  @Post(":id/rating")
  @UseGuards(EmailVerifiedGuard)
  rate(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(createRatingSchema)) input: CreateRatingInput,
  ) {
    return this.proposals.rate(id, userId, input);
  }
}

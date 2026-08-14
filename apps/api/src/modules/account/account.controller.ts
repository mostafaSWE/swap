import { Body, Controller, Delete, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  accountDeletionRequestSchema,
  deleteAccountSchema,
  type AccountDeletionRequestInput,
  type DeleteAccountInput,
} from "@swap/validation";
import { AuthGuard } from "../../common/auth/auth.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";
import { AccountService } from "./account.service";

@ApiTags("account")
@Controller()
export class AccountController {
  constructor(private readonly account: AccountService) {}

  /**
   * Permanently delete the caller's own account (Google Play User Data policy,
   * Apple 5.1.1(v)). Deliberately NOT terms-gated: a user who refuses the updated
   * Terms must still be able to leave.
   */
  @Delete("me")
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  async deleteMe(
    @CurrentUserId() userId: string,
    @Body(new ZodBody(deleteAccountSchema)) input: DeleteAccountInput,
  ): Promise<void> {
    await this.account.deleteAccount(userId, input.reason);
  }

  /**
   * Public deletion request — no auth, for people who can no longer sign in.
   * Always 202 so the endpoint cannot be used to probe which emails are registered.
   */
  @Post("account/deletion-requests")
  @HttpCode(202)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async requestDeletion(
    @Body(new ZodBody(accountDeletionRequestSchema)) input: AccountDeletionRequestInput,
  ): Promise<{ received: true }> {
    return this.account.requestDeletion(input);
  }
}

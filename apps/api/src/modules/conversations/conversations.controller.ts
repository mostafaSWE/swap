import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { sendMessageSchema, type SendMessageInput } from "@swap/validation";
import { AuthGuard } from "../../common/auth/auth.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";
import { ConversationsService } from "./conversations.service";

@ApiTags("conversations")
@ApiBearerAuth("supabase-jwt")
@UseGuards(AuthGuard)
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.conversations.list(userId);
  }

  @Get(":id/messages")
  messages(@Param("id") id: string, @CurrentUserId() userId: string) {
    return this.conversations.messages(id, userId);
  }

  @Post(":id/messages")
  send(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(sendMessageSchema)) input: SendMessageInput,
  ) {
    return this.conversations.send(id, userId, input);
  }
}

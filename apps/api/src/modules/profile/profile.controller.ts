import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { updateProfileSchema, type UpdateProfileInput } from "@swap/validation";
import { AuthGuard } from "../../common/auth/auth.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";
import { ProfileService } from "./profile.service";

@ApiTags("profile")
@Controller()
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get("me")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  me(@CurrentUserId() userId: string) {
    return this.profiles.me(userId);
  }

  @Patch("me")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  updateMe(
    @CurrentUserId() userId: string,
    @Body(new ZodBody(updateProfileSchema)) input: UpdateProfileInput,
  ) {
    return this.profiles.updateMe(userId, input);
  }

  @Get("users/:username")
  publicProfile(@Param("username") username: string) {
    return this.profiles.publicProfile(username);
  }

  @Post("users/:id/follow")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  follow(@CurrentUserId() userId: string, @Param("id") targetId: string) {
    return this.profiles.follow(userId, targetId);
  }

  @Delete("users/:id/follow")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  unfollow(@CurrentUserId() userId: string, @Param("id") targetId: string) {
    return this.profiles.unfollow(userId, targetId);
  }
}

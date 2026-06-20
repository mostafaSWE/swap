import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  adminMessageSchema,
  adminUpdateListingSchema,
  adminUpdateUserSchema,
  adminUserNoteSchema,
  updateReportSchema,
  type AdminMessageInput,
  type AdminUpdateListingInput,
  type AdminUpdateUserInput,
  type AdminUserNoteInput,
  type UpdateReportInput,
} from "@swap/validation";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AdminGuard } from "../../common/auth/admin.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";
import { AdminService } from "./admin.service";

@ApiTags("admin")
@ApiBearerAuth("supabase-jwt")
@UseGuards(AuthGuard, AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  overview() {
    return this.admin.overview();
  }

  @Get("users")
  users() {
    return this.admin.users();
  }

  @Patch("users/:id")
  updateUser(
    @CurrentUserId() adminId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodBody(adminUpdateUserSchema)) input: AdminUpdateUserInput,
    @Ip() ip: string,
  ) {
    return this.admin.updateUser(adminId, id, input, ip);
  }

  @Post("users/:id/note")
  addUserNote(
    @CurrentUserId() adminId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodBody(adminUserNoteSchema)) input: AdminUserNoteInput,
    @Ip() ip: string,
  ) {
    return this.admin.addUserNote(adminId, id, input.note, ip);
  }

  @Post("users/:id/message")
  messageUser(
    @CurrentUserId() adminId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodBody(adminMessageSchema)) input: AdminMessageInput,
    @Ip() ip: string,
  ) {
    return this.admin.sendUserMessage(adminId, id, input.body, ip);
  }

  @Get("listings")
  listings() {
    return this.admin.listings();
  }

  @Patch("listings/:id")
  updateListing(
    @CurrentUserId() adminId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodBody(adminUpdateListingSchema)) input: AdminUpdateListingInput,
    @Ip() ip: string,
  ) {
    return this.admin.updateListing(adminId, id, input, ip);
  }

  @Post("listings/:id/request-edits")
  requestListingEdits(
    @CurrentUserId() adminId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodBody(adminMessageSchema)) input: AdminMessageInput,
    @Ip() ip: string,
  ) {
    return this.admin.requestListingEdits(adminId, id, input.body, ip);
  }

  @Get("reports")
  reports() {
    return this.admin.reports();
  }

  @Patch("reports/:id")
  updateReport(
    @CurrentUserId() adminId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodBody(updateReportSchema)) input: UpdateReportInput,
    @Ip() ip: string,
  ) {
    return this.admin.updateReport(adminId, id, input, ip);
  }

  @Get("actions")
  actions() {
    return this.admin.actions();
  }
}

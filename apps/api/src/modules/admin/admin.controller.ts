import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  adminUpdateListingSchema,
  adminUpdateUserSchema,
  updateReportSchema,
  updateVerificationSchema,
  type AdminUpdateListingInput,
  type AdminUpdateUserInput,
  type UpdateReportInput,
  type UpdateVerificationInput,
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
    @Param("id") id: string,
    @Body(new ZodBody(adminUpdateUserSchema)) input: AdminUpdateUserInput,
  ) {
    return this.admin.updateUser(adminId, id, input);
  }

  @Get("listings")
  listings() {
    return this.admin.listings();
  }

  @Patch("listings/:id")
  updateListing(
    @CurrentUserId() adminId: string,
    @Param("id") id: string,
    @Body(new ZodBody(adminUpdateListingSchema)) input: AdminUpdateListingInput,
  ) {
    return this.admin.updateListing(adminId, id, input);
  }

  @Get("reports")
  reports() {
    return this.admin.reports();
  }

  @Patch("reports/:id")
  updateReport(
    @CurrentUserId() adminId: string,
    @Param("id") id: string,
    @Body(new ZodBody(updateReportSchema)) input: UpdateReportInput,
  ) {
    return this.admin.updateReport(adminId, id, input);
  }

  @Get("verification-requests")
  verifications() {
    return this.admin.verifications();
  }

  @Patch("verification-requests/:id")
  updateVerification(
    @CurrentUserId() adminId: string,
    @Param("id") id: string,
    @Body(new ZodBody(updateVerificationSchema)) input: UpdateVerificationInput,
  ) {
    return this.admin.updateVerification(adminId, id, input);
  }

  @Get("actions")
  actions() {
    return this.admin.actions();
  }
}

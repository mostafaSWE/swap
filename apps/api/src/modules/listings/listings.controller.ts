import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  createListingSchema,
  createReportSchema,
  listingFiltersSchema,
  reorderImagesSchema,
  startConversationSchema,
  updateListingSchema,
  type CreateListingInput,
  type ListingFiltersInput,
  type ReorderImagesInput,
  type StartConversationInput,
  type UpdateListingInput,
} from "@swap/validation";
import { z } from "zod";
import { AuthGuard } from "../../common/auth/auth.guard";
import { CurrentUserId } from "../../common/auth/current-user.decorator";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";
import { ListingsService } from "./listings.service";

const reportBodySchema = createReportSchema.pick({ reason: true, description: true });
const signBodySchema = z.object({ fileName: z.string().min(1) });
const addImageBodySchema = z.object({ image_url: z.string().url() });

@ApiTags("listings")
@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  list(@Query(new ZodBody(listingFiltersSchema)) filters: ListingFiltersInput) {
    return this.listings.list(filters);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.listings.get(id);
  }

  @Post()
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodBody(createListingSchema)) input: CreateListingInput,
  ) {
    return this.listings.create(userId, input);
  }

  @Patch(":id")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  update(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(updateListingSchema)) input: UpdateListingInput,
  ) {
    return this.listings.update(id, userId, input);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  remove(@Param("id") id: string, @CurrentUserId() userId: string) {
    return this.listings.remove(id, userId);
  }

  /** Public view counter (anonymous allowed; the DB trigger bumps the count). */
  @Post(":id/view")
  @HttpCode(204)
  recordView(@Param("id") id: string) {
    return this.listings.recordView(id, null);
  }

  @Post(":id/report")
  @HttpCode(202) // Accepted — queued for admin review (spec §3.8).
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  report(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(reportBodySchema)) input: { reason: string; description?: string | null },
  ) {
    return this.listings.report(id, userId, input);
  }

  @Post(":id/start-conversation")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  startConversation(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(startConversationSchema.pick({ other_user_id: true })))
    input: Pick<StartConversationInput, "other_user_id">,
  ) {
    return this.listings.startConversation(id, userId, input.other_user_id);
  }

  @Post(":id/save")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  save(@Param("id") id: string, @CurrentUserId() userId: string) {
    return this.listings.save(id, userId);
  }

  @Delete(":id/save")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  unsave(@Param("id") id: string, @CurrentUserId() userId: string) {
    return this.listings.unsave(id, userId);
  }

  @Post(":id/images/sign")
  // Upload signing is sensitive + abusable — tighter than the global default.
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  signImage(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(signBodySchema)) input: { fileName: string },
  ) {
    return this.listings.signImageUpload(id, userId, input.fileName);
  }

  @Post(":id/images")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  addImage(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(addImageBodySchema)) input: { image_url: string },
  ) {
    return this.listings.addImage(id, userId, input.image_url);
  }

  @Patch(":id/images/order")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  reorderImages(
    @Param("id") id: string,
    @CurrentUserId() userId: string,
    @Body(new ZodBody(reorderImagesSchema)) input: ReorderImagesInput,
  ) {
    return this.listings.reorderImages(id, userId, input.image_ids);
  }

  @Delete(":id/images/:imageId")
  @HttpCode(204)
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard)
  removeImage(
    @Param("id") id: string,
    @Param("imageId") imageId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.listings.removeImage(id, userId, imageId);
  }
}

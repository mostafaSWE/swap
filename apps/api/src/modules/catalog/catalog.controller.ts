import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  upsertCategorySchema,
  upsertCitySchema,
  upsertCountrySchema,
  type UpsertCategoryInput,
  type UpsertCityInput,
  type UpsertCountryInput,
} from "@swap/validation";
import { AuthGuard } from "../../common/auth/auth.guard";
import { AdminGuard } from "../../common/auth/admin.guard";
import { ZodBody } from "../../common/pipes/zod-validation.pipe";
import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /* ── Public reads ── */
  @Get("categories")
  categories() {
    return this.catalog.categories();
  }

  @Get("countries")
  countries() {
    return this.catalog.countries();
  }

  @Get("countries/:countryId/cities")
  cities(@Param("countryId") countryId: string) {
    return this.catalog.cities(countryId);
  }

  /* ── Admin management ── */
  @Post("admin/categories")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard, AdminGuard)
  createCategory(@Body(new ZodBody(upsertCategorySchema)) input: UpsertCategoryInput) {
    return this.catalog.createCategory(input);
  }

  @Patch("admin/categories/:id")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard, AdminGuard)
  updateCategory(
    @Param("id") id: string,
    @Body(new ZodBody(upsertCategorySchema.partial())) input: Partial<UpsertCategoryInput>,
  ) {
    return this.catalog.updateCategory(id, input);
  }

  @Post("admin/countries")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard, AdminGuard)
  createCountry(@Body(new ZodBody(upsertCountrySchema)) input: UpsertCountryInput) {
    return this.catalog.createCountry(input);
  }

  @Post("admin/cities")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard, AdminGuard)
  createCity(@Body(new ZodBody(upsertCitySchema)) input: UpsertCityInput) {
    return this.catalog.createCity(input);
  }

  @Patch("admin/cities/:id")
  @ApiBearerAuth("supabase-jwt")
  @UseGuards(AuthGuard, AdminGuard)
  updateCity(
    @Param("id") id: string,
    @Body(new ZodBody(upsertCitySchema.partial())) input: Partial<UpsertCityInput>,
  ) {
    return this.catalog.updateCity(id, input);
  }
}

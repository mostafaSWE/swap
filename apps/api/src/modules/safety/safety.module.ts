import { Controller, Get, Module, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SAFETY_DISCLAIMER } from "@swap/config";
import type { Locale } from "@swap/types";

@ApiTags("safety")
@Controller("safety")
class SafetyController {
  /** Centralized platform-responsibility disclaimer (shared with web + mobile). */
  @Get()
  disclaimer(@Query("locale") locale?: string) {
    const loc: Locale = locale === "en" ? "en" : "ar";
    return { locale: loc, ...SAFETY_DISCLAIMER[loc] };
  }
}

@Module({ controllers: [SafetyController] })
export class SafetyModule {}

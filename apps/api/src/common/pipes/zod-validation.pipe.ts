import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/**
 * Validates/parses request data against a shared zod schema (@swap/validation),
 * so the API and the web/mobile forms enforce identical rules.
 *
 * Usage: `@Body(new ZodBody(createListingSchema)) input: CreateListingInput`
 */
export class ZodBody<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        error: "ValidationError",
      });
    }
    return result.data;
  }
}

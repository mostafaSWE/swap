import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Input validation is handled per-route by the shared zod schemas
  // (ZodBody pipe + @swap/validation), so no global class-validator pipe.
  app.setGlobalPrefix("api/v1");

  const config = new DocumentBuilder()
    .setTitle("Swap API")
    .setDescription("Backend API for the Swap barter marketplace. Consumed by the web and mobile apps.")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "supabase-jwt")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  new Logger("Bootstrap").log(`Swap API listening on http://localhost:${port}/api/v1  (docs: /api/docs)`);
}

void bootstrap();

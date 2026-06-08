import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1) next-intl handles locale detection / redirects and builds the response.
  const response = intlMiddleware(request);
  // 2) Supabase refreshes the auth session cookies on that same response.
  return updateSession(request, response);
}

export const config = {
  // Match all paths except Next internals, static files, and API routes.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed the middleware boundary file to `proxy.ts`.
// We attach Clerk's session here but enforce authorization in layouts and route
// handlers (so pages can redirect to /sign-in or /onboarding, and API routes
// can return JSON 401s) rather than via blanket middleware protection.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on everything EXCEPT Next.js internals, static files, and the health
    // probe (so container healthchecks never depend on Clerk being configured).
    // /api/v1/* is still matched so route handlers can read the Clerk session.
    "/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

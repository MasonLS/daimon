import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/signin"]);
const isPublicPage = createRouteMatcher(["/"]); // Landing page is public
const isProtectedRoute = createRouteMatcher(["/:path*"]); // Document pages are protected

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // Redirect authenticated users away from signin page
  if (isSignInPage(request)) {
    if (await convexAuth.isAuthenticated()) {
      return nextjsMiddlewareRedirect(request, "/");
    }
    return;
  }

  // Allow public pages (landing page) for everyone
  if (isPublicPage(request)) {
    return;
  }

  // Protect document routes - redirect unauthenticated users to signin
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

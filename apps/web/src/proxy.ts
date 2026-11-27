import { NextResponse, type NextRequest } from "next/server";
import { businessRoutes } from "@/config/site";
import { updateSession } from "@/lib/supabase/proxy";

// Business portal routing guard:
// - signed out: portal and onboarding pages -> /business/login
// - signed in without an active business membership -> onboarding
// - signed in with one -> dashboard (from welcome, sign up, login, onboarding)
// Verify, forgot / reset password, terms and the auth callback are never redirected.

const SIGNED_OUT_ONLY = new Set<string>([businessRoutes.welcome, businessRoutes.signup, businessRoutes.login]);
const OPEN = new Set<string>([
  businessRoutes.verify,
  businessRoutes.forgotPassword,
  businessRoutes.resetPassword,
  businessRoutes.terms,
  businessRoutes.authCallback,
]);

export async function proxy(request: NextRequest) {
  const { response, supabase, userId } = await updateSession(request);
  const path = request.nextUrl.pathname.replace(/\/+$/, "") || "/";

  if (path === "/") return redirect(request, response(), businessRoutes.welcome);
  if (!path.startsWith(businessRoutes.welcome) || OPEN.has(path)) return response();
  // Only page loads are routed. Server Actions POST to the current page URL and
  // must reach it even when the guard would now send the user elsewhere.
  if (request.method !== "GET" && request.method !== "HEAD") return response();

  const isOnboarding = path.startsWith("/business/onboarding");
  const isSignedOutOnly = SIGNED_OUT_ONLY.has(path);

  if (!userId) {
    return isSignedOutOnly ? response() : redirect(request, response(), businessRoutes.login);
  }

  const { data } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);
  const hasBusiness = (data?.length ?? 0) > 0;
  const home = hasBusiness ? businessRoutes.dashboard : businessRoutes.onboardingType;

  if (isSignedOutOnly) return redirect(request, response(), home);
  if (isOnboarding && hasBusiness) return redirect(request, response(), businessRoutes.dashboard);
  if (!isOnboarding && !hasBusiness) return redirect(request, response(), businessRoutes.onboardingType);
  return response();
}

/** Redirect that keeps any refreshed session cookies. */
function redirect(request: NextRequest, from: NextResponse, to: string) {
  const res = NextResponse.redirect(new URL(to, request.url));
  from.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

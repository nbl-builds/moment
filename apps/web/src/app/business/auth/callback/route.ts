import { NextResponse, type NextRequest } from "next/server";
import { businessRoutes } from "@/config/site";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing page for Supabase email links (password reset). Exchanges the PKCE
 * `code` for a session, then continues to `next` (same-origin paths only).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? businessRoutes.resetPassword;
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : businessRoutes.resetPassword;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  const failed = new URL(businessRoutes.forgotPassword, origin);
  failed.searchParams.set("error", "link");
  return NextResponse.redirect(failed);
}

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { verifiedSessionCookieName } from "@/lib/auth-assurance";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const passwordReset = requestUrl.searchParams.get("next") === "/reset-password";
  const supabase = await createClient();
  if (!supabase || !code) return NextResponse.redirect(new URL("/login?error=verification", requestUrl.origin));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=verification", requestUrl.origin));
  (await cookies()).delete(verifiedSessionCookieName());
  if (passwordReset) return NextResponse.redirect(new URL("/reset-password", requestUrl.origin));
  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) return new NextResponse("Email confirmed, but sign-in could not be reset. Please try again later.", { status: 503 });
  return NextResponse.redirect(new URL("/login?confirmed=1", requestUrl.origin));
}

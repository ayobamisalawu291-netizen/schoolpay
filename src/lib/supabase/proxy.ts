import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isVerifiedSessionCookie, verifiedSessionCookieName } from "@/lib/auth-assurance";

function needsEmailOtp(pathname: string) {
  return /^\/(?:parent|school|admin)(?:\/|$)/.test(pathname) || /^\/api\/(?:parent|school)(?:\/|$)/.test(pathname);
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  // Verify the token before treating it as a valid user session.
  const { data } = await supabase.auth.getClaims();
  if (needsEmailOtp(request.nextUrl.pathname) && !isVerifiedSessionCookie(
    request.cookies.get(verifiedSessionCookieName())?.value,
    data?.claims?.sub,
    data?.claims?.session_id
  )) {
    const blocked = request.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Sign in and verify the code sent to your email." }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => blocked.cookies.set(cookie));
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = response.headers.get(header);
      if (value) blocked.headers.set(header, value);
    }
    return blocked;
  }
  return response;
}

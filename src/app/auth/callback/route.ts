import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext === "/reset-password" ? "/reset-password" : "/parent/dashboard";
  const supabase = await createClient();
  if (!supabase || !code) return NextResponse.redirect(new URL("/login?error=verification", requestUrl.origin));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=verification", requestUrl.origin));
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

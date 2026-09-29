import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/roles";

export type AccessResult = { status: "unconfigured" } | { status: "signed_out" } | { status: "forbidden" } | { status: "allowed"; role: AppRole };

export async function requireRole(allowed: readonly AppRole[]): Promise<AccessResult> {
  const supabase = await createClient();
  if (!supabase) return { status: "unconfigured" };
  const { data: jwtData, error } = await supabase.auth.getClaims();
  const claims = jwtData?.claims;
  const userId = claims?.sub;
  if (error || !userId) return { status: "signed_out" };
  const { data, error: profileError } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profileError || !data) return { status: "forbidden" };
  return allowed.includes(data.role as AppRole) ? { status: "allowed", role: data.role as AppRole } : { status: "forbidden" };
}

export function redirectForAccess(status: Exclude<AccessResult, { status: "allowed" }>) {
  if (status.status === "signed_out") redirect("/login");
  if (status.status === "forbidden") redirect("/forbidden");
}

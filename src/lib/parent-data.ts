import { createClient } from "@/lib/supabase/server";

export type ParentSupabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;
export type ParentContext = { status: "allowed"; supabase: ParentSupabase; userId: string; profile: ParentProfile | null; profileComplete: boolean };
export type ParentProfile = {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  preferred_contact_method: "email" | "phone" | null;
  email_updates: boolean | null;
  onboarding_step: number;
  onboarding_completed_at: string | null;
};

export type ParentContextResult = ParentContext
  | { status: "unconfigured" }
  | { status: "signed_out" }
  | { status: "forbidden" }
  | { status: "unavailable" };

export function isParentProfileComplete(profile: ParentProfile | null): boolean {
  return Boolean(profile?.first_name?.trim() && profile.last_name?.trim() && profile.phone?.trim() && profile.address_line1?.trim() && profile.city?.trim() && profile.state?.trim() && profile.zip_code?.trim() && profile.preferred_contact_method && profile.onboarding_completed_at);
}

export async function getParentContext(): Promise<ParentContextResult> {
  const supabase = await createClient();
  if (!supabase) return { status: "unconfigured" };

  const { data: claimData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  if (claimsError || !userId) return { status: "signed_out" };

  const { data: account, error: accountError } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (accountError) return { status: "unavailable" };
  if (!account || account.role !== "parent") return { status: "forbidden" };

  const { data: profile, error: profileError } = await supabase.from("parent_profiles").select("first_name,middle_name,last_name,phone,address_line1,address_line2,city,state,zip_code,preferred_contact_method,email_updates,onboarding_step,onboarding_completed_at").eq("user_id", userId).maybeSingle();
  if (profileError) return { status: "unavailable" };
  const safeProfile = (profile ?? null) as ParentProfile | null;
  return { status: "allowed", supabase, userId, profile: safeProfile, profileComplete: isParentProfileComplete(safeProfile) };
}

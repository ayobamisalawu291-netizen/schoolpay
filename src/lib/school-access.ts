import { createClient } from "@/lib/supabase/server";

export type SchoolRole = "school_owner" | "school_admin" | "school_finance" | "school_staff";
export type SchoolMembership = {
  school_id: string;
  role: SchoolRole;
  school: {
    id: string;
    slug: string;
    name: string;
    status: string;
    city: string | null;
    state: string | null;
  };
};

export type SchoolContext = {
  status: "allowed";
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  userId: string;
  memberships: SchoolMembership[];
  membership: SchoolMembership | null;
};

export type SchoolContextResult = SchoolContext
  | { status: "unconfigured" | "signed_out" | "forbidden" | "unavailable" };

export async function getSchoolContext(requestedSchoolId?: string): Promise<SchoolContextResult> {
  const supabase = await createClient();
  if (!supabase) return { status: "unconfigured" };

  const { data: jwtData, error: claimsError } = await supabase.auth.getClaims();
  const userId = jwtData?.claims?.sub;
  if (claimsError || !userId) return { status: "signed_out" };

  if (requestedSchoolId && !/^[0-9a-f-]{36}$/i.test(requestedSchoolId)) return { status: "forbidden" };
  const { data: rawMemberships, error: membershipError } = await supabase
    .from("school_members")
    .select("school_id,role")
    .eq("user_id", userId);
  if (membershipError) return { status: "unavailable" };
  const memberships = (rawMemberships ?? []) as { school_id: string; role: SchoolRole }[];
  if (!memberships.length) return { status: "forbidden" };

  const schoolIds = memberships.map((row) => row.school_id);
  if (requestedSchoolId && !schoolIds.includes(requestedSchoolId)) return { status: "forbidden" };

  const { data: schools, error: schoolsError } = await supabase
    .from("schools")
    .select("id,slug,name,status,city,state")
    .in("id", requestedSchoolId ? [requestedSchoolId] : schoolIds)
    .order("name");
  if (schoolsError) return { status: "unavailable" };

  const schoolById = new Map((schools ?? []).map((school) => [school.id, school]));
  const authorized = memberships.flatMap((row) => {
    const school = schoolById.get(row.school_id);
    return school ? [{ school_id: row.school_id, role: row.role, school }] : [];
  });
  if (!authorized.length) return { status: "unavailable" };

  const membership = requestedSchoolId
    ? authorized.find((row) => row.school_id === requestedSchoolId) ?? null
    : authorized.length === 1 ? authorized[0] : null;
  return { status: "allowed", supabase, userId, memberships: authorized, membership };
}

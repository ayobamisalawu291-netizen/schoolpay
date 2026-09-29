import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { getSchoolContext } from "@/lib/school-access";

export default async function SchoolProfilePage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const params = await searchParams;
  const context = await getSchoolContext(params.school);
  if (context.status === "signed_out") redirect("/login");
  if (context.status !== "allowed" || !context.membership) return <DashboardShell audience="school" title="School profile"><AccessNotice title="School access required" detail="A verified membership is required to view school profile details."/></DashboardShell>;
  const { data: school, error } = await context.supabase.from("schools").select("name,slug,status,directory_visible,address_line1,city,state,zip_code,website,public_phone,school_type,grades_served").eq("id", context.membership.school_id).maybeSingle();
  const query = `?school=${encodeURIComponent(context.membership.school_id)}`;
  return <DashboardShell audience="school" title="School profile">
    <div className="dashboard-welcome"><h2>School information</h2><p>These details define the school account created after operations review. Directory visibility is controlled separately after verification.</p></div>
    {error || !school ? <div className="empty-state"><h2>School profile unavailable.</h2><p>We couldn't load this school's public details.</p></div> : <section className="dash-panel school-profile-card">
      <span className={`status-tag ${school.directory_visible ? "status-success" : ""}`}>{school.directory_visible ? "Public directory listing active" : `Private · ${school.status.replaceAll("_", " ")}`}</span>
      <h2>{school.name}</h2><p>{[school.address_line1, school.city, school.state, school.zip_code].filter(Boolean).join(" · ")}</p>
      <dl className="school-profile-details">
        <div><dt>School type</dt><dd>{school.school_type || "Not specified"}</dd></div>
        <div><dt>Website</dt><dd>{school.website ? <a href={school.website} target="_blank" rel="noreferrer">{school.website}</a> : "Not provided"}</dd></div>
        <div><dt>Public phone</dt><dd>{school.public_phone || "Not provided"}</dd></div>
        <div><dt>Grades served</dt><dd>{school.grades_served?.length ? school.grades_served.join(", ") : "Not provided"}</dd></div>
        <div><dt>SchoolPay directory slug</dt><dd>{school.slug}</dd></div>
      </dl>
      <p className="parent-form-note">Profile edits, public listing activation, settlement details, and financial settings require a separate operations review.</p>
      <Link className="button button-secondary" href={`/school/dashboard${query}`}>Back to school dashboard</Link>
    </section>}
  </DashboardShell>;
}

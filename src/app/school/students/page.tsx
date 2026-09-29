import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GraduationCap, Plus, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { getSchoolContext } from "@/lib/school-access";

export default async function SchoolStudentsPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const params = await searchParams;
  const context = await getSchoolContext(params.school);
  if (context.status === "signed_out") redirect("/login");
  if (context.status !== "allowed") return <DashboardShell audience="school" title="Students"><AccessNotice title="School records unavailable" detail="A verified school membership and configured database are required to view student records."/></DashboardShell>;
  if (!context.membership) return <DashboardShell audience="school" title="Choose a school"><div className="parent-card-grid school-record-grid">{context.memberships.map((item) => <Link key={item.school_id} className="parent-record-card" href={`/school/students?school=${item.school_id}`}><span className="record-icon"><GraduationCap size={19}/></span><div className="record-card-copy"><h2>{item.school.name}</h2><p>{[item.school.city, item.school.state].filter(Boolean).join(", ")}</p></div><span className="record-card-link">Open <ArrowRight size={15}/></span></Link>)}</div></DashboardShell>;

  const { supabase, membership } = context;
  const { data: students, error } = await supabase.from("student_records").select("id,student_number,first_name,last_name,grade,active,created_at").eq("school_id", membership.school_id).order("created_at", { ascending: false }).limit(100);
  const canAdd = ["school_owner", "school_admin"].includes(membership.role);
  const query = `?school=${encodeURIComponent(membership.school_id)}`;
  return <DashboardShell audience="school" title="Students">
    <div className="dashboard-welcome"><h2>{membership.school.name}</h2><p>Private school records, visible only to authorized staff at this school. The list is limited to the latest 100 records.</p></div>
    {canAdd && <div className="parent-form-actions"><Link className="button button-primary" href={`/school/students/new${query}`}><Plus size={16}/>Add student</Link></div>}
    {error ? <div className="empty-state"><span className="empty-icon"><Users size={20}/></span><h2>Student records unavailable.</h2><p>We couldn't load this school's records. Please try again later.</p></div> : students?.length ? <div className="parent-card-grid school-record-grid">
      {students.map((student) => <article className="parent-record-card" key={student.id}><span className="record-icon"><GraduationCap size={19}/></span><div className="record-card-copy"><h2>{student.first_name} {student.last_name}</h2><p>Student number · {student.student_number}</p><small>{[student.grade, student.active ? "Active" : "Inactive"].filter(Boolean).join(" · ")}</small></div></article>)}
    </div> : <div className="empty-state"><span className="empty-icon"><Users size={20}/></span><h2>No student records yet.</h2><p>Only school owners and administrators can add a student record. No sample students are inserted.</p>{canAdd && <Link className="button button-primary" href={`/school/students/new${query}`}>Add the first student</Link>}</div>}
  </DashboardShell>;
}

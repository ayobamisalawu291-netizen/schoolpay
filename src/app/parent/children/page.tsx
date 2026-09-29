import Link from "next/link";
import { ArrowRight, Plus, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ChildrenPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="My Children" status={context.status}/>;
  const { data, error } = await context.supabase.from("children")
    .select("id,first_name,middle_name,last_name,grade,created_at")
    .eq("parent_id", context.userId).is("archived_at", null).order("created_at", { ascending: false }).limit(100);

  return <DashboardShell audience="parent" title="My Children">
    {error ? <div className="form-message error" role="alert">We couldn't load your children. Please refresh and try again.</div> : data?.length ? <div className="parent-card-grid">
      {data.map((child) => <article className="parent-record-card" key={child.id}>
        <span className="record-icon"><Users size={19}/></span>
        <div className="record-card-copy"><h2>{child.first_name} {child.middle_name ? `${child.middle_name} ` : ""}{child.last_name}</h2><p>{child.grade || "Grade not added"}</p></div>
        <Link className="record-card-link" href={`/parent/children/${child.id}`}>View child <ArrowRight size={15}/></Link>
      </article>)}
      <Link className="add-record-card" href="/parent/children/new"><Plus size={18}/>Add another child</Link>
    </div> : <div className="empty-state"><span className="empty-icon"><Users size={21}/></span><h2>You haven't added any children yet.</h2><p>Add a child to connect them to a participating school and their official tuition invoice.</p><Link className="button button-primary" href="/parent/children/new"><Plus size={16}/>Add a child</Link></div>}
  </DashboardShell>;
}

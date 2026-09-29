import Link from "next/link";
import { Search, School } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";
import { usStateCodes } from "@/lib/parent-validation";

export default async function ParentSchoolsPage({ searchParams }: { searchParams: Promise<{ name?: string; city?: string; state?: string; zip?: string }> }) {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Find a School" status={context.status}/>;
  const params = await searchParams;
  const name = (params.name ?? "").trim().slice(0, 100).replace(/[%_\\,()]/g, "");
  const city = (params.city ?? "").trim().slice(0, 100).replace(/[%_\\,()]/g, "");
  const zip = (params.zip ?? "").trim().slice(0, 10).replace(/[^0-9-]/g, "");
  const state = usStateCodes.includes(params.state as typeof usStateCodes[number]) ? params.state! : "VA";
  let query = context.supabase.from("schools").select("id,slug,name,address_line1,city,state,zip_code,website,public_phone,school_type,grades_served,description").eq("status", "active").eq("directory_visible", true).eq("state", state).order("name").limit(100);
  if (name) query = query.ilike("name", `%${name}%`);
  if (city) query = query.ilike("city", `%${city}%`);
  if (zip) query = query.ilike("zip_code", `${zip}%`);
  const { data, error } = await query;

  return <DashboardShell audience="parent" title="Find a School">
    <div className="parent-page-intro"><p>Search approved participating schools. A school selection is only a request to confirm your child's enrollment.</p><span className="market-pill">Initial market · Virginia</span></div>
    <form action="/parent/schools" className="school-search-form">
      <label className="parent-field">School name<input name="name" defaultValue={name} maxLength={100} placeholder="Search school names"/></label>
      <label className="parent-field">City<input name="city" defaultValue={city} maxLength={100} placeholder="City"/></label>
      <label className="parent-field">State<select name="state" defaultValue={state}>{usStateCodes.map((code) => <option key={code}>{code}</option>)}</select></label>
      <label className="parent-field">ZIP code<input name="zip" defaultValue={zip} inputMode="numeric" maxLength={10} placeholder="ZIP code"/></label>
      <button className="button button-primary"><Search size={15}/>Search schools</button>
    </form>
    <div className="section-card-heading directory-heading"><div><span className="section-card-icon"><School size={17}/></span><h2>Participating schools</h2></div><Link className="subtle-link" href="/parent/school-requests">My school requests</Link></div>
    {error ? <div className="empty-state"><span className="empty-icon"><School size={21}/></span><h2>School search unavailable.</h2><p>We couldn't load the approved school directory. Please try again later.</p></div> : data?.length ? <div className="parent-card-grid school-card-grid">
      {data.map((school) => <article className="parent-record-card school-record-card" key={school.id}>
        <span className="record-icon"><School size={19}/></span><div className="record-card-copy"><h2>{school.name}</h2><p>{[school.city, school.state, school.zip_code].filter(Boolean).join(" · ")}</p><small>{school.school_type || "Participating school"}</small></div>
        <div className="record-card-actions"><Link className="record-card-link" href={`/schools/${school.slug}`}>View profile <span>→</span></Link><span className="status-tag status-success">SchoolPay partner</span></div>
      </article>)}
    </div> : <div className="empty-state"><span className="empty-icon"><School size={21}/></span><h2>No participating schools found.</h2><p>Try another search or request that we review your child's school.</p><Link className="button button-primary" href="/parent/schools/request">Request a School</Link></div>}
    <div className="request-school-callout"><div><strong>Can't find your school?</strong><p>Send a request for SchoolPay to review. It will not be added automatically.</p></div><Link className="button button-secondary" href="/parent/schools/request">Request a School</Link></div>
  </DashboardShell>;
}

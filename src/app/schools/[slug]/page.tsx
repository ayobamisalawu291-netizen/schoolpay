import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, School } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export default async function SchoolDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data, error } = await supabase.from("schools")
    .select("id,name,address_line1,city,state,zip_code,website,public_phone,school_type,grades_served,description,status,directory_visible")
    .eq("slug", slug).eq("status", "active").eq("directory_visible", true).maybeSingle();
  if (error || !data) notFound();
  const { data: branches } = await supabase.from("school_branches")
    .select("id,name,address_line1,city,state,zip_code,public_phone")
    .eq("school_id", data.id).order("name");

  return <><SiteHeader/><main>
    <PageHero eyebrow="Participating school · Virginia launch" title={data.name}>{[data.city,data.state,data.zip_code].filter(Boolean).join(", ")} {data.description ? ` · ${data.description}` : ""}</PageHero>
    <section className="content-section"><div className="container">
      <div className="invoice-detail-grid">
        <section className="parent-section-card"><div className="section-card-heading"><div><span className="section-card-icon"><School size={17}/></span><h2>School information</h2></div><span className="status-tag status-success">Participating school</span></div>
          <dl className="invoice-summary-list">
            {data.address_line1 && <div><dt>Street address</dt><dd>{data.address_line1}</dd></div>}
            <div><dt>City, state, ZIP</dt><dd>{[data.city,data.state,data.zip_code].filter(Boolean).join(", ") || "Not provided"}</dd></div>
            {data.school_type && <div><dt>School type</dt><dd>{data.school_type}</dd></div>}
            {data.grades_served.length > 0 && <div><dt>Grades served</dt><dd>{data.grades_served.join(", ")}</dd></div>}
            {data.website && <div><dt>Website</dt><dd><a href={data.website} target="_blank" rel="noreferrer">{data.website}</a></dd></div>}
            {data.public_phone && <div><dt>Public phone</dt><dd><a href={`tel:${data.public_phone}`}>{data.public_phone}</a></dd></div>}
          </dl>
        </section>
        <section className="parent-section-card"><div className="section-card-heading"><div><span className="section-card-icon"><MapPin size={17}/></span><h2>Campuses</h2></div></div>
          {branches?.length ? <div className="record-list">{branches.map((branch) => <article className="record-list-item" key={branch.id}><div><strong>{branch.name}</strong><small>{[branch.address_line1,branch.city,branch.state,branch.zip_code].filter(Boolean).join(" · ") || "Address not provided"}{branch.public_phone ? ` · ${branch.public_phone}` : ""}</small></div></article>)}</div> : <div className="inline-empty"><strong>No campus details listed.</strong></div>}
        </section>
      </div>
      <div className="obligation-callout" style={{marginTop:24}}><strong>A directory listing is not student confirmation.</strong><p>Your school selection does not confirm attendance or verify a tuition invoice. The school must confirm those details before they can be treated as verified.</p></div>
      <div style={{textAlign:"center",marginTop:24}}><Link className="button button-primary" href="/register">Create a parent account</Link></div>
    </div></section>
  </main><SiteFooter/></>;
}

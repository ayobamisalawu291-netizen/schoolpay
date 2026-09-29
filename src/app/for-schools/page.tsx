import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ClipboardCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "For schools",
  description: "Learn how SchoolPay plans to work with Virginia schools.",
  alternates: { canonical: "/for-schools" }
};

export default function Schools() {
  return <><SiteHeader/><main>
    <PageHero eyebrow="For schools" title="School confirmation comes first.">SchoolPay is preparing parent tools for managing child and tuition information in Virginia. School partners will review and confirm records before SchoolPay treats them as verified.</PageHero>
    <section className="content-section"><div className="container"><div className="value-grid">
      <article className="value-card"><span className="value-icon"><ClipboardCheck/></span><h3>Review school details</h3><p>Parents can request that SchoolPay contact a school that is not yet in the directory. The request does not publish or approve a listing.</p></article>
      <article className="value-card"><span className="value-icon"><Building2/></span><h3>Keep school control</h3><p>A parent's school selection is only a request for confirmation. It does not create a student record or confirm attendance.</p></article>
      <article className="value-card"><span className="value-icon"><CheckCircle2/></span><h3>Join through review</h3><p>School directory listings are added only after SchoolPay completes its review process.</p></article>
    </div><div className="content-narrow" style={{marginTop:45}}><h2>Interested in partnering?</h2><p>Share your interest so the SchoolPay team can follow up about school details and the review process.</p><Link className="button button-primary" href="/contact">Contact SchoolPay <ArrowRight size={15}/></Link></div></div></section>
  </main><SiteFooter/></>;
}

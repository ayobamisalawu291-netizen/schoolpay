import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = { title: "Privacy notice", description: "How SchoolPay plans to handle personal information.", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return <><SiteHeader/><main><PageHero eyebrow="Privacy" title="Your information deserves care.">This foundation describes the privacy principles SchoolPay is being built around. A final notice must be reviewed and approved by privacy counsel before any live service launches.</PageHero><section className="content-section"><div className="container content-narrow">
    <h2>Information and purpose</h2><p>SchoolPay may process parent and guardian account details, child and school information, and tuition invoices to provide the parent tools described on this site. Information should be collected only for clear service, safety, and legal purposes.</p>
    <h2>Access and safeguards</h2><p>Information access is designed around role and responsibility. Invoice documents are kept in private storage and can be opened by the owning parent account through temporary download links. Access and important changes are recorded for review.</p>
    <h2>Children's information</h2><p>Child information is used to organize a parent's school records and request a school connection. A parent's selection does not verify attendance or create a school record.</p>
    <h2>Your choices and rights</h2><p>Before a live launch, SchoolPay must publish contact details, retention periods, purposes, applicable rights, and a process to make a privacy request. Those details require U.S. privacy review.</p>
    <h2>Questions</h2><p>The privacy contact channel must be set up before launch. For now, please review the <a href="/help">Help centre</a>.</p>
  </div></section></main><SiteFooter/></>;
}

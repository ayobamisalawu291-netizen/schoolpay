import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2, HeartHandshake, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "For parents",
  description: "Organize your child's school details and manage tuition invoices with SchoolPay.",
  alternates: { canonical: "/for-parents" }
};

export default function Parents() {
  return <><SiteHeader/><main>
    <PageHero eyebrow="For parents and guardians" title="Keep the school year organized.">SchoolPay's U.S. parent portal helps you manage child profiles, find participating Virginia schools, and keep tuition invoice information together.</PageHero>
    <section className="content-section"><div className="container"><div className="value-grid">
      <article className="value-card"><span className="value-icon"><FileCheck2/></span><h3>Start with the invoice</h3><p>Upload the official fee statement from the school. Amounts entered by a parent remain unverified until the school confirms them.</p></article>
      <article className="value-card"><span className="value-icon"><ShieldCheck/></span><h3>Keep documents private</h3><p>Invoice files are stored privately and are available to the parent account through temporary download links.</p></article>
      <article className="value-card"><span className="value-icon"><HeartHandshake/></span><h3>Understand each step</h3><p>A school request is not an enrollment or confirmation. SchoolPay marks school connections and invoices clearly while they await review.</p></article>
    </div><div className="content-narrow" style={{marginTop:45}}><h2>What is available now</h2><p>Parents can set up an account, add children, find a listed school, request that we contact an unlisted school, upload an invoice, and save an application draft. Financing decisions, offers, agreements, and payments are not available in this phase.</p><Link className="button button-primary" href="/register">Create an account <ArrowRight size={15}/></Link></div></div></section>
  </main><SiteFooter/></>;
}

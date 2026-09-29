import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, School, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "How it works",
  description: "See how parents organize school information and tuition invoices in SchoolPay.",
  alternates: { canonical: "/how-it-works" }
};

const stages = [
  [FileText, "Set up your parent account", "Add U.S. contact details and create a profile for each child."],
  [School, "Select a participating school", "Choose a school in the Virginia directory or request that SchoolPay contact an unlisted school."],
  [ShieldCheck, "Share the invoice privately", "Upload the school's fee statement. Your school selection and the invoice amount remain unconfirmed until reviewed."],
  [ArrowRight, "Save a draft for later", "Keep a draft linked to the invoice and resume it from your parent dashboard. This phase does not make financing decisions or offers."]
];

export default function HowItWorks() {
  return <><SiteHeader/><main>
    <PageHero eyebrow="How it works" title="A careful process, from profile to invoice.">SchoolPay's Virginia parent portal helps you organize school information and tuition documents. A parent-submitted record stays clearly marked until the school confirms it.</PageHero>
    <section className="content-section"><div className="container"><div className="steps-grid">{stages.map(([Icon,title,desc],i)=><article className="step-card" key={title as string}><span className="step-num">0{i+1}</span><div className="value-icon" style={{marginTop:18}}><Icon size={20}/></div><h3>{title as string}</h3><p>{desc as string}</p></article>)}</div>
      <div className="security-band" style={{marginTop:28}}><span className="security-icon"><ShieldCheck/></span><div><h3>School confirmation is required.</h3><p>Selecting a school or uploading an invoice does not confirm attendance, verify an amount, or create a financing offer.</p></div></div>
      <div style={{textAlign:"center",marginTop:32}}><Link className="button button-primary" href="/register">Get started <ArrowRight size={16}/></Link></div>
    </div></section>
  </main><SiteFooter/></>;
}

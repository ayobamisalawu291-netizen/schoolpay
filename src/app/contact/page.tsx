import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = { title: "Contact SchoolPay", description: "Find the right next step to contact SchoolPay.", alternates: { canonical: "/contact" } };

export default function Contact() {
  return <><SiteHeader/><main><PageHero eyebrow="Contact" title="We're here to help.">Whether you are a parent or a school, find the right next step below.</PageHero><section className="content-section"><div className="container"><div className="value-grid">
    <article className="value-card"><span className="value-icon"><MessageCircle/></span><h3>Parent support</h3><p>Find help with school invoices, accounts and understanding the application process.</p><Link className="inline-link" href="/help">Visit the Help centre →</Link></article>
    <article className="value-card"><span className="value-icon"><Mail/></span><h3>School enquiries</h3><p>Learn about verification and onboarding for prospective school partners.</p><Link className="inline-link" href="/for-schools">For schools →</Link></article>
    <article className="value-card"><span className="value-icon"><Mail/></span><h3>Contact channel</h3><p>A support email and phone number must be configured before the service launches. For now, see the Help centre for product information.</p><Link className="inline-link" href="/help">Explore Help →</Link></article>
  </div></div></section></main><SiteFooter/></>;
}

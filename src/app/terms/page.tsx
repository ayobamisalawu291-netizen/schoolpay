import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Terms",
  description: "Important service terms for SchoolPay.",
  alternates: { canonical: "/terms" }
};

export default function Terms() {
  return <><SiteHeader/><main>
    <PageHero eyebrow="Terms" title="Clear terms come before new services.">These foundation terms describe the parent tools currently in development. They are not final terms of service and do not create a financing agreement.</PageHero>
    <section className="content-section"><div className="container content-narrow">
      <h2>Current features</h2><p>Parents can manage profile and child information, find listed schools, send a request about an unlisted school, upload tuition invoices, and save application drafts. School and invoice details entered by a parent remain unconfirmed until reviewed.</p>
      <h2>Financing is not available</h2><p>This phase does not make financing decisions or offers, create agreements, authorize debits, or initiate payments. An application draft is a saved record only.</p>
      <h2>School information</h2><p>A parent's selection does not verify attendance or enroll a school. A request to contact an unlisted school does not add it to the directory.</p>
      <h2>Before launch</h2><p>SchoolPay must publish final terms reviewed by qualified U.S. legal and compliance professionals before activating additional services.</p>
    </div></section>
  </main><SiteFooter/></>;
}

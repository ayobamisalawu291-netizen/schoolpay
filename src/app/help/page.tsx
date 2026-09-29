import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = { title: "Help centre", description: "Answers about SchoolPay's parent portal and tuition invoice tools.", alternates: { canonical: "/help" } };

const questions = [
  ["What can I do in SchoolPay now?", "Set up a parent profile, add children, find participating Virginia schools, request that we contact an unlisted school, upload tuition invoices, and save application drafts."],
  ["What if my school is not listed?", "You can submit a school request and track its status. A request does not verify the school or add it to the public directory."],
  ["Does selecting a school confirm my child attends?", "No. The selection asks for a school connection. Attendance and student details require school confirmation."],
  ["Is an uploaded invoice verified?", "No. Information entered by a parent remains unverified until a school confirms it. SchoolPay does not simulate invoice or student verification."],
  ["Can I apply for financing?", "You can save and resume an application draft. Financing decisions, offers, agreements, payments, and repayments are not available in this phase."],
  ["What files can I upload?", "PDF, JPG, JPEG, or PNG files up to 4 MB are accepted for tuition invoices. Files are held in private storage."]
];

export default function Help() {
  return <><SiteHeader/><main><PageHero eyebrow="Help" title="Good to know from the start.">Answers about SchoolPay's parent account, school directory, and tuition invoice tools.</PageHero><section className="content-section"><div className="container content-narrow"><div className="faq-list">{questions.map(([question,answer])=><article className="faq-item" key={question}><h2>{question}</h2><p>{answer}</p></article>)}</div></div></section></main><SiteFooter/></>;
}

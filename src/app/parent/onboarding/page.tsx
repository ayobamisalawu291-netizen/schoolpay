import { redirect } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentAddressForm, ParentBasicsForm } from "@/components/parent/parent-forms";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ParentOnboarding({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const context = await requireParentPage({ allowIncompleteProfile: true });
  if (context.status !== "allowed") return <ParentPageUnavailable title="Parent profile" status={context.status}/>;
  if (context.profileComplete) redirect("/parent/dashboard");
  const { step: rawStep } = await searchParams;
  const step = rawStep === "1" ? 1 : rawStep === "2" || (context.profile?.onboarding_step ?? 0) >= 1 ? 2 : 1;

  return <DashboardShell audience="parent" title="Complete your parent profile">
    <div className="onboarding-layout">
      <section className="onboarding-card">
        <div className="onboarding-topline"><span className="step-badge">Step {step} of 2</span><span className="onboarding-security"><ShieldCheck size={15}/> Your account details stay private</span></div>
        <h2>{step === 1 ? "A few details about you." : "Where can we reach you?"}</h2>
        <p>{step === 1 ? "Tell us who is responsible for this SchoolPay account. We only collect what's needed to support your parent profile." : "Add your U.S. address and contact preferences. You can save now and return later if you need to."}</p>
        <div className="step-indicator" aria-label={`Step ${step} of 2`}><span className="complete"><Check size={12}/></span><i/><span className={step === 2 ? "complete" : ""}>{step === 2 ? <Check size={12}/> : "2"}</span></div>
        {step === 1 ? <ParentBasicsForm profile={context.profile}/> : <ParentAddressForm profile={context.profile}/>}
      </section>
      <aside className="onboarding-aside"><span className="onboarding-aside-icon"><ShieldCheck size={22}/></span><h3>Built around your child's school costs</h3><p>Keep child profiles, school connections, and tuition invoices together. School and invoice details remain unverified until the school confirms them.</p><div className="onboarding-privacy"><strong>Private by default</strong><span>Child and invoice records are visible only to authorized accounts.</span></div></aside>
    </div>
  </DashboardShell>;
}

import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { formatUsdCents } from "@/lib/money";
import { requireParentPage } from "@/lib/parent-guard";

export default async function SchoolFeesPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="School Fees" status={context.status}/>;
  const { data: invoices, error } = await context.supabase.from("invoices")
    .select("id,child_id,school_id,invoice_reference,original_amount_minor,amount_paid_minor,outstanding_amount_minor,currency,verification_status,status,current_document_id,created_at")
    .eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(100);
  const childIds = [...new Set((invoices ?? []).map((invoice) => invoice.child_id))];
  const schoolIds = [...new Set((invoices ?? []).map((invoice) => invoice.school_id))];
  const [{ data: children }, { data: schools }] = await Promise.all([
    childIds.length ? context.supabase.from("children").select("id,first_name,last_name").in("id", childIds) : Promise.resolve({ data: [] }),
    schoolIds.length ? context.supabase.from("schools").select("id,name").in("id", schoolIds) : Promise.resolve({ data: [] })
  ]);
  const childNames = new Map((children ?? []).map((child) => [child.id, `${child.first_name} ${child.last_name}`]));
  const schoolNames = new Map((schools ?? []).map((school) => [school.id, school.name]));

  return <DashboardShell audience="parent" title="School Fees">
    <div className="parent-page-intro"><p>Tuition records connected to your children and schools. Amounts from parent-uploaded invoices remain unverified until a school confirms them.</p><Link className="button button-primary" href="/parent/school-fees/upload"><Plus size={16}/>Upload invoice</Link></div>
    {error ? <div className="form-message error" role="alert">We couldn't load your invoices. Please refresh and try again.</div> : invoices?.length ? <div className="record-list record-list-panel">
      {invoices.map((invoice) => <Link className="invoice-row" key={invoice.id} href={`/parent/school-fees/${invoice.id}`}>
        <span className="record-icon"><FileText size={18}/></span>
        <span className="invoice-row-main"><strong>{invoice.invoice_reference}</strong><small>{childNames.get(invoice.child_id) ?? "Child"} · {schoolNames.get(invoice.school_id) ?? "School"}</small></span>
        <span className="invoice-row-amount"><strong>{formatUsdCents(invoice.outstanding_amount_minor)}</strong><small>outstanding</small></span>
        <span className={`status-tag ${invoice.verification_status === "matched" ? "status-success" : ""}`}>{invoice.verification_status.replaceAll("_", " ")}</span>
      </Link>)}
    </div> : <div className="empty-state"><span className="empty-icon"><FileText size={21}/></span><h2>No tuition invoices are available.</h2><p>Connect your child to a participating school, then upload the official fee statement.</p><Link className="button button-primary" href="/parent/schools">Find a school</Link></div>}
  </DashboardShell>;
}

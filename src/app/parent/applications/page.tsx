import Link from "next/link";
import { ArrowRight, FileText, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { formatUsdCents } from "@/lib/money";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ApplicationsPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Applications" status={context.status}/>;
  const { data: applications, error } = await context.supabase.from("financing_applications")
    .select("id,public_reference,invoice_id,status,current_step,created_at,updated_at")
    .eq("parent_id", context.userId).order("updated_at", { ascending: false }).limit(100);
  const invoiceIds = [...new Set((applications ?? []).map((application) => application.invoice_id))];
  const { data: invoices } = invoiceIds.length ? await context.supabase.from("invoices")
    .select("id,child_id,school_id,invoice_reference,outstanding_amount_minor,verification_status")
    .in("id", invoiceIds).eq("parent_id", context.userId) : { data: [] };
  const childIds = [...new Set((invoices ?? []).map((invoice) => invoice.child_id))];
  const schoolIds = [...new Set((invoices ?? []).map((invoice) => invoice.school_id))];
  const [{ data: children }, { data: schools }] = await Promise.all([
    childIds.length ? context.supabase.from("children").select("id,first_name,last_name").in("id", childIds).eq("parent_id", context.userId) : Promise.resolve({ data: [] }),
    schoolIds.length ? context.supabase.from("schools").select("id,name").in("id", schoolIds) : Promise.resolve({ data: [] })
  ]);
  const invoiceById = new Map((invoices ?? []).map((invoice) => [invoice.id, invoice]));
  const childNames = new Map((children ?? []).map((child) => [child.id, `${child.first_name} ${child.last_name}`]));
  const schoolNames = new Map((schools ?? []).map((school) => [school.id, school.name]));

  return <DashboardShell audience="parent" title="Applications">
    <div className="parent-page-intro"><p>Drafts are connected to an invoice. They are not approvals, offers, or financing decisions.</p><Link className="button button-primary" href="/parent/applications/new"><Plus size={16}/>Start an application</Link></div>
    {error ? <div className="form-message error" role="alert">We couldn't load your applications. Please try again.</div> : applications?.length ? <div className="record-list record-list-panel">
      {applications.map((application) => {
        const invoice = invoiceById.get(application.invoice_id);
        return <Link className="application-row" key={application.id} href={`/parent/applications/${application.public_reference}`}>
          <span className="record-icon"><FileText size={18}/></span>
          <span className="invoice-row-main"><strong>{application.public_reference}</strong><small>{invoice ? `${childNames.get(invoice.child_id) ?? "Child"} · ${schoolNames.get(invoice.school_id) ?? "School"} · invoice ${invoice.invoice_reference}` : "Linked invoice details unavailable"}</small></span>
          <span className="invoice-row-amount"><strong>{invoice ? formatUsdCents(invoice.outstanding_amount_minor) : "—"}</strong><small>{invoice?.verification_status.replaceAll("_", " ") ?? ""}</small></span>
          <span className={`status-tag ${application.status === "draft" ? "" : "status-success"}`}>{application.status.replaceAll("_", " ")}</span>
          <span className="application-next-action">{application.status === "draft" ? `Continue · step ${application.current_step} of 6` : "View"}<ArrowRight size={15}/></span>
        </Link>;
      })}
    </div> : <div className="empty-state"><span className="empty-icon"><FileText size={21}/></span><h2>You don't have any SchoolPay applications yet.</h2><p>Start with a child, participating school, and official invoice. You can save your draft and return later.</p><Link className="button button-primary" href="/parent/applications/new">Start an application</Link></div>}
  </DashboardShell>;
}

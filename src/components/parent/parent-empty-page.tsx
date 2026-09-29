import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";

export function ParentEmptyPage({
  title,
  heading,
  detail,
  icon: Icon,
  action
}: {
  title: string;
  heading: string;
  detail: string;
  icon: LucideIcon;
  action?: { label: string; href: string };
}) {
  return <DashboardShell audience="parent" title={title}><div className="empty-state"><span className="empty-icon"><Icon size={21}/></span><h2>{heading}</h2><p>{detail}</p>{action && <Link className="button button-primary" href={action.href}>{action.label}</Link>}</div></DashboardShell>;
}

export function ParentEmptyPageUnavailable({ title, status }: { title: string; status: "unconfigured" | "unavailable" }) {
  return <ParentPageUnavailable title={title} status={status}/>;
}

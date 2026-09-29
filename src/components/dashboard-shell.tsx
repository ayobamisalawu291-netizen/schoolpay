import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, CircleHelp, FileCheck2, FileText, GraduationCap, LayoutDashboard, LogOut, Settings, Users } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { ParentNavigation } from "@/components/parent-navigation";

const schoolLinks = [[LayoutDashboard, "Dashboard", "/school/dashboard"], [Users, "Students", "/school/students"], [FileCheck2, "Confirmations", "/school/confirmations"], [FileText, "Tuition invoices", "/school/invoices"], [GraduationCap, "Academic periods", "/school/academic-periods"], [GraduationCap, "Fee structures", "/school/fees"], [Settings, "School profile", "/school/profile"], [Settings, "Onboarding", "/school/onboarding"]] as const;

export function DashboardShell({ audience, title, children }: { audience: "parent" | "school" | "admin"; title: string; children: ReactNode }) {
  const name = audience === "parent" ? "Parent space" : audience === "school" ? "School portal" : "Operations";
  const links = audience === "school" ? schoolLinks : [[LayoutDashboard, "Overview", "/admin"], [GraduationCap, "School onboarding", "/admin/schools"]] as const;
  return (
    <div className="dashboard-layout">
      <aside className="dash-sidebar">
        <Link className="brand" href="/"><span className="brand-mark">S</span><span>school<span className="brand-pay">pay</span></span></Link>
        <span className="dash-label">{name}</span>
        {audience === "parent" ? <ParentNavigation/> : <nav aria-label={`${name} navigation`}>
          {links.map(([Icon, label, href]) => <Link key={href} href={href}><Icon size={18}/>{label}</Link>)}
        </nav>}
        <form action={signOut}><button className="dash-signout"><LogOut size={18}/>Log out</button></form>
      </aside>
      <main className="dash-main">
        <div className="dash-topbar"><span className="dash-greeting">{name}</span><span className="avatar" aria-label="SchoolPay account">SP</span></div>
        <div className="dash-content">
          <div className="dash-heading">
            <div><span className="eyebrow">SCHOOLPAY / {audience.toUpperCase()}</span><h1>{title}</h1></div>
            <span className="sandbox-label"><span/>Virginia launch setup</span>
          </div>
          {children}
          <Link className="help-link" href={audience === "parent" ? "/parent/support" : "/help"}><CircleHelp size={16}/>Need a hand? Visit Help<ArrowUpRight size={15}/></Link>
        </div>
      </main>
    </div>
  );
}

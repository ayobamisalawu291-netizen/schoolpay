"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CircleHelp, FileText, GraduationCap, LayoutDashboard, MessageCircle, Settings, Users, WalletCards } from "lucide-react";

const links = [
  [LayoutDashboard, "Dashboard", "/parent/dashboard"],
  [Users, "My Children", "/parent/children"],
  [GraduationCap, "Find a School", "/parent/schools"],
  [FileText, "School Fees", "/parent/school-fees"],
  [FileText, "Applications", "/parent/applications"],
  [WalletCards, "Offers", "/parent/offers"],
  [WalletCards, "Repayments", "/parent/repayments"],
  [BookOpen, "Documents", "/parent/documents"],
  [MessageCircle, "Messages", "/parent/messages"],
  [CircleHelp, "Support", "/parent/support"],
  [Settings, "Profile", "/parent/profile"]
] as const;

export function ParentNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Parent navigation">{links.map(([Icon, label, href]) => {
    const active = pathname === href || (href !== "/parent/dashboard" && pathname.startsWith(`${href}/`));
    return <Link aria-current={active ? "page" : undefined} className={active ? "active" : undefined} key={href} href={href}><Icon size={18}/>{label}</Link>;
  })}</nav>;
}

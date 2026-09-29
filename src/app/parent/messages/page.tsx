import { MessageCircle } from "lucide-react";
import { ParentEmptyPage, ParentEmptyPageUnavailable } from "@/components/parent/parent-empty-page";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ParentMessagesPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentEmptyPageUnavailable title="Messages" status={context.status}/>;
  return <ParentEmptyPage title="Messages" heading="Messages aren't available yet." detail="SchoolPay will show messages about your account here when secure in-app messaging is configured." icon={MessageCircle}/>;
}

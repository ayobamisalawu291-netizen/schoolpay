import { WalletCards } from "lucide-react";
import { ParentEmptyPage, ParentEmptyPageUnavailable } from "@/components/parent/parent-empty-page";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ParentRepaymentsPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentEmptyPageUnavailable title="Repayments" status={context.status}/>;
  return <ParentEmptyPage title="Repayments" heading="No repayment records." detail="Repayment processing is not available. SchoolPay has not created a financing offer, payment schedule, or repayment record." icon={WalletCards}/>;
}

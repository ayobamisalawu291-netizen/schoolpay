import { WalletCards } from "lucide-react";
import { ParentEmptyPage, ParentEmptyPageUnavailable } from "@/components/parent/parent-empty-page";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ParentOffersPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentEmptyPageUnavailable title="Offers" status={context.status}/>;
  return <ParentEmptyPage title="Offers" heading="Offers aren't available yet." detail="SchoolPay does not generate financing offers in this phase. A saved application draft is not an approval or an offer." icon={WalletCards}/>;
}

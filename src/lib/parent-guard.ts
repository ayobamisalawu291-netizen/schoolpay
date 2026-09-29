import { redirect } from "next/navigation";
import { getParentContext, type ParentContext } from "@/lib/parent-data";

type ParentPageContext = ParentContext | { status: "unconfigured" | "unavailable" };

export async function requireParentPage(options: { allowIncompleteProfile?: boolean } = {}): Promise<ParentPageContext> {
  const context = await getParentContext();
  if (context.status === "signed_out") redirect("/login");
  if (context.status === "forbidden") redirect("/forbidden");
  if (context.status === "allowed" && !context.profileComplete && !options.allowIncompleteProfile) {
    redirect("/parent/onboarding");
  }
  return context;
}

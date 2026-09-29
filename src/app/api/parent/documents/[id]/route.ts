import { NextResponse, type NextRequest } from "next/server";
import { getParentContext } from "@/lib/parent-data";

const bucket = "schoolpay-private-documents";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getParentContext();
  if (context.status !== "allowed" || !context.profileComplete) {
    return NextResponse.json({ error: "Document not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const { data: document } = await context.supabase.from("invoice_documents")
    .select("storage_path,original_filename")
    .eq("id", id).eq("parent_id", context.userId).maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const { data, error } = await context.supabase.storage.from(bucket).createSignedUrl(document.storage_path, 60, { download: document.original_filename });
  if (error || !data?.signedUrl) return NextResponse.json({ error: "This document is temporarily unavailable. Please try again." }, { status: 410, headers: { "Cache-Control": "no-store" } });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "no-store, private" } });
}

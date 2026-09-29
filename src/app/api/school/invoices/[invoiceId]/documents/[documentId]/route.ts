import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const staffRoles = ["school_owner", "school_admin", "school_finance"];

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string; documentId: string }> }) {
  const { invoiceId, documentId } = await params;
  if (![invoiceId, documentId].every((id) => /^[0-9a-f-]{36}$/i.test(id))) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Document service is not configured." }, { status: 503 });
  const { data: jwtData, error: claimsError } = await supabase.auth.getClaims();
  const userId = jwtData?.claims?.sub;
  if (claimsError || !userId) return NextResponse.json({ error: "Sign in to view this document." }, { status: 401 });

  const { data: document, error } = await supabase.from("invoice_documents")
    .select("id,school_id,storage_path").eq("id", documentId).eq("invoice_id", invoiceId).maybeSingle();
  if (error || !document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const { data: membership } = await supabase.from("school_members").select("role")
    .eq("user_id", userId).eq("school_id", document.school_id).maybeSingle();
  if (!membership || !staffRoles.includes(membership.role)) return NextResponse.json({ error: "You are not authorized to view this document." }, { status: 403 });

  const { data: signed, error: signingError } = await supabase.storage.from("schoolpay-private-documents").createSignedUrl(document.storage_path, 120);
  if (signingError || !signed?.signedUrl) return NextResponse.json({ error: "The document is temporarily unavailable." }, { status: 503 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}

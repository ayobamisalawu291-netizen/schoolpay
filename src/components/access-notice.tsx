import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export function AccessNotice({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><span className="empty-icon"><LockKeyhole/></span><h2>{title}</h2><p>{detail}</p><Link className="button button-primary" href="/help">Visit Help centre</Link></div>;
}

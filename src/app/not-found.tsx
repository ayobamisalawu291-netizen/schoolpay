import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export default function NotFound(){return <main className="not-found"><span className="eyebrow">404 · PAGE NOT FOUND</span><h1>We couldn't find that page.</h1><p>Check the address or head back to the SchoolPay home page.</p><Link className="button button-primary" href="/"><ArrowLeft size={16}/>Back to SchoolPay</Link></main>}

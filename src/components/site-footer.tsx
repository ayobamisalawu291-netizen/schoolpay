import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return <footer className="site-footer"><div className="container footer-main">
    <div className="footer-brand"><Link className="brand brand-light" href="/"><span className="brand-mark">S</span><span>school<span className="brand-pay">pay</span></span></Link><p>Helping families keep school information organized, one clear step at a time.</p><div className="footer-trust"><ShieldCheck size={17}/> School and invoice details require confirmation.</div></div>
    <div className="footer-links"><div><strong>Explore</strong><Link href="/about">About</Link><Link href="/how-it-works">How it works</Link><Link href="/schools">Find a school</Link></div><div><strong>For you</strong><Link href="/for-parents">For parents</Link><Link href="/for-schools">For schools</Link><Link href="/help">Help centre</Link></div><div><strong>Contact</strong><Link href="/contact">Get in touch</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div>
  </div><div className="container footer-bottom"><span>© {new Date().getFullYear()} SchoolPay. Made for the journey ahead.</span><span>School fees, with a little more room to breathe.</span></div></footer>;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const links = [["About", "/about"], ["How it works", "/how-it-works"], ["For parents", "/for-parents"], ["For schools", "/for-schools"], ["Help", "/help"]];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="container nav-wrap">
    <Link className="brand" href="/" aria-label="SchoolPay home"><span className="brand-mark">S</span><span>school<span className="brand-pay">pay</span></span></Link>
    <button className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
    <nav className={open ? "main-nav nav-open" : "main-nav"} aria-label="Main navigation">
      {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
      <div className="nav-actions"><Link className="nav-login" href="/login">Log in</Link><Link className="button button-primary button-small" href="/register">Get started</Link></div>
    </nav>
  </div></header>;
}

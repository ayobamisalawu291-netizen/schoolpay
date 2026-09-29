"use client";
import { useEffect } from "react";
import Link from "next/link";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{console.error("SchoolPay page error",error.digest);},[error]);return <main className="not-found"><span className="eyebrow">TEMPORARILY UNAVAILABLE</span><h1>That didn't load as expected.</h1><p>Your information has not been changed. Please try again in a moment.</p><button className="button button-primary" onClick={reset}>Try again</button><p><Link href="/help">Visit Help centre</Link></p></main>}

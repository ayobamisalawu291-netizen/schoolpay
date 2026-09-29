import Link from "next/link";
export default function Forbidden(){return <main className="not-found"><span className="eyebrow">ACCESS RESTRICTED</span><h1>This space is for authorized users.</h1><p>Your account does not have permission to view this area.</p><Link className="button button-primary" href="/">Back to SchoolPay</Link></main>}

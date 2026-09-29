import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  title: { default: "SchoolPay — Keep their education moving", template: "%s | SchoolPay" },
  description: "SchoolPay helps U.S. parents organize child and school information, find participating Virginia schools, and securely manage tuition invoices.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "SchoolPay", title: "Keep their education moving.", description: "Organize school information and manage tuition invoices with SchoolPay." }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}

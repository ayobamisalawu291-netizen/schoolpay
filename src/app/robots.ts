import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/how-it-works", "/for-parents", "/for-schools", "/schools", "/help", "/contact", "/privacy", "/terms"],
      disallow: ["/parent", "/school", "/admin", "/login", "/register", "/forgot-password", "/reset-password", "/auth", "/forbidden"]
    },
    ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).toString() } : {})
  };
}

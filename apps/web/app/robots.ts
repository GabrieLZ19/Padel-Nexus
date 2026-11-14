import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/utils/siteMetadata";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/club/",
        "/mi-perfil/",
        "/mensajes/",
        "/api/",
        "/callback",
        "/update-password",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

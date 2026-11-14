import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/utils/siteMetadata";

const RUTAS_PUBLICAS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/torneos", changeFrequency: "daily", priority: 0.9 },
  { path: "/ranking", changeFrequency: "daily", priority: 0.9 },
  { path: "/reservar", changeFrequency: "weekly", priority: 0.85 },
  { path: "/marketplace", changeFrequency: "weekly", priority: 0.8 },
  { path: "/partidos", changeFrequency: "weekly", priority: 0.75 },
  { path: "/login", changeFrequency: "monthly", priority: 0.4 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return RUTAS_PUBLICAS.map(({ path, changeFrequency, priority }) => ({
    url: path ? `${base}${path}` : base,
    lastModified,
    changeFrequency,
    priority,
  }));
}

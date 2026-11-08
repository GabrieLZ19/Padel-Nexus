import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Ranking oficial",
  description:
    "Clasificación por categoría, alcance provincial o nacional y evolución de puntos.",
});

export default function RankingPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

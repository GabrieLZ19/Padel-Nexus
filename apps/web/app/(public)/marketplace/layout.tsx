import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Marketplace",
  description:
    "Productos y servicios de pádel publicados por clubes, asociaciones y la federación.",
});

export default function MarketplacePublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

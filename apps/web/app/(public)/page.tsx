import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Inicio",
  description:
    "Descubrí torneos abiertos, el ranking oficial y reservá canchas en clubes de pádel.",
});

export default function HomePage() {
  return <HomePageClient />;
}

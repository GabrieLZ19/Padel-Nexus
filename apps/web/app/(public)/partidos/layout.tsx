import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Nos falta uno",
  description:
    "Armá partidos abiertos, sumate a convocatorias y coordiná con otros jugadores.",
});

export default function PartidosPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

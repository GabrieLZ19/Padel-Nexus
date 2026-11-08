import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Torneos",
  description:
    "Calendario de torneos oficiales, inscripciones y detalle de competencias por categoría.",
});

export default function TorneosPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

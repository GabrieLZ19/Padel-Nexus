import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Términos y condiciones",
  description:
    "Condiciones de uso de Padel Nexus para jugadores, clubes y organizadores.",
  path: "/terminos",
});

export default function TerminosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
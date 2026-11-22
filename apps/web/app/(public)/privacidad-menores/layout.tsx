import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacidad de menores",
  description:
    "Información sobre el tratamiento de datos de menores de edad en Padel Nexus.",
  path: "/privacidad-menores",
});

export default function PrivacidadMenoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Nueva contraseña",
  description:
    "Definí una nueva clave de acceso para tu cuenta de Padel Nexus.",
  path: "/update-password",
  noIndex: true,
});

export default function UpdatePasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

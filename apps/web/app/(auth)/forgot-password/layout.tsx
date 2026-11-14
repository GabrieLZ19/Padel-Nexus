import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Recuperar contraseña",
  description:
    "Solicitá el enlace por correo para restablecer tu clave de acceso a Padel Nexus.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Crear cuenta",
  description:
    "Registrate como jugador en Padel Nexus con tu email, DNI y datos de perfil.",
});

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

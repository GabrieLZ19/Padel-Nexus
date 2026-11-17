import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Política de privacidad",
  description:
    "Cómo Padel Nexus recopila, usa y protege tus datos personales.",
  path: "/privacidad",
});

export default function PrivacidadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
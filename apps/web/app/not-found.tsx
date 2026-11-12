import type { Metadata } from "next";
import NotFoundView from "@/components/layout/NotFoundView";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Página no encontrada",
  description: "La ruta que buscás no existe en Padel Nexus.",
});

export default function NotFoundPage() {
  return <NotFoundView />;
}

import type { Metadata } from "next";
import NotFoundView from "@/components/layout/NotFoundView";

export const metadata: Metadata = {
  title: "Página no encontrada | Padel Nexus",
  description: "La ruta que buscás no existe en Padel Nexus.",
};

export default function NotFoundPage() {
  return <NotFoundView />;
}

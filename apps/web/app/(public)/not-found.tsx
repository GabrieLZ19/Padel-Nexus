import type { Metadata } from "next";
import NotFoundView from "@/components/layout/NotFoundView";

export const metadata: Metadata = {
  title: "Página no encontrada | Padel Nexus",
};

export default function PublicNotFoundPage() {
  return <NotFoundView showBrandHeader={false} compact />;
}

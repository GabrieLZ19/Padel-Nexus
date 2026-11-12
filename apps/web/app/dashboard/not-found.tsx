import type { Metadata } from "next";
import DashboardNotFoundClient from "@/components/layout/DashboardNotFoundClient";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Página no encontrada",
  description: "La sección del panel que buscás no existe.",
});

export default function DashboardNotFoundPage() {
  return <DashboardNotFoundClient />;
}

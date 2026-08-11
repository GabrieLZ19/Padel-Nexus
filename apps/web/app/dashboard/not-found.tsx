import type { Metadata } from "next";
import DashboardNotFoundClient from "@/components/layout/DashboardNotFoundClient";

export const metadata: Metadata = {
  title: "Página no encontrada | Padel Nexus",
};

export default function DashboardNotFoundPage() {
  return <DashboardNotFoundClient />;
}

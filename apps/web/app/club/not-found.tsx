import type { Metadata } from "next";
import NotFoundView from "@/components/layout/NotFoundView";

export const metadata: Metadata = {
  title: "Página no encontrada | Padel Nexus",
};

export default function ClubNotFoundPage() {
  return (
    <NotFoundView
      showBrandHeader={false}
      compact
      homeHref="/club"
      homeLabel="Ir al panel del club"
      secondary={{ href: "/club/reservas", label: "Ver reservas" }}
      shortcuts={[
        { href: "/club/canchas", label: "Canchas" },
        { href: "/club/torneos", label: "Torneos" },
        { href: "/club/configuracion", label: "Configuración" },
      ]}
    />
  );
}

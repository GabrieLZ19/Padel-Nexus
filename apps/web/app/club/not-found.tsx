import type { Metadata } from "next";
import NotFoundView from "@/components/layout/NotFoundView";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Página no encontrada",
  description: "La ruta del panel de club no existe.",
});

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

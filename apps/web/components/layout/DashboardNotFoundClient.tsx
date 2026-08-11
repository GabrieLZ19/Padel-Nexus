"use client";

import { useProfileStore } from "@/store/useProfileStore";
import { esRolFiscal } from "@/utils/auth/roles";
import NotFoundView from "@/components/layout/NotFoundView";

export default function DashboardNotFoundClient() {
  const rol = useProfileStore((s) => s.profile?.rol);
  const fiscal = esRolFiscal(rol);

  return (
    <NotFoundView
      showBrandHeader={false}
      compact
      homeHref="/dashboard"
      homeLabel="Ir al dashboard"
      secondary={
        fiscal
          ? { href: "/dashboard/fiscal/torneos", label: "Mis torneos" }
          : { href: "/dashboard/torneos", label: "Ver torneos" }
      }
      shortcuts={
        fiscal
          ? []
          : [
              { href: "/dashboard/inscripciones", label: "Inscripciones" },
              { href: "/dashboard/rankings", label: "Rankings" },
              { href: "/dashboard/chat", label: "Chat" },
            ]
      }
    />
  );
}

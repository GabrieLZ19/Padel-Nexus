"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProfileStore } from "@/store/useProfileStore";
import { puedeAccederRutaDashboard } from "@/utils/constants/menuPermissions";

/**
 * FEE-16: el superadmin no tiene organización propia; evitar GET preferencias-org (400).
 */
export default function CargosServicioDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const profile = useProfileStore((s) => s.profile);
  const permitido = puedeAccederRutaDashboard(profile?.rol, pathname);

  useEffect(() => {
    if (!profile?.rol) return;
    if (!permitido) {
      const destino =
        profile.rol === "superadmin"
          ? "/dashboard/platform-fees"
          : "/dashboard";
      router.replace(destino);
    }
  }, [profile?.rol, permitido, router]);

  if (profile?.rol && !permitido) {
    return null;
  }

  return children;
}
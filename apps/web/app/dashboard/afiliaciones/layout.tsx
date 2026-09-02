"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProfileStore } from "@/store/useProfileStore";
import { puedeAccederRutaDashboard } from "@/utils/constants/menuPermissions";

export default function AfiliacionesLayout({
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
      router.replace("/dashboard");
    }
  }, [profile?.rol, permitido, router]);

  if (profile?.rol && !permitido) {
    return null;
  }

  return children;
}

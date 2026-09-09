"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";

export function MinorModeBanner() {
  const profile = useProfileStore((s) => s.profile);
  if (!profile?.es_menor) return null;

  const pendiente =
    profile.cuenta_estado === "PENDING_PARENTAL_CONSENT" ||
    profile.cuenta_estado === "DRAFT_MINOR";

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 size-5 shrink-0 text-amber-300" />
        <div>
          <p className="font-bold text-amber-200">
            Modo de protección para menores activo
          </p>
          <p className="mt-1 text-amber-100/80">
            {pendiente
              ? "Tu cuenta está pendiente de consentimiento parental. Algunas funciones permanecen bloqueadas hasta que el responsable complete el enlace."
              : "Esta cuenta tiene privacidad reforzada. Los datos identificatorios privados, la ubicación futura y la fotografía no se muestran públicamente."}
          </p>
          {pendiente ? null : (
            <Link
              href="/mi-perfil/autorizaciones"
              className="mt-2 inline-block text-xs font-semibold text-brand-chartreuse underline"
            >
              Ver autorizaciones
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

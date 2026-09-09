"use client";

import { useEffect, useState } from "react";
import { sileo } from "sileo";
import { MenoresService } from "@/utils/services/menores";
import { MinorModeBanner } from "@/components/legal/MinorModeBanner";
import { useProfileStore } from "@/store/useProfileStore";
import FeedbackModal from "@/components/ui/FeedbackModal";

export default function AutorizacionesMenorPage() {
  const profile = useProfileStore((s) => s.profile);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await MenoresService.getAutorizaciones();
      setData(res);
    } catch (err: unknown) {
      sileo.error({
        title:
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las autorizaciones.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const ajustes = data?.ajustes as
    | { public_profile?: boolean }
    | undefined;

  const handleRevoke = async () => {
    try {
      await MenoresService.revocar("PUBLIC_PROFILE");
      sileo.success({ title: "Perfil público ocultado." });
      setConfirmRevoke(false);
      await load();
    } catch (err: unknown) {
      sileo.error({
        title:
          err instanceof Error ? err.message : "No se pudo revocar.",
      });
    }
  };

  if (!profile?.es_menor && profile?.cuenta_estado !== "ADULT_TRANSITION_PENDING") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-gray-400">
        Esta sección aplica a cuentas con régimen de menores.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-brand-white">
      <MinorModeBanner />
      <h1 className="mb-2 text-3xl font-extrabold">Autorizaciones</h1>
      <p className="mb-8 text-sm text-gray-400">
        Podés revisar y revocar autorizaciones opcionales. El historial
        deportivo necesario se conserva.
      </p>

      {loading ? (
        <p className="text-gray-400">Cargando…</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-white/10 bg-brand-input/40 p-4">
            <p className="font-semibold">Perfil deportivo público</p>
            <p className="mt-1 text-sm text-gray-400">
              Estado:{" "}
              {ajustes?.public_profile ? "Habilitado" : "Deshabilitado"}
            </p>
            {ajustes?.public_profile ? (
              <button
                type="button"
                onClick={() => setConfirmRevoke(true)}
                className="mt-3 rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-300"
              >
                Revocar / ocultar perfil público
              </button>
            ) : null}
          </div>
          <div className="rounded-xl border border-brand-white/10 bg-brand-input/40 p-4">
            <p className="font-semibold">Fotografía pública</p>
            <p className="mt-1 text-sm text-gray-400">
              Deshabilitada durante el MVP para menores.
            </p>
          </div>
          <div className="rounded-xl border border-brand-white/10 bg-brand-input/40 p-4">
            <p className="font-semibold">Marketing</p>
            <p className="mt-1 text-sm text-gray-400">
              Deshabilitado por defecto para menores.
            </p>
          </div>
        </div>
      )}

      <FeedbackModal
        isOpen={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title="¿Ocultar el perfil deportivo público?"
        description="Al confirmar, el perfil dejará de estar públicamente disponible. Esta acción no elimina resultados deportivos que deban conservarse."
        confirmText="Confirmar"
        type="warning"
        onConfirm={handleRevoke}
      />
    </div>
  );
}

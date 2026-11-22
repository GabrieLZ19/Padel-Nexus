"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { sileo } from "sileo";
import {
  PlatformFeesService,
  type PlatformFeeCanal,
  type PlatformFeeModo,
} from "@/utils/services/platformFees";

const CANALES: Array<{ id: PlatformFeeCanal; label: string }> = [
  { id: "inscripciones", label: "Inscripciones" },
  { id: "licencias", label: "Licencias" },
  { id: "reservas", label: "Reservas" },
  { id: "marketplace", label: "Marketplace" },
];

export function CargosServicioPanel({
  className = "p-6 md:p-10 max-w-3xl",
}: {
  className?: string;
}) {
  const [modos, setModos] = useState<Record<PlatformFeeCanal, PlatformFeeModo>>({
    inscripciones: "absorber",
    licencias: "absorber",
    reservas: "absorber",
    marketplace: "absorber",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await PlatformFeesService.obtenerPreferenciasOrg();
        const next = { ...modos };
        for (const row of res.data) {
          next[row.canal] = row.modo;
        }
        setModos(next);
      } catch {
        sileo.error({
          title: "Error",
          description: "No se pudieron cargar las preferencias.",
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardar = async () => {
    setSaving(true);
    try {
      const preferencias = CANALES.map((c) => ({
        canal: c.id,
        modo: modos[c.id],
      }));
      await PlatformFeesService.guardarPreferenciasOrg(preferencias);
      sileo.success({
        title: "Guardado",
        description: "Preferencias de cargo por servicio actualizadas.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar.";
      sileo.error({ title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={`${className} text-gray-400 text-sm`}>Cargando...</div>;
  }

  return (
    <div className={className}>
      <h1 className="text-2xl font-black text-white">Cargo por servicio</h1>
      <p className="text-sm text-gray-400 mt-2">
        Por canal, elegí si tu entidad absorbe el fee (se descuenta del neto) o lo
        sumás al precio (el jugador ve el cargo en el checkout).
      </p>

      <div className="mt-8 space-y-4">
        {CANALES.map(({ id, label }) => (
          <div
            key={id}
            className="rounded-2xl border border-white/10 bg-brand-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <p className="font-semibold text-white">{label}</p>
            <div className="flex rounded-xl bg-brand-black p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setModos((m) => ({ ...m, [id]: "absorber" }))}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  modos[id] === "absorber"
                    ? "bg-brand-chartreuse text-brand-black"
                    : "text-gray-400"
                }`}
              >
                Absorber fee
              </button>
              <button
                type="button"
                onClick={() => setModos((m) => ({ ...m, [id]: "sumar" }))}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  modos[id] === "sumar"
                    ? "bg-brand-chartreuse text-brand-black"
                    : "text-gray-400"
                }`}
              >
                Sumar al precio
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void guardar()}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-chartreuse px-5 py-3 text-sm font-bold text-brand-black disabled:opacity-50"
      >
        <Save className="size-4" />
        {saving ? "Guardando..." : "Guardar preferencias"}
      </button>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Save, Percent, Coins } from "lucide-react";
import { sileo } from "sileo";
import {
  PlatformFeesService,
  type PlatformFeeCanal,
  type PlatformFeeTipo,
} from "@/utils/services/platformFees";

const CANALES: Array<{ id: PlatformFeeCanal; label: string }> = [
  { id: "inscripciones", label: "Inscripciones" },
  { id: "licencias", label: "Licencias" },
  { id: "reservas", label: "Reservas" },
  { id: "marketplace", label: "Marketplace" },
];

type CanalRow = {
  canal: PlatformFeeCanal;
  tipo: PlatformFeeTipo;
  valor: number;
  activo: boolean;
};

export default function PlatformFeesAdminPage() {
  const [rows, setRows] = useState<CanalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await PlatformFeesService.listarCanales();
        setRows(data);
      } catch {
        sileo.error({
          title: "Error",
          description: "No se pudieron cargar los fees por canal.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patchRow = (canal: PlatformFeeCanal, patch: Partial<CanalRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.canal === canal ? { ...r, ...patch } : r)),
    );
  };

  const guardar = async (canal: PlatformFeeCanal) => {
    const row = rows.find((r) => r.canal === canal);
    if (!row) return;
    setSaving(canal);
    try {
      await PlatformFeesService.actualizarCanal(canal, {
        tipo: row.tipo,
        valor: Number(row.valor),
        activo: row.activo,
      });
      sileo.success({
        title: "Guardado",
        description: `Fee de ${canal} actualizado.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo guardar.";
      sileo.error({ title: "Error", description: msg });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-gray-400 text-sm">Cargando configuración de fees...</div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <h1 className="text-2xl font-black text-white">Cargo por servicio</h1>
      <p className="text-sm text-gray-400 mt-2 max-w-2xl">
        Definí el fee de Padel Nexus por canal. Cada club, asociación o federación
        elige si lo absorbe o lo suma al precio publicado en su panel.
      </p>

      <div className="mt-8 space-y-4">
        {CANALES.map(({ id, label }) => {
          const row = rows.find((r) => r.canal === id);
          if (!row) return null;
          return (
            <div
              key={id}
              className="rounded-2xl border border-white/10 bg-brand-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-bold text-white">{label}</p>
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={row.activo}
                    onChange={(e) => patchRow(id, { activo: e.target.checked })}
                    className="rounded border-white/20"
                  />
                  Activo
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                  <select
                    value={row.tipo}
                    onChange={(e) =>
                      patchRow(id, { tipo: e.target.value as PlatformFeeTipo })
                    }
                    className="w-full rounded-xl bg-brand-black border border-white/10 px-3 py-2 text-sm text-white"
                  >
                    <option value="fijo">Monto fijo (ARS)</option>
                    <option value="porcentaje">Porcentaje</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor</label>
                  <div className="relative">
                    {row.tipo === "porcentaje" ? (
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                    ) : (
                      <Coins className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                    )}
                    <input
                      type="number"
                      min={0}
                      step={row.tipo === "porcentaje" ? 0.1 : 1}
                      value={row.valor}
                      onChange={(e) =>
                        patchRow(id, { valor: Number(e.target.value) })
                      }
                      className="w-full rounded-xl bg-brand-black border border-white/10 px-3 py-2 text-sm text-white pr-10"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={saving === id}
                onClick={() => void guardar(id)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-chartreuse px-4 py-2 text-sm font-bold text-brand-black disabled:opacity-50"
              >
                <Save className="size-4" />
                {saving === id ? "Guardando..." : "Guardar canal"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
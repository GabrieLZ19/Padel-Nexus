"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import { Torneo } from "@/utils/types";
import { TorneosService } from "@/utils/services/torneos";
import {
  RAMAS_PADEL,
  getNivelesParaCategoria,
} from "@/utils/constants/fapApaRules";

function ramaCorta(rama?: string | null): string {
  const r = String(rama || "").toLowerCase();
  if (r.startsWith("fem")) return "Fem.";
  if (r.startsWith("mix")) return "Mix.";
  return "Masc.";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function previewNombre(
  origen: Torneo,
  nivel: string,
  rama: string,
): string {
  let base = (origen.nombre || "Torneo").trim();
  const sufijos = [
    `${origen.nivel || ""} ${ramaCorta(origen.rama)}`,
    origen.nivel || "",
    ramaCorta(origen.rama),
    origen.rama || "",
  ].filter((s) => s.trim());

  for (const s of sufijos) {
    const re = new RegExp(`[\\s—\\-–]*${escapeRegExp(s)}\\s*$`, "i");
    base = base.replace(re, "").trim();
  }
  return `${base} — ${nivel} ${ramaCorta(rama)}`;
}

interface ReplicarTorneoModalProps {
  isOpen: boolean;
  torneo: Torneo | null;
  /** Club: solo niveles, misma rama. CRM: niveles + ramas. */
  modoClub?: boolean;
  onClose: () => void;
  onSuccess: (creados: number) => void;
  onError: (message: string) => void;
}

export default function ReplicarTorneoModal({
  isOpen,
  torneo,
  modoClub = false,
  onClose,
  onSuccess,
  onError,
}: ReplicarTorneoModalProps) {
  const reglamento =
    (torneo as { reglamento?: string } | null)?.reglamento ||
    torneo?.asociacion ||
    "FAP";
  const categoria = torneo?.categoria || "Libres";

  const nivelesOpts = useMemo(
    () => getNivelesParaCategoria(String(reglamento), categoria),
    [reglamento, categoria],
  );

  const [nivelesSel, setNivelesSel] = useState<string[]>([]);
  const [ramasSel, setRamasSel] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !torneo) return;
    setNivelesSel(
      nivelesOpts.map((n) => n.value).filter((v) => v !== torneo.nivel),
    );
    setRamasSel([torneo.rama || "Masculina"]);
  }, [isOpen, torneo, nivelesOpts]);

  const paresPreview = useMemo(() => {
    if (!torneo) return [];
    const ramas = modoClub
      ? [torneo.rama || "Masculina"]
      : ramasSel.length > 0
        ? ramasSel
        : [torneo.rama || "Masculina"];
    const out: Array<{ rama: string; nivel: string; nombre: string }> = [];
    for (const rama of ramas) {
      for (const nivel of nivelesSel) {
        if (rama === (torneo.rama || "Masculina") && nivel === torneo.nivel)
          continue;
        out.push({
          rama,
          nivel,
          nombre: previewNombre(torneo, nivel, rama),
        });
      }
    }
    return out;
  }, [torneo, nivelesSel, ramasSel, modoClub]);

  const toggleNivel = (value: string) => {
    setNivelesSel((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const toggleRama = (value: string) => {
    setRamasSel((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleSubmit = async () => {
    if (!torneo) return;
    if (paresPreview.length === 0) {
      onError("Seleccioná al menos una combinación distinta al torneo origen.");
      return;
    }
    setLoading(true);
    try {
      const res = await TorneosService.replicar(torneo.id, {
        niveles: nivelesSel,
        ramas: modoClub ? undefined : ramasSel,
      });
      const n = res.creados?.length || 0;
      if (n === 0) {
        onError(
          res.omitidos?.[0]?.motivo ||
            "No se creó ningún torneo. Revisá la selección.",
        );
      } else {
        onSuccess(n);
        onClose();
      }
    } catch (err: unknown) {
      const ax = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      onError(
        ax.response?.data?.error ||
          ax.response?.data?.message ||
          ax.message ||
          "Error al replicar.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && torneo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-start gap-4 p-6 border-b border-white/5 shrink-0">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Copy className="size-5 text-brand-chartreuse" />
                  Replicar torneo
                </h3>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  Base: {torneo.nombre}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {torneo.categoria || "Libres"} · {torneo.nivel || "—"} ·{" "}
                  {torneo.rama || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Niveles a crear
                </p>
                <div className="flex flex-wrap gap-2">
                  {nivelesOpts.map((n) => {
                    const active = nivelesSel.includes(n.value);
                    return (
                      <button
                        key={n.value}
                        type="button"
                        onClick={() => toggleNivel(n.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          active
                            ? "bg-brand-chartreuse/15 border-brand-chartreuse/40 text-brand-chartreuse"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        {active ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="size-3" /> {n.label}
                          </span>
                        ) : (
                          n.label
                        )}
                      </button>
                    );
                  })}
                  {nivelesOpts.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      No hay niveles para esta categoría/reglamento.
                    </p>
                  ) : null}
                </div>
              </div>

              {modoClub ? (
                <p className="text-xs text-gray-500 leading-relaxed bg-white/[0.03] border border-white/8 rounded-xl px-3 py-2.5">
                  Se mantienen la rama ({torneo.rama || "Masculina"}) y el resto
                  de parámetros del torneo base. Solo se crean nuevos niveles.
                </p>
              ) : (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Ramas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {RAMAS_PADEL.map((r) => {
                      const active = ramasSel.includes(r.value);
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => toggleRama(r.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            active
                              ? "bg-brand-chartreuse/15 border-brand-chartreuse/40 text-brand-chartreuse"
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Se crearán {paresPreview.length} torneo
                  {paresPreview.length === 1 ? "" : "s"}
                </p>
                <ul className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-white/8 bg-[#111] p-3">
                  {paresPreview.length === 0 ? (
                    <li className="text-xs text-gray-500">
                      Ninguna combinación nueva seleccionada.
                    </li>
                  ) : (
                    paresPreview.map((p) => (
                      <li
                        key={`${p.rama}-${p.nivel}`}
                        className="text-xs text-gray-300 font-medium truncate"
                      >
                        {p.nombre}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="p-6 pt-0 shrink-0">
              <button
                type="button"
                disabled={loading || paresPreview.length === 0}
                onClick={handleSubmit}
                className="w-full bg-brand-chartreuse hover:bg-[#b3e600] disabled:opacity-30 text-brand-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Copy className="size-4" />
                    Generar {paresPreview.length} torneo
                    {paresPreview.length === 1 ? "" : "s"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

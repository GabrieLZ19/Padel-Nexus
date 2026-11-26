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
import { etiquetaNivelYCategoria } from "@/utils/etiquetaCategoria";
import {
  nombreBaseTorneo,
  previewNombreTorneoReplicado,
} from "@/utils/replicarTorneoNombre";
import {
  claveParNivelRama,
  opcionesParesReplicar,
} from "@/utils/replicarTorneoPares";

interface ReplicarTorneoModalProps {
  isOpen: boolean;
  torneo: Torneo | null;
  onClose: () => void;
  onSuccess: (creados: number) => void;
  onError: (message: string) => void;
}

export default function ReplicarTorneoModal({
  isOpen,
  torneo,
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

  const [paresSel, setParesSel] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !torneo) return;
    setParesSel([]);
  }, [isOpen, torneo, nivelesOpts]);

  const opcionesPares = useMemo(() => {
    if (!torneo) return [];
    return opcionesParesReplicar(nivelesOpts, RAMAS_PADEL, {
      nivel: torneo.nivel,
      rama: torneo.rama,
    });
  }, [torneo, nivelesOpts]);

  const paresPreview = useMemo(() => {
    if (!torneo) return [];
    const set = new Set(paresSel);
    return opcionesPares
      .filter((p) => set.has(claveParNivelRama(String(p.rama), p.nivel)))
      .map((p) => ({
        rama: String(p.rama),
        nivel: p.nivel,
        etiqueta: `${p.nivelLabel} · ${p.ramaLabel}`,
        nombre: previewNombreTorneoReplicado(
          torneo.nombre || "Torneo",
          torneo.nivel,
          torneo.rama,
          p.nivel,
          String(p.rama),
        ),
      }));
  }, [torneo, opcionesPares, paresSel]);

  const etiquetaOrigen = useMemo(() => {
    if (!torneo) return "";
    const nivelCat =
      etiquetaNivelYCategoria(torneo.nivel, torneo.categoria) || "Sin nivel";
    const rama = torneo.rama || "Sin rama";
    return `${nivelCat} · ${rama}`;
  }, [torneo]);

  const nombreEventoBase = useMemo(() => {
    if (!torneo) return "";
    return nombreBaseTorneo(torneo.nombre, torneo.nivel, torneo.rama);
  }, [torneo]);

  const togglePar = (rama: string, nivel: string) => {
    const clave = claveParNivelRama(rama, nivel);
    setParesSel((prev) =>
      prev.includes(clave)
        ? prev.filter((k) => k !== clave)
        : [...prev, clave],
    );
  };

  const handleSubmit = async () => {
    if (!torneo) return;
    if (paresPreview.length === 0) {
      onError("Seleccioná al menos un par nivel + rama distinto al torneo origen.");
      return;
    }
    setLoading(true);
    try {
      const res = await TorneosService.replicar(torneo.id, {
        pares: paresPreview.map((p) => ({ nivel: p.nivel, rama: p.rama })),
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
                  Evento: {nombreEventoBase}
                </p>
                <p className="text-[11px] text-brand-chartreuse/90 mt-1 font-semibold">
                  Origen ({etiquetaOrigen})
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                  Nombre actual: {torneo.nombre}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                title="Cerrar"
                aria-label="Cerrar"
                className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <motion.div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Combinaciones nivel + rama
                </p>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Elegí cada par puntual. No se arma el producto de todos los
                  niveles con todas las ramas. Se copian fechas, días de
                  competencia, sedes, cupo y puntos del torneo base.
                </p>
                <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto rounded-xl border border-white/8 bg-[#111] p-2">
                  {opcionesPares.length === 0 ? (
                    <p className="text-xs text-gray-500 p-2">
                      No hay niveles para esta categoría/reglamento.
                    </p>
                  ) : (
                    opcionesPares.map((p) => {
                      const clave = claveParNivelRama(String(p.rama), p.nivel);
                      const active = paresSel.includes(clave);
                      return (
                        <button
                          key={clave}
                          type="button"
                          onClick={() => togglePar(String(p.rama), p.nivel)}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                            active
                              ? "border-brand-chartreuse/40 bg-brand-chartreuse/10 text-brand-chartreuse"
                              : "border-transparent bg-white/5 text-gray-300 hover:bg-white/8"
                          }`}
                        >
                          <span className="font-bold">
                            {p.nivelLabel} · {p.ramaLabel}
                          </span>
                          {active ? (
                            <Check className="size-3.5 shrink-0" />
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>

              <motion.div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Se crearán {paresPreview.length} torneo
                  {paresPreview.length === 1 ? "" : "s"}
                </p>
                <ul className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-white/8 bg-[#111] p-3">
                  {paresPreview.length === 0 ? (
                    <li className="text-xs text-gray-500">
                      Ningún par seleccionado.
                    </li>
                  ) : (
                    paresPreview.map((p) => (
                      <li
                        key={`${p.rama}-${p.nivel}`}
                        className="text-xs text-gray-300"
                      >
                        <span className="font-bold text-brand-chartreuse/90">
                          {p.etiqueta}
                        </span>
                        <span className="text-gray-500"> — </span>
                        <span className="font-medium truncate">{p.nombre}</span>
                      </li>
                    ))
                  )}
                </ul>
              </motion.div>
            </div>

            <motion.div className="p-6 pt-0 shrink-0">
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
            </motion.div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
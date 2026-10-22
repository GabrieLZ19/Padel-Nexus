"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shuffle, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { sileo } from "sileo";

export interface ParejaEnSorteo {
  inscripcionId: string;
  nombre: string;
  club?: string;
  sorteoPosicion?: number | null;
}

interface ModalSorteoZonaProps {
  isOpen: boolean;
  onClose: () => void;
  torneoId: string;
  nombreZona: string;
  parejasEmpatadas: ParejaEnSorteo[];
  posicionesEnDisputa: number[];
  onSuccess: () => void;
}

export const ModalSorteoZona: React.FC<ModalSorteoZonaProps> = ({
  isOpen,
  onClose,
  torneoId,
  nombreZona,
  parejasEmpatadas,
  posicionesEnDisputa,
  onSuccess,
}) => {
  const [metodo, setMetodo] = useState<"digital" | "manual">("digital");
  const [asignaciones, setAsignaciones] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [animandoSorteo, setAnimandoSorteo] = useState(false);

  // Inicializar asignaciones si es manual o si ya existen
  React.useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      parejasEmpatadas.forEach((p, idx) => {
        initial[p.inscripcionId] =
          p.sorteoPosicion ?? posicionesEnDisputa[idx] ?? idx + 1;
      });
      setAsignaciones(initial);
      setMotivo("");
      setAnimandoSorteo(false);
    }
  }, [isOpen, parejasEmpatadas, posicionesEnDisputa]);

  if (!isOpen) return null;

  const ejecutarSorteoDigital = () => {
    setAnimandoSorteo(true);
    // Barajar aleatoriamente las posiciones entre las parejas empatadas
    const posicionesDisponibles = [...posicionesEnDisputa].sort(() => Math.random() - 0.5);
    const nuevasAsignaciones: Record<string, number> = {};
    parejasEmpatadas.forEach((p, idx) => {
      nuevasAsignaciones[p.inscripcionId] = posicionesDisponibles[idx];
    });

    setTimeout(() => {
      setAsignaciones(nuevasAsignaciones);
      setAnimandoSorteo(false);
      setMotivo("Sorteo digital reglamentario ejecutado en plataforma");
    }, 450);
  };

  const handleIntercambiarManual = () => {
    if (parejasEmpatadas.length === 2) {
      const p1 = parejasEmpatadas[0].inscripcionId;
      const p2 = parejasEmpatadas[1].inscripcionId;
      const pos1 = asignaciones[p1];
      const pos2 = asignaciones[p2];
      setAsignaciones({
        ...asignaciones,
        [p1]: pos2,
        [p2]: pos1,
      });
    }
  };

  const handleConfirmar = async () => {
    // Validar que cada posición sea única
    const posUsadas = Object.values(asignaciones);
    const posUnicas = new Set(posUsadas);
    if (posUnicas.size !== parejasEmpatadas.length) {
      sileo.error({
        title: "Asignación incompleta",
        description: "Cada pareja debe tener una posición reglamentaria distinta.",
      });
      return;
    }

    setLoading(true);
    try {
      const resoluciones = parejasEmpatadas.map((p) => ({
        inscripcionId: p.inscripcionId,
        posicion: asignaciones[p.inscripcionId],
      }));

      await TorneosService.resolverSorteoZona(torneoId, nombreZona, {
        resoluciones,
        motivo:
          motivo.trim() ||
          (metodo === "digital"
            ? "Sorteo digital reglamentario FAP"
            : "Sorteo presencial en mesa de control"),
        metodo,
      });

      sileo.success({
        title: "Sorteo registrado con éxito",
        description: `Posiciones reglamentarias aplicadas y auditadas para ${nombreZona}.`,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al registrar el sorteo.";
      sileo.error({
        title: "No se pudo registrar el sorteo",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#141414] border border-white/10 p-6 shadow-2xl space-y-5 text-gray-200"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-chartreuse/10 text-brand-chartreuse text-xs font-black uppercase tracking-wider border border-brand-chartreuse/20">
                <ShieldCheck className="size-3.5" />
                Reglamento FAP
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Sorteo Reglamentario · {nombreZona}
              </h3>
              <p className="text-xs text-gray-400">
                Resolución de empate técnico absoluto para definir puestos{" "}
                {posicionesEnDisputa.map((p) => `${p}.º`).join(" y ")}.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Selector de Método */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setMetodo("digital")}
              className={`py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                metodo === "digital"
                  ? "bg-brand-chartreuse text-brand-black shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sorteo Digital
            </button>
            <button
              type="button"
              onClick={() => setMetodo("manual")}
              className={`py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                metodo === "manual"
                  ? "bg-brand-chartreuse text-brand-black shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Mesa Presencial
            </button>
          </div>

          {/* Contenido según método */}
          {metodo === "digital" ? (
            <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-gray-300">
                El sistema ejecuta un sorteo aleatorio equiprobable para determinar
                el orden definitivo de clasificación.
              </p>
              <button
                type="button"
                onClick={ejecutarSorteoDigital}
                disabled={animandoSorteo || loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider border border-white/10 transition-colors cursor-pointer"
              >
                <Shuffle
                  className={`size-4 text-brand-chartreuse ${
                    animandoSorteo ? "animate-spin" : ""
                  }`}
                />
                {animandoSorteo ? "Sorteando..." : "Realizar Sorteo Aleatorio"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-gray-300">
                Para sorteos físicos realizados en mesa de control (moneda o papelitos).
                Podés intercambiar los puestos según el resultado presencial.
              </p>
              {parejasEmpatadas.length === 2 && (
                <button
                  type="button"
                  onClick={handleIntercambiarManual}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors cursor-pointer border border-white/5"
                >
                  <Shuffle className="size-3.5 text-brand-chartreuse" />
                  Intercambiar puestos
                </button>
              )}
            </div>
          )}

          {/* Lista de Parejas con Posición Asignada */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-brand-ayuda">
              Resultado del Sorteo
            </span>
            <div className="space-y-2">
              {parejasEmpatadas.map((p) => {
                const pos = asignaciones[p.inscripcionId];
                return (
                  <div
                    key={p.inscripcionId}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {p.nombre}
                      </p>
                      {p.club && (
                        <p className="text-xs text-gray-400 truncate">{p.club}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">
                        Puesto:
                      </span>
                      <span className="size-7 rounded-xl bg-brand-chartreuse text-brand-black font-black text-sm flex items-center justify-center">
                        {pos || "?"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campo de Motivo / Observaciones */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-brand-ayuda">
              Motivo / Constancia de Mesa (opcional)
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Sorteo presencial con moneda en presencia de fiscales"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-brand-chartreuse transition-colors"
            />
          </div>

          {/* Footer de Acciones */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-chartreuse text-brand-black text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg"
            >
              {loading ? "Registrando..." : "Confirmar y Aplicar"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

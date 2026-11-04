"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shuffle, AlertTriangle, CheckCircle2, ShieldCheck, ArrowUpDown, ChevronUp, ChevronDown, Pencil, Bell, Video, Calendar, Clock } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { sileo } from "sileo";

export interface ParejaEnSorteo {
  inscripcionId: string;
  nombre: string;
  club?: string;
  sorteoPosicion?: number | null;
  sorteoMotivo?: string | null;
  usuario_id?: string | null;
  usuario2_id?: string | null;
}

interface ModalSorteoZonaProps {
  isOpen: boolean;
  onClose: () => void;
  torneoId: string;
  nombreZona: string;
  parejasEmpatadas: ParejaEnSorteo[];
  posicionesEnDisputa: number[];
  onSuccess: () => void;
  modoInicial?: "sortear" | "notificar";
}

export const ModalSorteoZona: React.FC<ModalSorteoZonaProps> = ({
  isOpen,
  onClose,
  torneoId,
  nombreZona,
  parejasEmpatadas,
  posicionesEnDisputa,
  onSuccess,
  modoInicial = "sortear",
}) => {
  const esEdicionExistente = parejasEmpatadas.some(
    (p) => p.sorteoPosicion != null,
  );

  const [metodo, setMetodo] = useState<"digital" | "manual">(
    esEdicionExistente ? "manual" : "digital",
  );
  const [asignaciones, setAsignaciones] = useState<Record<string, number>>({});
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [animandoSorteo, setAnimandoSorteo] = useState(false);
  const [fechaHoraSorteo, setFechaHoraSorteo] = useState("");
  const [detalleTransmision, setDetalleTransmision] = useState("");
  const [notificando, setNotificando] = useState(false);
  const [avisoEnviado, setAvisoEnviado] = useState<{
    fechaHora: string;
    total: number;
  } | null>(null);
  const [mostrarNotificador, setMostrarNotificador] = useState(false);

  // Inicializar asignaciones si es manual o si ya existen
  React.useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      parejasEmpatadas.forEach((p, idx) => {
        initial[p.inscripcionId] =
          p.sorteoPosicion ?? posicionesEnDisputa[idx] ?? idx + 1;
      });
      setAsignaciones(initial);
      const motivoPrev =
        parejasEmpatadas.find((p) => p.sorteoMotivo)?.sorteoMotivo || "";
      setMotivo(motivoPrev);
      setAnimandoSorteo(false);
      setMetodo(esEdicionExistente ? "manual" : "digital");

      // Inicializar fecha y hora sugerida (próxima hora en punto)
      const now = new Date();
      now.setHours(now.getHours() + 2);
      now.setMinutes(0);
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const da = String(now.getDate()).padStart(2, "0");
      const hr = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      setFechaHoraSorteo(`${yr}-${mo}-${da}T${hr}:${mi}`);
      setMostrarNotificador(modoInicial === "notificar" || !esEdicionExistente);
      setAvisoEnviado(null);
    }
  }, [isOpen, parejasEmpatadas, posicionesEnDisputa, esEdicionExistente]);

  // Lista de posiciones disponibles para asignar a mano o sortear
  const opcionesPuestos = React.useMemo(() => {
    const set = new Set<number>();
    posicionesEnDisputa.forEach((p) => set.add(p));
    parejasEmpatadas.forEach((p, idx) => {
      if (p.sorteoPosicion != null) set.add(p.sorteoPosicion);
      set.add(idx + 1);
    });
    // Si hay 3 parejas o si alguna tiene asignado 3, incluir [1, 2, 3] para permitir mover al 3.°
    if (
      parejasEmpatadas.length >= 3 ||
      set.has(3) ||
      Math.max(...Array.from(set), 0) >= 3
    ) {
      set.add(1);
      set.add(2);
      set.add(3);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [posicionesEnDisputa, parejasEmpatadas]);

  if (!isOpen) return null;

  const ejecutarSorteoDigital = () => {
    setAnimandoSorteo(true);
    // Barajar aleatoriamente las posiciones entre las parejas empatadas
    const posicionesDisponibles = (
      posicionesEnDisputa.length === parejasEmpatadas.length
        ? [...posicionesEnDisputa]
        : [...opcionesPuestos].slice(0, parejasEmpatadas.length)
    ).sort(() => Math.random() - 0.5);

    const nuevasAsignaciones: Record<string, number> = {};
    parejasEmpatadas.forEach((p, idx) => {
      nuevasAsignaciones[p.inscripcionId] =
        posicionesDisponibles[idx] ?? idx + 1;
    });

    setTimeout(() => {
      setAsignaciones(nuevasAsignaciones);
      setAnimandoSorteo(false);
      setMotivo("Sorteo digital reglamentario ejecutado en plataforma");
    }, 450);
  };

  const handleCambiarPuesto = (inscripcionId: string, nuevaPos: number) => {
    const actualPos = asignaciones[inscripcionId];
    if (actualPos === nuevaPos) return;

    const prevOwner = Object.entries(asignaciones).find(
      ([id, val]) => id !== inscripcionId && val === nuevaPos,
    );

    if (prevOwner) {
      // Intercambiar de forma directa entre ambas parejas
      setAsignaciones((prev) => ({
        ...prev,
        [inscripcionId]: nuevaPos,
        [prevOwner[0]]: actualPos,
      }));
    } else {
      setAsignaciones((prev) => ({
        ...prev,
        [inscripcionId]: nuevaPos,
      }));
    }
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


  const handleEnviarNotificacion = async () => {
    if (!fechaHoraSorteo.trim()) {
      sileo.error({
        title: "Fecha y hora requeridas",
        description: "Indicá el día y horario en que se realizará el sorteo.",
      });
      return;
    }

    setNotificando(true);
    try {
      const formattedFechaHora = fechaHoraSorteo.replace("T", " ");
      const res = await TorneosService.notificarSorteoZona(
        torneoId,
        nombreZona,
        {
          fechaHora: formattedFechaHora,
          mensaje: detalleTransmision.trim() || undefined,
          inscripcionIds: parejasEmpatadas.map((p) => p.inscripcionId),
        },
      );

      const totalNotif = res?.data?.totalNotificados ?? 0;
      setAvisoEnviado({
        fechaHora: formattedFechaHora,
        total: totalNotif,
      });

      sileo.success({
        title: "Aviso de sorteo enviado",
        description: `Se notificó a los jugadores de ${nombreZona} para el ${formattedFechaHora}.`,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al enviar la notificación.";
      sileo.error({
        title: "No se pudo enviar el aviso",
        description: msg,
      });
    } finally {
      setNotificando(false);
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

      const motivoFinal =
        motivo.trim() ||
        (esEdicionExistente
          ? "Corrección manual de sorteo de zona"
          : metodo === "digital"
            ? "Sorteo digital reglamentario FAP"
            : "Sorteo presencial en mesa de control");

      await TorneosService.resolverSorteoZona(torneoId, nombreZona, {
        resoluciones,
        motivo: motivoFinal,
        metodo,
      });

      sileo.success({
        title: esEdicionExistente
          ? "Sorteo corregido con éxito"
          : "Sorteo registrado con éxito",
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

        {/* Modal Dialog: altura acotada + footer fijo (notebook 1366×768) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative flex w-full max-w-lg max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-3xl bg-[#141414] border border-white/10 shadow-2xl text-gray-200"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-chartreuse/10 text-brand-chartreuse text-xs font-black uppercase tracking-wider border border-brand-chartreuse/20">
                  <ShieldCheck className="size-3.5" />
                  {esEdicionExistente ? "Modificación Manual" : "Reglamento Oficial"}
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  {esEdicionExistente
                    ? "Corregir Puestos de Sorteo"
                    : "Sorteo Reglamentario"}{" "}
                  · {nombreZona}
                </h3>
                <p className="text-xs text-gray-400">
                  {esEdicionExistente
                    ? "Asignación manual de puestos según el resultado de la mesa presencial o corrección."
                    : `Resolución de empate técnico absoluto para definir puestos ${opcionesPuestos
                        .map((p) => `${p}.º`)
                        .join(", ")}.`}
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

            {/* R10: Notificar a las parejas del sorteo */}
            {!esEdicionExistente && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="size-4 text-amber-300 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-200">
                      Aviso previo a las parejas
                    </span>
                  </div>
                  {avisoEnviado ? (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                      <CheckCircle2 className="size-3" />
                      Aviso Enviado
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Requerido
                    </span>
                  )}
                </div>

                {avisoEnviado ? (
                  <div className="p-2.5 rounded-xl bg-green-950/30 border border-green-500/30 flex items-center justify-between gap-3 text-xs text-green-200">
                    <span>
                      Aviso enviado para el <strong>{avisoEnviado.fechaHora}</strong> ({avisoEnviado.total} jugador(es) notificados).
                    </span>
                    <button
                      type="button"
                      onClick={() => setAvisoEnviado(null)}
                      className="text-[11px] underline text-green-300 hover:text-white shrink-0 cursor-pointer"
                    >
                      Reenviar o editar
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Antes de resolver el empate, los jugadores tienen que enterarse. Enviá un aviso con día y hora del sorteo.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                          Día y Hora del Sorteo
                        </label>
                        <input
                          type="datetime-local"
                          value={fechaHoraSorteo}
                          onChange={(e) => setFechaHoraSorteo(e.target.value)}
                          className="w-full h-9 rounded-xl bg-black/40 border border-white/10 px-2.5 text-xs text-white outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                          Transmisión o lugar (opcional)
                        </label>
                        <input
                          type="text"
                          value={detalleTransmision}
                          onChange={(e) => setDetalleTransmision(e.target.value)}
                          placeholder="Ej: Google Meet, Zoom o mesa de control"
                          className="w-full h-9 rounded-xl bg-black/40 border border-white/10 px-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-400">
                        Manda notificación in-app y push a los jugadores empatados.
                      </span>
                      <button
                        type="button"
                        onClick={handleEnviarNotificacion}
                        disabled={notificando || !fechaHoraSorteo}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow"
                      >
                        <Bell className="size-3.5" />
                        {notificando ? "Enviando..." : "Notificar"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

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
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/5 text-gray-300 text-xs">
                  <Video className="size-4 text-brand-chartreuse shrink-0 mt-0.5" />
                  <span>
                    El sorteo digital se puede mostrar en vivo a los jugadores por videollamada compartiendo pantalla, o grabando la pantalla al tocar <strong>«Realizar Sorteo»</strong> para enviarlo a los capitanes.
                  </span>
                </div>
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
                  Podés asignar manualmente el puesto de cada pareja (por ejemplo, si salió 3.º podés asignarle 3.º puesto) o intercambiarlas.
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
                        {metodo === "manual" ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={pos || ""}
                              onChange={(e) =>
                                handleCambiarPuesto(
                                  p.inscripcionId,
                                  Number(e.target.value),
                                )
                              }
                              className="h-8 min-w-24 rounded-xl border border-brand-chartreuse/40 bg-[#1e1e1e] px-2 text-center text-xs font-black text-brand-chartreuse outline-none focus:border-brand-chartreuse cursor-pointer"
                            >
                              {opcionesPuestos.map((puesto) => (
                                <option key={puesto} value={puesto}>
                                  {puesto}.º puesto
                                </option>
                              ))}
                            </select>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                title="Subir puesto (mejor posición)"
                                onClick={() => {
                                  const idx = opcionesPuestos.indexOf(pos);
                                  if (idx > 0)
                                    handleCambiarPuesto(
                                      p.inscripcionId,
                                      opcionesPuestos[idx - 1],
                                    );
                                }}
                                disabled={loading || opcionesPuestos.indexOf(pos) <= 0}
                                className="size-4 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronUp className="size-3" />
                              </button>
                              <button
                                type="button"
                                title="Bajar puesto"
                                onClick={() => {
                                  const idx = opcionesPuestos.indexOf(pos);
                                  if (
                                    idx >= 0 &&
                                    idx < opcionesPuestos.length - 1
                                  ) {
                                    handleCambiarPuesto(
                                      p.inscripcionId,
                                      opcionesPuestos[idx + 1],
                                    );
                                  }
                                }}
                                disabled={
                                  loading ||
                                  opcionesPuestos.indexOf(pos) === -1 ||
                                  opcionesPuestos.indexOf(pos) >=
                                    opcionesPuestos.length - 1
                                }
                                className="size-4 flex items-center justify-center rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronDown className="size-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="size-7 rounded-xl bg-brand-chartreuse text-brand-black font-black text-sm flex items-center justify-center shadow">
                              {pos || "?"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMetodo("manual")}
                              title="Ajustar puesto a mano"
                              className="p-1 rounded-lg text-gray-400 hover:text-brand-chartreuse hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campo de Motivo / Observaciones */}
            <div className="space-y-1.5 pb-2">
              <label className="text-xs font-black uppercase tracking-wider text-brand-ayuda">
                Motivo / Constancia de Mesa (opcional)
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={
                  esEdicionExistente
                    ? "Ej: Corrección manual de puestos tras sorteo en mesa"
                    : "Ej: Sorteo presencial con moneda en presencia de fiscales"
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-brand-chartreuse transition-colors"
              />
            </div>
          </div>

          {/* Footer fijo */}
          <div className="shrink-0 flex items-center justify-end gap-3 border-t border-white/10 bg-[#141414] px-6 py-4">
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
              {loading
                ? "Registrando..."
                : esEdicionExistente
                  ? "Guardar Corrección"
                  : "Confirmar y Aplicar"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

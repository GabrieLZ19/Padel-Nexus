"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, CalendarRange, Trash2, X } from "lucide-react";
import { sileo } from "sileo";
import { ClubPanelService } from "@/utils/services/club-panel";
import { ClubesService } from "@/utils/services/clubes";
import type {
  BloqueoDisponibilidad,
  BloqueoTipo,
  Cancha,
} from "@/utils/types";
import FeedbackModal from "@/components/ui/FeedbackModal";
import CustomDropdown from "@/components/ui/CustomDropdown";

type Mode = "club-panel" | "admin";

interface BloquearHorariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  canchas: Cancha[];
  mode?: Mode;
  /** Requerido en mode=admin */
  clubId?: string;
}

const TIPOS: Array<{ id: BloqueoTipo; label: string }> = [
  { id: "torneo", label: "Torneo" },
  { id: "abono", label: "Abono / fijo" },
  { id: "mantenimiento", label: "Mantenimiento" },
  { id: "otro", label: "Otro" },
];

function fmtDate(iso: string) {
  const d = String(iso).slice(0, 10);
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

function fmtTime(t: string) {
  return String(t).slice(0, 5);
}

export function BloquearHorariosModal({
  isOpen,
  onClose,
  onSuccess,
  canchas,
  mode = "club-panel",
  clubId,
}: BloquearHorariosModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [horaInicio, setHoraInicio] = useState("10:00");
  const [horaFin, setHoraFin] = useState("18:00");
  const [canchaId, setCanchaId] = useState<string>("todas");
  const [tipo, setTipo] = useState<BloqueoTipo>("torneo");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [bloqueos, setBloqueos] = useState<BloqueoDisponibilidad[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({ isOpen: false, id: null });

  const canchaOptions = [
    { value: "todas", label: "Todas las canchas" },
    ...canchas.map((c) => ({ value: String(c.id), label: c.nombre })),
  ];

  const loadBloqueos = useCallback(async () => {
    setLoadingList(true);
    try {
      const list =
        mode === "admin" && clubId
          ? await ClubesService.getBloqueos(clubId)
          : await ClubPanelService.getBloqueos();
      setBloqueos(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudieron cargar los bloqueos";
      sileo.error({ title: msg });
    } finally {
      setLoadingList(false);
    }
  }, [mode, clubId]);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBloqueos();
  }, [isOpen, loadBloqueos]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!fechaInicio || !fechaFin) {
      sileo.error({ title: "Indicá el período de días" });
      return;
    }
    if (fechaFin < fechaInicio) {
      sileo.error({ title: "La fecha fin no puede ser anterior al inicio" });
      return;
    }
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const sMin = toMin(horaInicio);
    const rawEMin = toMin(horaFin);
    const eMin = rawEMin <= sMin ? rawEMin + 1440 : rawEMin;
    if (eMin - sMin <= 0) {
      sileo.error({ title: "La hora fin no puede ser igual a la de inicio" });
      return;
    }
    if (eMin - sMin > 720) {
      sileo.error({ title: "La franja de bloqueo no puede superar las 12 horas" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cancha_id: canchaId === "todas" ? null : canchaId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        motivo: motivo.trim() || null,
        tipo,
      };
      if (mode === "admin") {
        if (!clubId) throw new Error("Falta clubId");
        await ClubesService.crearBloqueo(clubId, payload);
      } else {
        await ClubPanelService.crearBloqueo(payload);
      }
      sileo.success({ title: "Franja bloqueada para reservas" });
      setMotivo("");
      await loadBloqueos();
      onSuccess?.();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        (e instanceof Error ? e.message : "No se pudo crear el bloqueo");
      sileo.error({ title: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const id = confirmDelete.id;
    if (!id) return;
    try {
      if (mode === "admin") {
        if (!clubId) throw new Error("Falta clubId");
        await ClubesService.eliminarBloqueo(clubId, id);
      } else {
        await ClubPanelService.eliminarBloqueo(id);
      }
      sileo.success({ title: "Bloqueo desactivado" });
      setConfirmDelete({ isOpen: false, id: null });
      await loadBloqueos();
      onSuccess?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "No se pudo desactivar";
      sileo.error({ title: msg });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md px-6 py-5">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center">
                <Ban className="size-4 text-brand-chartreuse" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">
                  Bloquear horarios
                </h2>
                <p className="text-xs text-gray-400">
                  Sacá franjas del aire para reservas (abonos, torneos, mantenimiento).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 hover:bg-white/5 hover:text-white cursor-pointer transition-colors"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Desde
                </span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-brand-input px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-chartreuse/50 [color-scheme:dark] transition-colors"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Hasta
                </span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-brand-input px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-chartreuse/50 [color-scheme:dark] transition-colors"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Hora inicio
                </span>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-brand-input px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-chartreuse/50 [color-scheme:dark] transition-colors"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Hora fin
                </span>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-brand-input px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-chartreuse/50 [color-scheme:dark] transition-colors"
                />
              </label>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1.5">
                Cancha
              </span>
              <CustomDropdown
                value={canchaId}
                onChange={setCanchaId}
                options={canchaOptions}
                placeholder="Seleccionar cancha..."
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                Motivo
              </span>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipo(t.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                      tipo === t.id
                        ? "border-brand-chartreuse/50 bg-brand-chartreuse/15 text-brand-chartreuse"
                        : "border-white/5 bg-brand-input text-gray-400 hover:text-white hover:border-white/10"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Torneo FAP sábado / Abono matutino"
                className="w-full rounded-xl border border-white/10 bg-brand-input px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-brand-chartreuse/50 transition-colors"
              />
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="w-full rounded-xl bg-brand-chartreuse py-3 text-sm font-black text-brand-black hover:brightness-110 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-brand-chartreuse/10"
            >
              <CalendarRange className="size-4" />
              {saving ? "Guardando…" : "Bloquear franja"}
            </button>

            <div className="border-t border-white/10 pt-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                Bloqueos activos
              </h3>
              {loadingList ? (
                <p className="text-sm text-gray-500">Cargando…</p>
              ) : bloqueos.length === 0 ? (
                <p className="text-sm text-gray-500 py-3 text-center italic border border-dashed border-white/5 rounded-2xl">
                  No hay bloqueos activos en este club.
                </p>
              ) : (
                <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {bloqueos.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3.5 py-3 hover:border-white/10 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">
                          {fmtDate(b.fecha_inicio)} → {fmtDate(b.fecha_fin)} ·{" "}
                          {fmtTime(b.hora_inicio)}–{fmtTime(b.hora_fin)}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {b.cancha_id
                            ? b.canchas?.nombre || "Cancha"
                            : "Todas las canchas"}{" "}
                          · {b.tipo}
                          {b.motivo ? ` · ${b.motivo}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({ isOpen: true, id: b.id })
                        }
                        className="shrink-0 rounded-lg p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                        title="Desactivar bloqueo"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <FeedbackModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        type="warning"
        title="¿Desactivar este bloqueo?"
        description="Los turnos de esa franja volverán a estar disponibles para reservas online."
        confirmText="Desactivar"
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}

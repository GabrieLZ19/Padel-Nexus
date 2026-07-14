"use client";

import { useEffect, useState } from "react";
import {
  Grid,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ClubPanelService } from "@/utils/services/club-panel";
import type { Cancha, Turno } from "@/utils/types";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";
import CustomDropdown from "@/components/ui/CustomDropdown";

export default function ClubCanchasPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCanchaId, setExpandedCanchaId] = useState<string | null>(null);

  // Modales
  const [isCanchaModalOpen, setIsCanchaModalOpen] = useState(false);
  const [isTurnoModalOpen, setIsTurnoModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Cancha
  const [canchaForm, setCanchaForm] = useState({
    nombre: "",
    tipo_suelo: "Sintético",
    techada: false,
  });
  const [editingCanchaId, setEditingCanchaId] = useState<string | null>(null);

  // Form Turno
  const [selectedCanchaId, setSelectedCanchaId] = useState<string | null>(null);
  const [turnoForm, setTurnoForm] = useState({
    hora_inicio: "18:00",
    hora_fin: "19:30",
    precio: 8000,
    dia_semana: 1, // Lunes
  });

  // Filtro de día activo para visualización de turnos
  const [activeDayTab, setActiveDayTab] = useState<number>(1);

  // Feedback Modal
  const [feedback, setFeedback] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
    onClose: () => setFeedback((prev) => ({ ...prev, isOpen: false })),
  });

  const fetchCanchas = async () => {
    try {
      const data = await ClubPanelService.getCanchas();
      setCanchas(data);
    } catch (err) {
      console.error("Error al obtener canchas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanchas();
  }, []);

  const handleOpenCanchaModal = (cancha?: Cancha) => {
    if (cancha) {
      setEditingCanchaId(cancha.id);
      setCanchaForm({
        nombre: cancha.nombre,
        tipo_suelo: cancha.tipo_suelo || "Sintético",
        techada: cancha.techada,
      });
    } else {
      setEditingCanchaId(null);
      setCanchaForm({
        nombre: "",
        tipo_suelo: "Sintético",
        techada: false,
      });
    }
    setIsCanchaModalOpen(true);
  };

  const handleSaveCancha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCanchaId) {
        await ClubPanelService.actualizarCancha(editingCanchaId, canchaForm);
      } else {
        await ClubPanelService.crearCancha(canchaForm);
      }
      setIsCanchaModalOpen(false);
      fetchCanchas();
    } catch (err) {
      console.error("Error al guardar cancha:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancha = (canchaId: string) => {
    setFeedback({
      isOpen: true,
      title: "Eliminar Cancha",
      description:
        "¿Está seguro de que desea eliminar esta cancha? Se borrarán todos sus turnos y configuraciones de forma definitiva.",
      type: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedback((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        try {
          await ClubPanelService.eliminarCancha(canchaId);
          setFeedback((prev) => ({ ...prev, isOpen: false }));
          fetchCanchas();
        } catch (err) {
          console.error("Error al eliminar cancha:", err);
        }
      },
    });
  };

  const handleOpenTurnoModal = (canchaId: string) => {
    setSelectedCanchaId(canchaId);
    setTurnoForm({
      hora_inicio: "18:00",
      hora_fin: "19:30",
      precio: 8000,
      dia_semana: 1,
    });
    setIsTurnoModalOpen(true);
  };

  const handleSaveTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCanchaId) return;
    setSaving(true);
    try {
      await ClubPanelService.crearTurno(selectedCanchaId, {
        ...turnoForm,
        hora_inicio: `${turnoForm.hora_inicio}:00`,
        hora_fin: `${turnoForm.hora_fin}:00`,
      });
      setIsTurnoModalOpen(false);
      fetchCanchas();
    } catch (err) {
      console.error("Error al guardar turno:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTurno = (turnoId: string) => {
    setFeedback({
      isOpen: true,
      title: "Eliminar Turno",
      description:
        "¿Está seguro de que desea eliminar este turno semanal de la plantilla?",
      type: "warning",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedback((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        try {
          await ClubPanelService.eliminarTurno(turnoId);
          setFeedback((prev) => ({ ...prev, isOpen: false }));
          fetchCanchas();
        } catch (err) {
          console.error("Error al eliminar turno:", err);
        }
      },
    });
  };

  const getDiaSemanaNombre = (dia: number) => {
    const dias = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return dias[dia] || String(dia);
  };

  const formatHora = (time: string) => {
    return time.slice(0, 5);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-brand-white/5 rounded-xl w-1/3" />
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-brand-white/5 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-white">
            Gestión de Canchas
          </h1>
          <p className="text-sm text-gray-400 mt-2 font-medium">
            Configure sus canchas físicas y la plantilla de turnos semanales
          </p>
        </div>
        <button
          onClick={() => handleOpenCanchaModal()}
          className="bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm shadow-brand-chartreuse/20 flex items-center gap-2 cursor-pointer w-fit"
        >
          <Plus className="size-4" /> Agregar Cancha
        </button>
      </div>

      {/* Grid de Canchas */}
      {canchas.length === 0 ? (
        <div className="text-center py-20 text-gray-500 border border-dashed border-brand-white/10 rounded-3xl bg-brand-card">
          <Grid className="size-16 mx-auto mb-4 opacity-30 text-brand-chartreuse" />
          <h3 className="text-xl font-bold text-brand-white mb-2">
            No hay canchas creadas
          </h3>
          <p className="text-sm mb-6">
            Comience agregando su primera cancha para recibir reservas.
          </p>
          <button
            onClick={() => handleOpenCanchaModal()}
            className="bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            Agregar Cancha
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {canchas.map((cancha) => {
            const isExpanded = expandedCanchaId === cancha.id;
            const turnosList = (cancha as any).turnos || [];

            return (
              <div
                key={cancha.id}
                className="bg-brand-card border border-brand-white/5 rounded-3xl shadow-xl overflow-hidden flex flex-col w-full"
              >
                {/* Cabecera Cancha */}
                <div className="p-6 flex items-start justify-between gap-4 border-b border-brand-white/5 bg-brand-card/50">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-brand-white truncate">
                      {cancha.nombre}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-chartreuse bg-brand-chartreuse/10 px-2 py-0.5 rounded border border-brand-chartreuse/20">
                        {cancha.tipo_suelo || "Piso Estándar"}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {cancha.techada ? "Techada" : "Descubierta"}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          cancha.activa
                            ? "text-green-400 bg-green-500/10 border-green-500/20"
                            : "text-red-400 bg-red-500/10 border-red-500/20"
                        }`}
                      >
                        {cancha.activa ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenCanchaModal(cancha)}
                      className="p-2 rounded-lg bg-brand-white/5 hover:bg-brand-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                      title="Editar Cancha"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCancha(cancha.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      title="Eliminar Cancha"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Acordeón de Turnos */}
                <div className="flex-1 flex flex-col">
                  <button
                    onClick={() =>
                      setExpandedCanchaId(isExpanded ? null : cancha.id)
                    }
                    className="w-full px-6 py-4 flex items-center justify-between text-sm font-bold text-gray-400 hover:bg-brand-white/2 hover:text-brand-white transition-all cursor-pointer border-b border-brand-white/5"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="size-4 text-brand-chartreuse" />
                      Plantilla de Turnos ({turnosList.length})
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="flex-1 p-6 space-y-5 bg-brand-black/20">
                      {/* Cabecera y botón de acción */}
                      <div className="flex justify-between items-center border-b border-brand-white/5 pb-3">
                        <div>
                          <h4 className="text-sm font-black text-brand-white">
                            Horarios Semanales
                          </h4>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Seleccione un día para administrar su plantilla de
                            turnos.
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenTurnoModal(cancha.id)}
                          className="text-xs font-black text-brand-chartreuse hover:opacity-80 transition-opacity flex items-center gap-1 cursor-pointer bg-brand-chartreuse/5 px-3 py-1.5 rounded-xl border border-brand-chartreuse/10"
                        >
                          <Plus className="size-3.5" /> Agregar Turno
                        </button>
                      </div>

                      {/* Tabs de días de la semana */}
                      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                        {[
                          { value: 1, label: "Lunes" },
                          { value: 2, label: "Martes" },
                          { value: 3, label: "Miércoles" },
                          { value: 4, label: "Jueves" },
                          { value: 5, label: "Viernes" },
                          { value: 6, label: "Sábado" },
                          { value: 0, label: "Domingo" },
                        ].map((d) => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setActiveDayTab(d.value)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                              activeDayTab === d.value
                                ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse shadow-sm"
                                : "text-gray-400 border-brand-white/5 hover:text-brand-white hover:bg-brand-white/5"
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>

                      {/* Listado filtrado */}
                      {turnosList.length === 0 ? (
                        <p className="text-xs text-gray-500 py-6 text-center italic">
                          No hay turnos creados para esta cancha.
                        </p>
                      ) : turnosList.filter(
                          (t: Turno) => t.dia_semana === activeDayTab,
                        ).length === 0 ? (
                        <p className="text-xs text-gray-500 py-10 text-center italic border border-dashed border-brand-white/5 rounded-2xl">
                          No hay turnos configurados para este día de la semana.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-80 overflow-y-auto pr-1">
                          {turnosList
                            .filter((t: Turno) => t.dia_semana === activeDayTab)
                            .sort((a: Turno, b: Turno) =>
                              a.hora_inicio.localeCompare(b.hora_inicio),
                            )
                            .map((turno: Turno) => (
                              <div
                                key={turno.id}
                                className="bg-brand-card border border-brand-white/5 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-brand-white/10 transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="text-[11px] text-gray-500 flex items-center gap-1.5 font-medium">
                                    <Clock className="size-3 text-brand-chartreuse" />
                                    {formatHora(turno.hora_inicio)} -{" "}
                                    {formatHora(turno.hora_fin)}
                                  </p>
                                  <p className="text-sm font-black text-brand-white mt-1">
                                    $
                                    {Number(turno.precio).toLocaleString(
                                      "es-AR",
                                    )}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteTurno(turno.id)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Eliminar Turno"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cancha */}
      {isCanchaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-brand-card border border-brand-white/10 rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-black text-brand-white mb-6">
              {editingCanchaId ? "Editar Cancha" : "Agregar Nueva Cancha"}
            </h2>
            <form onSubmit={handleSaveCancha} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Nombre de la Cancha
                </label>
                <input
                  type="text"
                  required
                  value={canchaForm.nombre}
                  onChange={(e) =>
                    setCanchaForm({ ...canchaForm, nombre: e.target.value })
                  }
                  placeholder="Ej. Cancha Central, Cancha 2, etc."
                  className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Tipo de Suelo
                </label>
                <CustomDropdown
                  value={canchaForm.tipo_suelo}
                  onChange={(val) =>
                    setCanchaForm({ ...canchaForm, tipo_suelo: val })
                  }
                  options={[
                    { value: "Sintético", label: "Césped Sintético" },
                    { value: "Cemento", label: "Cemento" },
                    { value: "Parquet", label: "Parquet" },
                    { value: "Polvo de Ladrillo", label: "Polvo de Ladrillo" },
                    { value: "Vidrio Templado", label: "Vidrio Templado" },
                  ]}
                  placeholder="Seleccionar tipo de suelo"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-b border-brand-white/5">
                <div>
                  <h4 className="text-sm font-bold text-brand-white">
                    ¿Está techada?
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Define si posee cobertura climática
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCanchaForm({
                      ...canchaForm,
                      techada: !canchaForm.techada,
                    })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    canchaForm.techada
                      ? "bg-brand-chartreuse"
                      : "bg-brand-white/10"
                  }`}
                >
                  <div
                    className={`bg-brand-black w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      canchaForm.techada ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCanchaModalOpen(false)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-brand-chartreuse text-brand-black rounded-xl text-sm font-black transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Turno */}
      {isTurnoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-brand-card border border-brand-white/10 rounded-3xl p-6 lg:p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-black text-brand-white mb-6">
              Agregar Turno Semanal
            </h2>
            <form onSubmit={handleSaveTurno} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Día de la Semana
                </label>
                <select
                  value={turnoForm.dia_semana}
                  onChange={(e) =>
                    setTurnoForm({
                      ...turnoForm,
                      dia_semana: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                >
                  <option value={1}>Lunes</option>
                  <option value={2}>Martes</option>
                  <option value={3}>Miércoles</option>
                  <option value={4}>Jueves</option>
                  <option value={5}>Viernes</option>
                  <option value={6}>Sábado</option>
                  <option value={0}>Domingo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    required
                    value={turnoForm.hora_inicio}
                    onChange={(e) =>
                      setTurnoForm({
                        ...turnoForm,
                        hora_inicio: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    required
                    value={turnoForm.hora_fin}
                    onChange={(e) =>
                      setTurnoForm({ ...turnoForm, hora_fin: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Precio (ARS)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={turnoForm.precio}
                  onChange={(e) =>
                    setTurnoForm({
                      ...turnoForm,
                      precio: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="Ej. 8000"
                  className="w-full px-4 py-3 bg-brand-black border border-brand-white/5 rounded-xl text-sm text-brand-white focus:outline-none focus:border-brand-chartreuse/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTurnoModalOpen(false)}
                  className="flex-1 py-3 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-brand-chartreuse text-brand-black rounded-xl text-sm font-black transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Feedback Modal para confirmaciones de borrado */}
      <FeedbackModal
        isOpen={feedback.isOpen}
        onClose={feedback.onClose}
        title={feedback.title}
        description={feedback.description}
        type={feedback.type}
        confirmText={feedback.confirmText}
        cancelText={feedback.cancelText}
        onConfirm={feedback.onConfirm}
      />
    </div>
  );
}

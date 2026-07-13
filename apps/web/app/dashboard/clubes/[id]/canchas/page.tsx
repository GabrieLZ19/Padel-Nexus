"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Loader2,
  Save,
  X,
  Sun,
  CloudRain,
} from "lucide-react";
import { api } from "@/utils/api";
import type { Cancha, Turno } from "@/utils/types/club.types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal, { FeedbackModalProps } from "@/components/ui/FeedbackModal";

interface ClubDetalle {
  id: string;
  nombre: string;
}

export default function CanchasAdminPage() {
  const params = useParams();
  const clubId = params.id as string;

  const [club, setClub] = useState<ClubDetalle | null>(null);
  const [canchas, setCanchas] = useState<(Cancha & { turnos?: Turno[] })[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para agrupar turnos por día
  const [activeDayByCancha, setActiveDayByCancha] = useState<Record<string, number>>({});

  // Feedback Modal
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  // Modal de cancha
  const [showModal, setShowModal] = useState(false);
  const [editingCancha, setEditingCancha] = useState<Cancha | null>(null);
  const [formCancha, setFormCancha] = useState({
    nombre: "",
    tipo_suelo: "",
    techada: false,
  });
  const [saving, setSaving] = useState(false);

  // Modal de turno
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const [turnoParaCancha, setTurnoParaCancha] = useState<string>("");
  const [formTurno, setFormTurno] = useState({
    hora_inicio: "08:00",
    hora_fin: "09:30",
    precio: "",
    dia_semana: "1",
  });

  const diasSemana = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  // Fetch club y canchas
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clubRes, canchasRes] = await Promise.all([
        api.get(`/clubes/${clubId}`),
        api.get(`/clubes/${clubId}/canchas`),
      ]);
      setClub(clubRes.data.data);
      setCanchas(canchasRes.data.data || []);
    } catch (err: any) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers de cancha
  const openNewCancha = () => {
    setEditingCancha(null);
    setFormCancha({ nombre: "", tipo_suelo: "", techada: false });
    setShowModal(true);
  };

  const openEditCancha = (cancha: Cancha) => {
    setEditingCancha(cancha);
    setFormCancha({
      nombre: cancha.nombre,
      tipo_suelo: cancha.tipo_suelo || "",
      techada: cancha.techada,
    });
    setShowModal(true);
  };

  const saveCancha = async () => {
    setSaving(true);
    try {
      if (editingCancha) {
        // Actualizar cancha existente
        await api.put(`/clubes/canchas/${editingCancha.id}`, {
          nombre: formCancha.nombre,
          tipo_suelo: formCancha.tipo_suelo,
          techada: formCancha.techada,
        });
      } else {
        // Crear nueva cancha
        await api.post(`/clubes/${clubId}/canchas`, {
          nombre: formCancha.nombre,
          tipo_suelo: formCancha.tipo_suelo,
          techada: formCancha.techada,
        });
      }
      await fetchData();
      setShowModal(false);
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description: err.response?.data?.error || "Ocurrió un problema al guardar la cancha.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCancha = (canchaId: string) => {
    setFeedbackModal({
      isOpen: true,
      type: "danger",
      title: "Eliminar Cancha",
      description: "¿Estás seguro de que deseas eliminar esta cancha y todos sus turnos? Esta acción no se puede deshacer.",
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await api.delete(`/clubes/canchas/${canchaId}`);
          await fetchData();
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "¡Eliminada!",
            description: "La cancha fue borrada exitosamente.",
            onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        } catch (err: any) {
          setFeedbackModal({
            isOpen: true,
            type: "error",
            title: "Error al eliminar",
            description: err.response?.data?.error || "Error al eliminar la cancha.",
            onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }
      }
    });
  };

  // Handlers de turno
  const openNewTurno = (canchaId: string) => {
    setTurnoParaCancha(canchaId);
    setFormTurno({ hora_inicio: "08:00", hora_fin: "09:30", precio: "", dia_semana: "1" });
    setShowTurnoModal(true);
  };

  const saveTurno = async () => {
    setSaving(true);
    try {
      await api.post(`/clubes/canchas/${turnoParaCancha}/turnos`, {
        hora_inicio: formFormatedTime(formTurno.hora_inicio),
        hora_fin: formFormatedTime(formTurno.hora_fin),
        precio: Number(formTurno.precio),
        dia_semana: Number(formTurno.dia_semana),
      });
      await fetchData();
      setShowTurnoModal(false);
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description: err.response?.data?.error || "Ocurrió un problema al guardar el turno.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteTurno = (turnoId: string) => {
    setFeedbackModal({
      isOpen: true,
      type: "danger",
      title: "Eliminar Turno",
      description: "¿Estás seguro de que deseas eliminar este turno?",
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await api.delete(`/clubes/turnos/${turnoId}`);
          await fetchData();
          setFeedbackModal({
            isOpen: true,
            type: "success",
            title: "¡Eliminado!",
            description: "El turno fue borrado exitosamente.",
            onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        } catch (err: any) {
          setFeedbackModal({
            isOpen: true,
            type: "error",
            title: "Error al eliminar",
            description: err.response?.data?.error || "Error al eliminar el turno.",
            onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }
      }
    });
  };

  const formFormatedTime = (timeStr: string) => {
    if (timeStr.split(":").length === 2) {
      return `${timeStr}:00`;
    }
    return timeStr;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 sm:p-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/clubes"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand-chartreuse transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a clubes
          </Link>
          <h1 className="text-2xl font-bold">
            Gestión de Canchas {club ? `— ${club.nombre}` : ""}
          </h1>
        </div>
        <button
          onClick={openNewCancha}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-chartreuse text-black font-semibold rounded-xl hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva cancha
        </button>
      </div>

      {/* Listado de canchas */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-chartreuse" />
        </div>
      ) : canchas.length === 0 ? (
        <div className="text-center py-16 bg-[#111] rounded-2xl border border-white/5">
          <Sun className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            Sin canchas registradas
          </h3>
          <p className="text-gray-500 mb-4">
            Agregá las canchas de este club para que los usuarios puedan reservar turnos.
          </p>
          <button
            onClick={openNewCancha}
            className="px-4 py-2 bg-brand-chartreuse text-black font-semibold rounded-xl hover:brightness-110 transition-all"
          >
            Agregar primera cancha
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {canchas.map((cancha) => (
            <div
              key={cancha.id}
              className="bg-[#111] border border-white/5 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-chartreuse/10 flex items-center justify-center">
                    {cancha.techada ? (
                      <Sun className="w-5 h-5 text-brand-chartreuse" />
                    ) : (
                      <CloudRain className="w-5 h-5 text-brand-moss" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{cancha.nombre}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {cancha.tipo_suelo && <span>{cancha.tipo_suelo}</span>}
                      <span>{cancha.techada ? "Techada" : "Descubierta"}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          cancha.activa
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {cancha.activa ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openNewTurno(cancha.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-chartreuse/10 text-brand-chartreuse rounded-lg hover:bg-brand-chartreuse/20 transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Agregar turno
                  </button>
                  <button
                    onClick={() => openEditCancha(cancha)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteCancha(cancha.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pestañas de Día de la Semana */}
              <div className="flex flex-wrap gap-1 border-b border-white/5 pb-3 mb-4 mt-2 overflow-x-auto">
                {diasSemana.map((dia, idx) => {
                  const activeDay = activeDayByCancha[cancha.id] ?? 1;
                  const isSelected = activeDay === idx;
                  const count = (cancha.turnos || []).filter((t) => t.dia_semana === idx).length;
                  return (
                    <button
                      key={dia}
                      onClick={() => setActiveDayByCancha((prev) => ({ ...prev, [cancha.id]: idx }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-brand-chartreuse text-black shadow-[0_0_10px_rgba(203,254,1,0.1)]"
                          : "bg-white/5 text-gray-400 hover:text-white"
                      }`}
                    >
                      {dia} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Tabla de turnos filtrados */}
              {(() => {
                const activeDay = activeDayByCancha[cancha.id] ?? 1;
                const turnosFiltrados = (cancha.turnos || []).filter((t) => t.dia_semana === activeDay);

                if (turnosFiltrados.length === 0) {
                  return (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No hay turnos configurados para el {diasSemana[activeDay].toLowerCase()}.
                    </div>
                  );
                }

                return (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-left">
                          <th className="pb-2 font-medium">Inicio</th>
                          <th className="pb-2 font-medium">Fin</th>
                          <th className="pb-2 font-medium">Precio</th>
                          <th className="pb-2 font-medium text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {turnosFiltrados.map((turno) => (
                          <tr key={turno.id}>
                            <td className="py-2">{turno.hora_inicio.slice(0, 5)}</td>
                            <td className="py-2">{turno.hora_fin.slice(0, 5)}</td>
                            <td className="py-2 text-brand-chartreuse font-medium">
                              ${turno.precio}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                onClick={() => deleteTurno(turno.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cancha */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#151515] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">
                {editingCancha ? "Editar cancha" : "Nueva cancha"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formCancha.nombre}
                  onChange={(e) =>
                    setFormCancha({ ...formCancha, nombre: e.target.value })
                  }
                  placeholder="Ej: Cancha 1"
                  className="w-full px-4 py-2.5 bg-brand-input border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-chartreuse/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Tipo de suelo</label>
                <CustomDropdown
                  value={formCancha.tipo_suelo}
                  onChange={(val) => setFormCancha({ ...formCancha, tipo_suelo: val })}
                  options={[
                    { value: "Sintético", label: "Sintético" },
                    { value: "Cemento", label: "Cemento" },
                    { value: "Polvo de ladrillo", label: "Polvo de ladrillo" },
                    { value: "Césped", label: "Césped" },
                  ]}
                  placeholder="Seleccionar suelo..."
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={formCancha.techada}
                  onChange={(e) =>
                    setFormCancha({ ...formCancha, techada: e.target.checked })
                  }
                  className="w-4 h-4 accent-brand-chartreuse"
                />
                <span className="text-sm">Cancha techada</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveCancha}
                disabled={saving || !formCancha.nombre}
                className="flex items-center gap-2 px-4 py-2 bg-brand-chartreuse text-black font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Turno */}
      {showTurnoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#151515] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Nuevo turno</h2>
              <button
                onClick={() => setShowTurnoModal(false)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Día de la semana</label>
                <CustomDropdown
                  value={formTurno.dia_semana}
                  onChange={(val) => setFormTurno({ ...formTurno, dia_semana: val })}
                  options={diasSemana.map((dia, idx) => ({ value: String(idx), label: dia }))}
                  placeholder="Seleccionar día..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Hora inicio</label>
                  <input
                    type="time"
                    value={formTurno.hora_inicio}
                    onChange={(e) =>
                      setFormTurno({ ...formTurno, hora_inicio: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-brand-input border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-chartreuse/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Hora fin</label>
                  <input
                    type="time"
                    value={formTurno.hora_fin}
                    onChange={(e) =>
                      setFormTurno({ ...formTurno, hora_fin: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-brand-input border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-chartreuse/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Precio ($)</label>
                <input
                  type="number"
                  value={formTurno.precio}
                  onChange={(e) =>
                    setFormTurno({ ...formTurno, precio: e.target.value })
                  }
                  placeholder="15000"
                  className="w-full px-4 py-2.5 bg-brand-input border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-chartreuse/50"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTurnoModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveTurno}
                disabled={saving || !formTurno.precio}
                className="flex items-center gap-2 px-4 py-2 bg-brand-chartreuse text-black font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar turno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL (Éxito/Error) */}
      <FeedbackModal {...feedbackModal} />
    </div>
  );
}

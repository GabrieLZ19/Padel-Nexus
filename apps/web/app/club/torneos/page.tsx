"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Trophy,
  Building2,
  Calendar,
} from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { ClubPanelService } from "@/utils/services/club-panel";
import Pagination from "@/components/ui/Pagination";
import { Torneo, Club, FormTorneoState } from "@/utils/types";
import TorneoModal from "@/components/torneos/TorneoModal";
import FeedbackModal, { FeedbackModalProps } from "@/components/ui/FeedbackModal";

const TABS = ["Todos", "Activos", "Borradores", "Finalizados"];
const PAGE_SIZE = 6;

export default function ClubTorneosPage() {
  const router = useRouter();

  const [club, setClub] = useState<Club | null>(null);
  const [activeTab, setActiveTab] = useState<string>("Todos");
  const [search, setSearch] = useState<string>("");
  const [tournaments, setTournaments] = useState<Torneo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormTorneoState>({
    nombre: "",
    club_id: "",
    fecha: "",
    nivel: "5ª",
    rama: "Masculina",
    categoria: "Libres",
    estado: "Borrador",
    cupos_maximos: 16,
    modalidad: "Duplas",
    formato: "Eliminatoria Directa",
    precio_inscripcion: 0,
    alcance: "Provincial",
    asociacion: "FAP",
    premio_1: "",
    premio_2: "",
    premio_3: "",
    canchas_disponibles: 1,
    duracion_partido_minutos: 90,
    hora_inicio_jornada: "08:00",
  });

  const [currentPage, setCurrentPage] = useState(1);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
    title: "",
    description: "",
  });

  useEffect(() => {
    async function loadInitial() {
      try {
        const clubData = await ClubPanelService.getMiClub();
        setClub(clubData);
        if (clubData) {
          setFormData((prev) => ({ ...prev, club_id: String(clubData.id) }));
        }
      } catch (err) {
        console.error("Error al obtener club del usuario:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const loadData = async () => {
    if (!club) return;
    try {
      setLoading(true);
      const res = await TorneosService.getByPage(
        currentPage,
        PAGE_SIZE,
        search,
      );

      // Filtrar exclusivamente torneos correspondientes a este club
      const clubTorneos = (res.data || []).filter(
        (t) => String(t.club_id) === String(club.id),
      );

      setTournaments(clubTorneos);
      setTotal(clubTorneos.length);
    } catch (err) {
      console.error("Error al cargar torneos del club:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (club) {
      loadData();
    }
  }, [currentPage, search, club]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      nombre: "",
      club_id: club ? String(club.id) : "",
      fecha: "",
      nivel: "5ª",
      rama: "Masculina",
      categoria: "Libres",
      estado: "Borrador",
      cupos_maximos: 16,
      modalidad: "Duplas",
      formato: "Eliminatoria Directa",
      precio_inscripcion: 0,
      alcance: "Provincial",
      asociacion: "FAP",
      premio_1: "",
      premio_2: "",
      premio_3: "",
      canchas_disponibles: 1,
      duracion_partido_minutos: 90,
      hora_inicio_jornada: "08:00",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Torneo) => {
    setEditingId(t.id);
    setFormData({
      nombre: t.nombre || "",
      club_id: String(t.club_id || (club ? club.id : "")),
      fecha: t.fecha || "",
      nivel: t.nivel || "5ª",
      rama: (t as any).rama || "Masculina",
      categoria: t.categoria || "Libres",
      estado: t.estado || "Borrador",
      cupos_maximos: t.cupos_maximos || 16,
      modalidad: t.modalidad || "Duplas",
      formato: t.formato || "Eliminatoria Directa",
      precio_inscripcion: t.precio_inscripcion || 0,
      alcance: t.alcance || "Provincial",
      asociacion: (t as any).asociacion || "FAP",
      premio_1: t.premio_1 || "",
      premio_2: t.premio_2 || "",
      premio_3: t.premio_3 || "",
      canchas_disponibles: t.canchas_disponibles || 1,
      duracion_partido_minutos: t.duracion_partido_minutos || 90,
      hora_inicio_jornada: t.hora_inicio_jornada || "08:00",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.fecha) {
      setFeedbackModal({
        isOpen: true,
        type: "warning",
        title: "Campos Incompletos",
        description: "Completá el nombre y la fecha de inicio del torneo.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        ...formData,
        club_id: club ? String(club.id) : formData.club_id,
      };

      if (editingId) {
        await TorneosService.update(editingId, payload);
      } else {
        await TorneosService.create(payload);
      }

      setIsModalOpen(false);
      loadData();
      setFeedbackModal({
        isOpen: true,
        type: "success",
        title: editingId ? "¡Torneo Actualizado!" : "¡Torneo Creado!",
        description: editingId
          ? "Los cambios en el torneo se guardaron con éxito."
          : "El borrador del torneo ha sido generado con éxito.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        type: "danger",
        title: "Error al guardar",
        description: err?.response?.data?.message || err.message || "No se pudo guardar el torneo.",
        onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = (id: string, nombre: string) => {
    setFeedbackModal({
      isOpen: true,
      type: "danger",
      title: "¿Eliminar Torneo?",
      description: `¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        try {
          setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
          await TorneosService.delete(id);
          setFeedbackModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          loadData();
        } catch (err: any) {
          setFeedbackModal({
            isOpen: true,
            type: "danger",
            title: "Error al eliminar",
            description: err.message || "No se pudo eliminar el torneo.",
            onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
        }
      },
    });
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (activeTab === "Activos") return t.estado === "Inscripción" || t.estado === "En curso";
    if (activeTab === "Borradores") return t.estado === "Borrador";
    if (activeTab === "Finalizados") return t.estado === "Finalizado";
    return true;
  });

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-brand-white">
              Torneos del Club
            </h1>
            {club && (
              <span className="bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20 px-3 py-1 rounded-full text-xs font-black uppercase">
                {club.nombre}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 font-medium">
            Gestión y creación de competencias locales y provinciales para tu sede.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 bg-brand-chartreuse hover:opacity-90 text-brand-black px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] text-xs uppercase tracking-wider cursor-pointer shrink-0"
        >
          <Plus className="size-4" /> Crear Torneo
        </button>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-brand-white/5 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? "bg-brand-chartreuse text-brand-black shadow-lg"
                  : "bg-brand-card text-gray-400 hover:text-white border border-brand-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full bg-brand-card border border-brand-white/5 text-white pl-10 pr-4 py-2 rounded-xl text-xs focus:border-brand-white/10 outline-none"
          />
        </div>
      </div>

      {/* TABLA DE TORNEOS */}
      <div className="bg-brand-card border border-brand-white/5 rounded-3xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-500 animate-pulse">
            Cargando torneos de la sede...
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="p-16 text-center text-gray-500 space-y-3">
            <Trophy className="size-12 mx-auto opacity-30 text-brand-chartreuse" />
            <p className="text-sm font-bold text-white">No hay torneos registrados</p>
            <p className="text-xs text-gray-400">
              Creá un nuevo torneo local o provincial para comenzar a recibir inscripciones.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-white/5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="py-4 px-6">Torneo</th>
                  <th className="py-4 px-6">Fecha Inicio</th>
                  <th className="py-4 px-6">Alcance</th>
                  <th className="py-4 px-6 text-center">Inscritos</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-white/5 text-sm">
                {filteredTournaments.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-brand-white/2 transition-colors cursor-pointer"
                    onClick={() => router.push(`/club/torneos/${t.id}`)}
                  >
                    <td className="py-4 px-6">
                      <p className="font-bold text-white">{t.nombre}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">
                        {(t as any).rama || ""}{(t as any).rama ? " · " : ""}{t.nivel || "Sin nivel"} · {t.categoria || "General"}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-gray-300 font-medium">
                      {t.fecha
                        ? new Date(t.fecha).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Sin fecha"}
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-brand-white/5 text-gray-300 border border-brand-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase">
                        {t.alcance || "Local"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-white font-black">{t.cupos_actuales || 0}</span>
                      <span className="text-gray-500 font-medium"> / {t.cupos_maximos || 16}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                          t.estado === "Inscripción"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : t.estado === "En curso"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : t.estado === "Finalizado"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-white/5 text-gray-400 border border-white/10"
                        }`}
                      >
                        {t.estado || "Borrador"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                          title="Editar torneo"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleConfirmDelete(t.id, t.nombre)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                          title="Eliminar torneo"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINACIÓN */}
      {total > PAGE_SIZE && (
        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={total}
          currentCount={filteredTournaments.length}
          onPageChange={setCurrentPage}
        />
      )}

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      {isModalOpen && (
        <TorneoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          formData={formData}
          setFormData={setFormData}
          clubs={club ? [club] : []}
          isSaving={saving}
          editingId={editingId}
        />
      )}

      {/* MODAL DE FEEDBACK DE CONFIRMACIÓN */}
      <FeedbackModal {...feedbackModal} />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Trophy,
  LayoutDashboard,
} from "lucide-react";
import { TorneosService } from "../../../utils/services/torneos";
import { ClubesService } from "../../../utils/services/clubes";
import { Torneo, Club, FormTorneoState } from "../../../utils/types";

import TorneoModal from "../../../components/torneos/TorneoModal";
import FeedbackModal, {
  FeedbackModalProps,
} from "../../../components/ui/FeedbackModal";

const TABS = ["Todos", "Activos", "Borradores", "Finalizados"];

const ESTADO_INICIAL: FormTorneoState = {
  nombre: "",
  club_id: "",
  fecha: "",
  nivel: "5ª",
  categoria: "Masculino",
  estado: "Borrador",
  cupos_maximos: 16,
  modalidad: "Duplas",
  formato: "Eliminatoria Directa",
  precio_inscripcion: 0,
  premio_1: "",
  premio_2: "",
  premio_3: "",
};

export default function TorneosPage() {
  // 2. Inicializamos el router
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<string>("Todos");
  const [search, setSearch] = useState<string>("");
  const [tournaments, setTournaments] = useState<Torneo[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormTorneoState>(ESTADO_INICIAL);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [torneosData, clubesResponse] = await Promise.all([
          TorneosService.getAll(),

          ClubesService.getAll().catch(() => ({ data: [], total: 0 })),
        ]);

        if (isMounted) {
          setTournaments(torneosData || []);

          setClubs(clubesResponse?.data || []);
        }
      } catch (error: unknown) {
        console.error("Error al conectar con la API:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // --- MANEJADORES DE ACCIONES ---
  const handleOpenCreate = () => {
    setFormData(ESTADO_INICIAL);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (torneo: Torneo) => {
    setFormData({
      nombre: torneo.nombre || "",
      subtitulo: torneo.subtitulo || "",
      club_id: String(torneo.club_id || ""),
      fecha: torneo.fecha ? String(torneo.fecha) : "",
      nivel: torneo.nivel || "5ª",
      categoria: torneo.categoria || "Masculino",
      estado: torneo.estado || "Borrador",
      cupos_maximos: torneo.cupos_maximos || 16,
      modalidad: torneo.modalidad || "Duplas",
      formato: torneo.formato || "Eliminatoria Directa",
      precio_inscripcion: torneo.precio_inscripcion || 0,
      premio_1: torneo.premio_1 ?? "",
      premio_2: torneo.premio_2 ?? "",
      premio_3: torneo.premio_3 ?? "",
    });
    setEditingId(String(torneo.id));
    setIsModalOpen(true);
  };

  const handleSaveTorneo = async () => {
    try {
      setSaving(true);

      // Creamos el objeto limpio que espera tu backend
      const payloadToSave: FormTorneoState = {
        ...formData,
        club_id: formData.club_id === "" ? null : formData.club_id,
        // Construimos el objeto premios que el backend procesa
        premios: {
          uno: formData.premio_1 || "",
          dos: formData.premio_2 || "",
          tres: formData.premio_3 || "",
        },
        // Eliminamos los campos planos para no enviar basura al backend
        premio_1: undefined,
        premio_2: undefined,
        premio_3: undefined,
      };

      if (editingId) {
        await TorneosService.update(editingId, payloadToSave);
      } else {
        await TorneosService.create(payloadToSave);
      }

      setIsModalOpen(false);
      router.refresh();

      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar torneo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setFeedbackModal({
      isOpen: true,
      type: "danger",
      title: "Eliminar Torneo",
      description:
        "¿Estás seguro? Se borrará el torneo y todas sus inscripciones asociadas. Esta acción no se puede deshacer.",
      confirmText: "Sí, eliminar",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));

        TorneosService.delete(id)
          .then(() => {
            setFeedbackModal({
              isOpen: true,
              type: "success",
              title: "¡Eliminado!",
              description: "El torneo fue borrado exitosamente.",
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
            setLoading(true);
            setRefreshKey((prev) => prev + 1);
          })
          .catch((error: unknown) => {
            setFeedbackModal({
              isOpen: true,
              type: "warning",
              title: "Hubo un problema",
              description:
                "No pudimos eliminar el torneo. Detalle: " +
                (typeof error === "string" ? error : "Desconocido"),
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          });
      },
    });
  };

  // --- FILTROS ---
  const filteredTournaments = tournaments.filter((t) => {
    const matchesTab =
      activeTab === "Todos" ||
      (activeTab === "Activos" &&
        (t.estado === "Inscripción" || t.estado === "En curso")) ||
      (activeTab === "Borradores" && t.estado === "Borrador") ||
      (activeTab === "Finalizados" && t.estado === "Finalizado");
    const matchesSearch = t.nombre.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Gestión de torneos
          </h1>
          <p className="text-gray-400 mt-1">
            {tournaments.length} torneos en total
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-padel-4 hover:bg-[#b3e600] text-padel-1 px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] text-sm"
        >
          <Plus className="size-5" /> Nuevo torneo
        </button>
      </div>

      {/* FILTROS Y TABS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="inline-flex bg-[#111111] p-1.5 rounded-xl border border-white/5 overflow-x-auto w-full sm:w-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-bold transition-all ${
                activeTab === tab
                  ? "bg-padel-4 text-padel-1 shadow-[0_0_10px_rgba(204,255,0,0.15)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
          <input
            type="text"
            placeholder="Buscar torneo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#111111] rounded-xl border border-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-padel-4/50 transition-colors"
          />
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-padel-5 rounded-3xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          /* SKELETON LOADER PREMIUM */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-250">
              <thead>
                <tr className="border-b border-white/5 bg-black/20">
                  <th className="py-5 px-8">
                    <div className="h-3 w-16 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-20 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-24 bg-white/10 rounded mx-auto"></div>
                  </th>
                  <th className="py-5 px-6">
                    <div className="h-3 w-16 bg-white/10 rounded"></div>
                  </th>
                  <th className="py-5 px-8">
                    <div className="h-3 w-20 bg-white/10 rounded ml-auto"></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="py-5 px-8">
                      <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 w-24 bg-white/5 rounded"></div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="h-4 w-40 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-white/5 rounded"></div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <div className="h-8 w-20 bg-white/10 rounded-lg mx-auto"></div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="h-5 w-24 bg-white/10 rounded-full"></div>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
                        <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-250">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider bg-black/20">
                  <th className="py-5 px-8">Torneo</th>
                  <th className="py-5 px-6">Sede / Fecha</th>
                  <th className="py-5 px-6 text-center">Inscriptos</th>
                  <th className="py-5 px-6">Estado</th>
                  <th className="py-5 px-8 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTournaments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Trophy className="size-10 mb-4 opacity-50" />
                        <span className="font-medium text-lg text-white">
                          No se encontraron torneos
                        </span>
                        <span className="text-sm mt-1">
                          Ajustá los filtros o creá uno nuevo.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTournaments.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/2 transition-colors group"
                    >
                      <td className="py-4 px-8">
                        <div className="font-bold text-white group-hover:text-padel-4 transition-colors text-[15px]">
                          {t.nombre}
                        </div>
                        <div className="text-[13px] text-gray-500 mt-0.5 font-medium">
                          {t.nivel || "Sin nivel"} · {t.categoria || "General"}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="text-[14px] font-bold text-gray-200">
                          {t.clubes?.nombre || "Sede a confirmar"}
                        </div>
                        <div className="text-[13px] text-gray-500 mt-0.5">
                          {t.fecha
                            ? new Date(t.fecha).toLocaleDateString("es-AR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Fecha a confirmar"}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center justify-center bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[14px] font-black text-white">
                            {t.cupos_actuales || 0}
                          </span>
                          <span className="text-[13px] text-gray-500 font-bold ml-1">
                            / {t.cupos_maximos || 32}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              t.estado === "Inscripción"
                                ? "bg-[#00ff88]"
                                : t.estado === "En curso"
                                  ? "bg-[#ffb800]"
                                  : t.estado === "Finalizado"
                                    ? "bg-blue-500"
                                    : "bg-gray-500"
                            }`}
                          ></span>
                          <span
                            className={`text-[13px] font-bold ${
                              t.estado === "Inscripción"
                                ? "text-[#00ff88]"
                                : t.estado === "En curso"
                                  ? "text-[#ffb800]"
                                  : t.estado === "Finalizado"
                                    ? "text-blue-500"
                                    : "text-gray-400"
                            }`}
                          >
                            {t.estado || "Borrador"}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-8 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {/* 3. Nuevo Botón de Centro de Control */}
                          <button
                            onClick={() =>
                              router.push(`/dashboard/torneos/${t.id}`)
                            }
                            className="p-2 bg-padel-4/10 hover:bg-padel-4/20 text-padel-4 border border-transparent hover:border-padel-4/30 rounded-lg transition-colors"
                            title="Centro de Control (Cuadros y Llaves)"
                          >
                            <LayoutDashboard className="size-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Editar Torneo"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(t.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-transparent hover:border-red-500/20 rounded-lg text-red-500 transition-colors"
                            title="Eliminar Torneo"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TorneoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTorneo}
        formData={formData}
        setFormData={setFormData}
        clubs={clubs}
        isSaving={saving}
        editingId={editingId}
      />

      <FeedbackModal {...feedbackModal} />
    </div>
  );
}

// apps/web/app/dashboard/clubes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Building2, MapPin, CheckCircle2, Plus } from "lucide-react";
import { ClubesService } from "../../../utils/services/clubes";
import { Club, FormClubState } from "../../../utils/types";

import FeedbackModal, {
  FeedbackModalProps,
} from "../../../components/ui/FeedbackModal";
import ClubModal from "../../../components/clubes/ClubModal";

const ESTADO_INICIAL: FormClubState = {
  nombre: "",
  provincia: "La Rioja", // Tu default
  localidad: "",
  canchas: 2,
  estado: "Activo",
};

export default function GestionClubesPage() {
  const [clubes, setClubes] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const [formData, setFormData] = useState<FormClubState>(ESTADO_INICIAL);

  // Carga inicial
  useEffect(() => {
    let isMounted = true;
    ClubesService.getAll()
      .then((data) => {
        if (isMounted) {
          setClubes(data || []);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error al cargar los clubes:", error);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Manejador: Abrir modal para Crear
  const handleOpenCreate = () => {
    setFormData(ESTADO_INICIAL);
    setEditingId(null);
    setIsModalOpen(true);
  };

  // Manejador: Abrir modal para Editar
  const handleOpenEdit = (club: Club) => {
    setFormData({
      nombre: club.nombre,
      provincia: club.provincia || "La Rioja",
      localidad: club.localidad || "",
      canchas: club.canchas || 1,
      estado: club.estado || "Activo",
    });
    setEditingId(club.id);
    setIsModalOpen(true);
  };

  // Manejador: Guardar (Create o Update)
  const handleSaveClub = () => {
    setSaving(true);
    const request = editingId
      ? ClubesService.update(editingId, formData)
      : ClubesService.create(formData);

    request
      .then(() => {
        setIsModalOpen(false);
        setFormData(ESTADO_INICIAL);
        setEditingId(null);
        setLoading(true);
        setRefreshKey((prev) => prev + 1);
      })
      .catch((error) => {
        alert(
          "Error al guardar: " +
            (error.response?.data?.message || error.message || "Desconocido"),
        );
      })
      .finally(() => setSaving(false));
  };

  // Manejador: Eliminar
  const handleDelete = () => {
    if (!editingId) return;

    // Pasamos el valor por valor inmutable
    const idToDelete = editingId;

    setFeedbackModal({
      isOpen: true,
      type: "danger",
      title: "Eliminar Club",
      description:
        "Vas a eliminar permanentemente este complejo deportivo. ¿Estás absolutamente seguro? Toda la información asociada se perderá.",
      confirmText: "Sí, eliminar",
      cancelText: "Mejor no",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));

        ClubesService.delete(idToDelete)
          .then(() => {
            setFeedbackModal({
              isOpen: true,
              type: "success",
              title: "¡Eliminado!",
              description: "El club fue borrado exitosamente del sistema.",
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
            setIsModalOpen(false);
            setLoading(true);
            setRefreshKey((prev) => prev + 1);
          })
          .catch((error) => {
            setFeedbackModal({
              isOpen: true,
              type: "warning",
              title: "Hubo un problema",
              description:
                "No pudimos eliminar el club. Detalle: " +
                  error.response?.data?.message ||
                error.message ||
                "Desconocido",
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          });
      },
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-10 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Clubes adheridos
          </h1>
          <p className="text-gray-400 mt-1">
            {clubes.length} clubes en la red ·{" "}
            {clubes.filter((c) => c.estado === "Pendiente").length} pendientes
            de aprobación
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-padel-4 hover:bg-[#b3e600] text-padel-1 px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)]"
        >
          <Plus className="size-5" /> Agregar club
        </button>
      </div>

      {/* GRILLA DE CLUBES */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-padel-5 rounded-2xl border border-white/5 p-6 h-56"
            ></div>
          ))}
        </div>
      ) : clubes.length === 0 ? (
        <div className="w-full py-24 text-center border border-dashed border-white/10 rounded-3xl bg-padel-5/20 flex flex-col items-center">
          <Building2 className="size-12 text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No hay clubes registrados
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clubes.map((club) => (
            <div
              key={club.id}
              className="bg-padel-5 rounded-2xl border border-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition-colors"
            >
              <div className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-xl bg-padel-4/10 border border-padel-4/20 text-padel-4 flex items-center justify-center shrink-0">
                  <Building2 className="size-7" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-bold text-lg text-white">
                      {club.nombre}
                    </h3>
                    {club.estado === "Activo" && (
                      <CheckCircle2 className="size-4 text-padel-4" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <MapPin className="size-3.5" />
                    {club.localidad ? `${club.localidad}, ` : ""}
                    {club.provincia || "Sin ubicación"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <div>
                  <div className="text-2xl font-black text-white">
                    {club.canchas || 0}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                    Canchas
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">
                    {club.torneos_count || 0}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                    Torneos
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 ">
                  <span
                    className={`w-2 h-2 rounded-full ${club.estado === "Pendiente" ? "bg-orange-500" : "bg-green-500"}`}
                  ></span>
                  <span
                    className={`text-sm font-bold ${club.estado === "Pendiente" ? "text-orange-500" : "text-green-500"}`}
                  >
                    {club.estado || "Activo"}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenEdit(club)}
                  className="text-padel-4 hover:bg-padel-4/10 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Gestionar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RENDERIZADO DEL MODAL MODULARIZADO */}
      <ClubModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClub}
        onDelete={handleDelete}
        formData={formData}
        setFormData={setFormData}
        isSaving={saving}
        editingId={editingId}
      />

      {/* FEEDBACK MODAL (Éxito/Error) */}
      <FeedbackModal {...feedbackModal} />
    </div>
  );
}

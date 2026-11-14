// apps/web/app/dashboard/clubes/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  CheckCircle2,
  Plus,
  Globe,
  Landmark,
} from "lucide-react";
import { ClubesService } from "../../../utils/services/clubes";
import { Club, FormClubState } from "../../../utils/types";
import {
  esClubSoloSede,
  clubEtiquetaListado,
} from "../../../utils/types/club.types";
import { mensajeErrorApi } from "../../../utils/mensajeErrorApi";
import { useProfileStore } from "../../../store/useProfileStore";

import FeedbackModal, {
  FeedbackModalProps,
} from "../../../components/ui/FeedbackModal";
import ClubModal from "../../../components/clubes/ClubModal";

const ESTADO_INICIAL: FormClubState = {
  nombre: "",
  provincia: "Buenos Aires",
  localidad: "",
  canchas: 2,
  estado: "Activo",
  latitud: null,
  longitud: null,
  cbu: "",
  alias: "",
  suscripcion_sin_comisiones: false,
  pago_transferencia_habilitado: false,
  pago_efectivo_habilitado: false,
};

export default function GestionClubesPage() {
  const profile = useProfileStore((s) => s.profile);
  const puedePromoverAdherido =
    profile?.rol === "superadmin" ||
    profile?.rol === "admin_federacion" ||
    profile?.rol === "admin_provincial";

  const [clubes, setClubes] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [promoviendoId, setPromoviendoId] = useState<string | null>(null);

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    title: "",
    description: "",
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
  });

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormClubState>(ESTADO_INICIAL);

  // Carga inicial
  useEffect(() => {
    let isMounted = true;
    ClubesService.getAll({ page: 1, limit: 200 })
      .then((response) => {
        // Recibimos el objeto de respuesta
        if (isMounted) {
          // Accedemos a response.data (donde están tus clubes)
          setClubes(response.data);
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
      latitud: club.latitud || null,
      longitud: club.longitud || null,
      cbu: club.cbu || "",
      alias: club.alias || "",
      suscripcion_sin_comisiones: Boolean(club.suscripcion_sin_comisiones),
      pago_transferencia_habilitado: Boolean(club.pago_transferencia_habilitado),
      pago_efectivo_habilitado: Boolean(club.pago_efectivo_habilitado),
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

        // Opcional: Mostrar modal de éxito
        setFeedbackModal({
          isOpen: true,
          type: "success",
          title: "¡Club guardado!",
          description: "El complejo deportivo se guardó correctamente.",
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      })
      .catch((error) => {
        const mensajeError = mensajeErrorApi(error, "Error desconocido");

        setFeedbackModal({
          isOpen: true,
          type: "error",
          title: "Acceso denegado",
          description: `No pudimos guardar el club. Detalle: ${mensajeError}`,
          onClose: () =>
            setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
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
                mensajeErrorApi(error, "Desconocido"),
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          });
      },
    });
  };

  const adheridosCount = clubes.filter((c) => !esClubSoloSede(c)).length;
  const sedesCount = clubes.filter((c) => esClubSoloSede(c)).length;

  const handlePromoverAdherido = (club: Club) => {
    if (!puedePromoverAdherido || !esClubSoloSede(club)) return;

    setFeedbackModal({
      isOpen: true,
      type: "warning",
      title: "Promover a club adherido",
      description: `"${club.nombre}" pasará a la red pública de reservas (/reservar). Confirmá solo si el complejo opera reservas online.`,
      confirmText: "Promover",
      cancelText: "Cancelar",
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      onConfirm: () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
        setPromoviendoId(club.id);
        ClubesService.promoverAdherido(club.id)
          .then(() => {
            setFeedbackModal({
              isOpen: true,
              type: "success",
              title: "Club adherido",
              description: `${club.nombre} ya figura en la red de reservas.`,
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
            setRefreshKey((prev) => prev + 1);
          })
          .catch((error) => {
            setFeedbackModal({
              isOpen: true,
              type: "error",
              title: "No se pudo promover",
              description: mensajeErrorApi(
                error,
                "Revisá los datos del club e intentá de nuevo.",
              ),
              onClose: () =>
                setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
            });
          })
          .finally(() => {
            setPromoviendoId(null);
            setFeedbackModal((prev) => ({ ...prev, isLoading: false }));
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
            Clubes y sedes
          </h1>
          <p className="text-gray-400 mt-1">
            {adheridosCount} adheridos (reservas) · {sedesCount} sedes
            registradas ·{" "}
            {clubes.filter((c) => c.estado === "Pendiente").length} pendientes
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-card px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)]"
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
              className="bg-[#111111] rounded-2xl border border-white/5 p-6 h-56"
            ></div>
          ))}
        </div>
      ) : clubes.length === 0 ? (
        <div className="w-full py-24 text-center border border-dashed border-white/10 rounded-3xl bg-[#111111]/50 flex flex-col items-center">
          <Building2 className="size-12 text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            No hay clubes registrados
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clubes.map((club) => {
            const soloSede = esClubSoloSede(club);
            return (
            <div
              key={club.id}
              className={`bg-[#111111] rounded-2xl border p-6 flex flex-col justify-between transition-colors ${
                soloSede
                  ? "border-sky-500/25 hover:border-sky-500/40"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex gap-4 items-start">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${
                    soloSede
                      ? "bg-sky-500/10 border-sky-500/25 text-sky-300"
                      : "bg-brand-chartreuse/10 border-brand-chartreuse/20 text-brand-chartreuse"
                  }`}
                >
                  {soloSede ? (
                    <Landmark className="size-7" />
                  ) : (
                    <Building2 className="size-7" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start gap-1.5 mb-1">
                    <h3
                      className="font-bold text-lg text-white truncate min-w-0"
                      title={clubEtiquetaListado(club)}
                    >
                      {club.nombre}
                    </h3>
                    {club.estado === "Activo" && (
                      <CheckCircle2
                        className="size-4 shrink-0 self-start mt-1 text-brand-chartreuse"
                        aria-hidden
                      />
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      soloSede
                        ? "bg-sky-500/15 text-sky-200"
                        : "bg-brand-chartreuse/10 text-brand-chartreuse"
                    }`}
                  >
                    {soloSede ? (
                      <Landmark className="size-3 shrink-0" aria-hidden />
                    ) : (
                      <Globe className="size-3 shrink-0" aria-hidden />
                    )}
                    {soloSede ? "Sede registrada" : "Adherido reservas"}
                  </span>
                  <div className="flex items-start gap-1.5 text-sm text-gray-400 mt-2">
                    <MapPin
                      className="size-3.5 shrink-0 self-start mt-0.5 text-gray-500"
                      aria-hidden
                    />
                    <span className="min-w-0 leading-snug">
                      {club.localidad ? `${club.localidad}, ` : ""}
                      {club.provincia || "Sin ubicación"}
                    </span>
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
              <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-white/5">
                {/* Estado y Ajustes */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          club.estado === "Pendiente"
                            ? "bg-orange-500"
                            : club.estado === "Inactivo"
                              ? "bg-red-500"
                              : "bg-green-500"
                        }`}
                        aria-hidden
                      />
                      <span
                        className={`text-sm font-bold leading-none ${
                          club.estado === "Pendiente"
                            ? "text-orange-500"
                            : club.estado === "Inactivo"
                              ? "text-red-500"
                              : "text-green-500"
                        }`}
                      >
                        {club.estado || "Activo"}
                      </span>
                    </div>
                    {club.licencia_federativa ? (
                      <span className="mt-1 block pl-4 text-[10px] text-gray-500">
                        Lic. {club.licencia_federativa.nro_licencia} ·{" "}
                        {club.licencia_federativa.estado}
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={() => handleOpenEdit(club)}
                    className="text-gray-400 hover:text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Ajustes
                  </button>
                </div>

                {/* Accesos de Gestión de Reservas / Canchas */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Link
                    href={`/dashboard/clubes/${club.id}/canchas`}
                    className="flex items-center justify-center py-2 px-3 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse rounded-xl text-xs font-bold transition-colors border border-brand-chartreuse/10 text-center"
                  >
                    Canchas
                  </Link>
                  {soloSede ? (
                    <span className="flex items-center justify-center py-2 px-3 bg-white/5 text-gray-500 rounded-xl text-xs font-bold border border-white/5 text-center">
                      Sin reservas web
                    </span>
                  ) : (
                    <Link
                      href={`/dashboard/clubes/${club.id}/reservas`}
                      className="flex items-center justify-center py-2 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors border border-white/5 text-center"
                    >
                      Agenda
                    </Link>
                  )}
                </div>
                {soloSede && puedePromoverAdherido ? (
                  <button
                    type="button"
                    onClick={() => handlePromoverAdherido(club)}
                    disabled={promoviendoId === club.id}
                    className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold border border-sky-500/30 text-sky-200 hover:bg-sky-500/10 transition-colors disabled:opacity-50"
                  >
                    {promoviendoId === club.id
                      ? "Promoviendo..."
                      : "Promover a adherido (reservas)"}
                  </button>
                ) : null}
              </div>
            </div>
            );
          })}
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

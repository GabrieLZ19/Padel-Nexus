"use client";

import { useState, useEffect } from "react";
import { LicenciasService } from "@/utils/services/licencias";
import { ClubesService } from "@/utils/services/clubes";
import { Club, Perfil } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Fingerprint,
  MapPin,
  Building2,
  User,
  X,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Check,
  Lock,
} from "lucide-react";

interface LicenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: Perfil | null;
  fetchProfile: () => void;
}

export default function LicenciaModal({
  isOpen,
  onClose,
  userProfile,
  fetchProfile,
}: LicenciaModalProps) {
  const [provincia, setProvincia] = useState("");
  const [selectedClub, setSelectedClub] = useState("");

  const [allClubes, setAllClubes] = useState<Club[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: "success" | "danger" | "warning" | "info" | "error";
    isSuccessFlow?: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
  });

  const hasDni = !!userProfile?.dni;

  useEffect(() => {
    if (!isOpen) {
      setProvincia("");
      setSelectedClub("");
      return;
    }
    let isMounted = true;

    const loadClubes = async () => {
      try {
        const response = await ClubesService.getAll();

        if (isMounted) {
          setAllClubes(response.data || []);
          setHasFetched(true);
        }
      } catch (err) {
        console.error("Error cargando clubes:", err);
        if (isMounted) setHasFetched(true);
      }
    };

    loadClubes();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const filteredClubes = provincia
    ? allClubes.filter(
        (c) => c.provincia === provincia && c.estado === "Activo",
      )
    : [];

  const clubOptions = filteredClubes.map((c) => ({
    value: c.id,
    label: c.nombre,
  }));

  const handleCloseFeedback = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));
    if (feedback.isSuccessFlow) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile?.nombre || !userProfile?.apellido) {
      setFeedback({
        isOpen: true,
        title: "Perfil incompleto",
        description:
          "Por favor, completá tu nombre y apellido en la configuración de tu perfil antes de solicitar una licencia.",
        type: "warning",
      });
      return;
    }

    if (!userProfile?.dni) {
      setFeedback({
        isOpen: true,
        title: "DNI Faltante",
        description:
          "Por favor, cargá tu DNI en la configuración de tu perfil antes de solicitar una licencia.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      await LicenciasService.solicitarAlta({
        nombre: userProfile.nombre,
        apellido: userProfile.apellido,
        documento: userProfile.dni,
        club_id: selectedClub,
        provincia: provincia,
      });

      fetchProfile();

      setFeedback({
        isOpen: true,
        title: "¡Solicitud enviada!",
        description:
          "Tu licencia está en revisión. Un administrador validará tus datos pronto.",
        type: "success",
        isSuccessFlow: true,
      });
    } catch (error: unknown) {
      console.error("Error al solicitar licencia:", error);
      const errorMsg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Hubo un error al enviar la solicitud.";

      setFeedback({
        isOpen: true,
        title: "Error",
        description: errorMsg,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          className="w-full max-w-md bg-brand-card/90 border border-brand-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-2xl"
        >
          {/* Neon Glow inside modal */}
          <div className="absolute -top-20 -right-20 size-40 rounded-full bg-brand-chartreuse/10 blur-[50px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 size-40 rounded-full bg-brand-chartreuse/5 blur-[50px] pointer-events-none" />

          {/* Botón cerrar */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 hover:text-brand-white transition-colors p-1.5 rounded-full hover:bg-brand-white/5 cursor-pointer z-10"
          >
            <X className="size-5" />
          </motion.button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6 pt-2">
            <div className="size-14 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center mb-3.5 shadow-[0_0_15px_rgba(203,254,1,0.1)]">
              <Award className="size-7 text-brand-chartreuse" />
            </div>
            <h2 className="text-2xl font-bold text-brand-white tracking-tight font-sans">
              Solicitar Licencia
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-xs leading-normal">
              Iniciá tu trámite de fichaje oficial unificado ante la FAP.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {/* Tarjeta de Datos Personales (Bloque de Información Vinculada) */}
            <div className="space-y-3 bg-brand-black/50 border border-brand-white/5 rounded-2xl p-4">
              <p className="text-[10px] text-brand-chartreuse font-extrabold uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <User size={10} /> Datos de Ficha (Desde Perfil)
              </p>

              {/* Nombre Completo */}
              <div className="flex items-center justify-between py-1 border-b border-brand-white/5 last:border-b-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    Nombre Completo
                  </span>
                  <span className="text-sm font-semibold text-brand-white">
                    {userProfile?.nombre
                      ? `${userProfile.apellido?.toUpperCase()}, ${userProfile.nombre}`
                      : "No disponible"}
                  </span>
                </div>
                <div className="size-7 rounded-lg bg-brand-white/5 border border-brand-white/5 flex items-center justify-center">
                  <Lock size={12} className="text-gray-500" />
                </div>
              </div>

              {/* DNI */}
              <div className="flex items-center justify-between py-1 last:border-b-0">
                <div className="space-y-0.5 w-full">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
                    DNI / Documento
                  </span>
                  {hasDni ? (
                    <span className="text-sm font-semibold text-brand-white block">
                      {userProfile?.dni}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-amber-500 block">
                      No registrado
                    </span>
                  )}
                </div>
                {hasDni ? (
                  <div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Check size={12} className="text-emerald-400" />
                  </div>
                ) : (
                  <div className="size-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <AlertTriangle size={12} className="text-amber-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Advertencia DNI Faltante (Solo si no tiene DNI) */}
            {!hasDni && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex gap-3 text-sm text-amber-200"
              >
                <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-bold leading-tight text-amber-300">
                    Se requiere DNI para continuar
                  </p>
                  <p className="text-xs text-amber-300/80 leading-normal">
                    Para tramitar la licencia oficial FAP es obligatorio
                    vincular tu número de documento nacional de identidad.
                  </p>
                  <Link
                    href="/mi-perfil/ajustes"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-xs text-brand-chartreuse hover:text-brand-chartreuse/80 font-bold transition-colors group"
                  >
                    <span>Cargar DNI en Ajustes de Perfil</span>
                    <ArrowRight
                      size={12}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Provincia del Club */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-bold tracking-wide uppercase flex items-center gap-1.5">
                <MapPin size={12} className="text-gray-500" /> Provincia del
                Club
              </label>
              <CustomDropdown
                value={provincia}
                onChange={(val) => {
                  setProvincia(val);
                  setSelectedClub("");
                }}
                options={PROVINCIAS_ARG}
                placeholder="Seleccioná tu provincia..."
                haciaArriba={true}
              />
            </div>

            {/* Club Representante */}
            <AnimatePresence>
              {provincia && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="space-y-1.5"
                >
                  <label className="text-xs text-gray-400 font-bold tracking-wide uppercase flex items-center gap-1.5">
                    <Building2 size={12} className="text-gray-500" /> Club
                    Representante
                  </label>
                  <CustomDropdown
                    value={selectedClub}
                    onChange={(val) => setSelectedClub(val)}
                    options={clubOptions}
                    disabled={!hasFetched || clubOptions.length === 0}
                    placeholder={
                      !hasFetched
                        ? "Cargando..."
                        : clubOptions.length === 0
                          ? "Sin clubes activos"
                          : "Elegí un club..."
                    }
                    haciaArriba={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 pt-6 border-t border-brand-white/5 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-transparent border border-brand-white/10 text-brand-white font-bold rounded-xl hover:bg-brand-white/5 transition-colors cursor-pointer text-sm"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileHover={
                  hasDni && selectedClub && provincia ? { scale: 1.02 } : {}
                }
                whileTap={
                  hasDni && selectedClub && provincia ? { scale: 0.98 } : {}
                }
                type="submit"
                disabled={loading || !selectedClub || !hasDni || !provincia}
                className="flex-1 py-3.5 bg-brand-chartreuse text-brand-black font-extrabold rounded-xl disabled:bg-brand-white/5 disabled:text-gray-500 hover:bg-[#b3e600] transition-colors flex justify-center items-center gap-2 cursor-pointer text-sm shadow-md shadow-brand-chartreuse/10 hover:shadow-brand-chartreuse/20"
              >
                {loading ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  "Solicitar Alta"
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>

      <FeedbackModal
        isOpen={feedback.isOpen}
        onClose={handleCloseFeedback}
        title={feedback.title}
        description={feedback.description}
        type={feedback.type}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, MapPin, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { ClubesService } from "@/utils/services/clubes";
import { AfiliacionesService } from "@/utils/services/afiliaciones";
import { Club, Perfil } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";

interface AfiliacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: Perfil | null;
  fetchProfile: () => void;
}

export default function AfiliacionModal({
  isOpen,
  onClose,
  userProfile,
  fetchProfile,
}: AfiliacionModalProps) {
  const [provincia, setProvincia] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [allClubes, setAllClubes] = useState<Club[]>([]);
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

  useEffect(() => {
    if (!isOpen) {
      setProvincia("");
      setSelectedClub("");
      return;
    }

    let mounted = true;
    ClubesService.getAll()
      .then((response) => {
        if (mounted) setAllClubes(response.data || []);
      })
      .catch((err) => console.error("Error cargando clubes:", err));

    return () => {
      mounted = false;
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
    if (feedback.isSuccessFlow) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile?.dni) {
      setFeedback({
        isOpen: true,
        title: "Perfil incompleto",
        description:
          "Completá tu DNI en ajustes de perfil antes de asociarte a un club.",
        type: "warning",
      });
      return;
    }

    if (!selectedClub) {
      setFeedback({
        isOpen: true,
        title: "Seleccioná un club",
        description: "Elegí provincia y club para continuar.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      await AfiliacionesService.solicitar(selectedClub);
      fetchProfile();
      setFeedback({
        isOpen: true,
        title: "Solicitud enviada",
        description:
          "Tu pedido de afiliación quedó pendiente de aprobación por un administrador.",
        type: "success",
        isSuccessFlow: true,
      });
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      setFeedback({
        isOpen: true,
        title: "No se pudo solicitar",
        description:
          apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          apiError.message ||
          "Hubo un error al enviar la solicitud.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-brand-card/90 border border-brand-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-500 hover:text-white p-1.5 rounded-full hover:bg-white/5 cursor-pointer"
          >
            <X className="size-5" />
          </button>

          <div className="mb-6">
            <div className="inline-flex items-center gap-2 bg-brand-chartreuse/10 text-brand-chartreuse px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-brand-chartreuse/20">
              <Building2 className="size-3" />
              Asociarme a un club
            </div>
            <h2 className="text-2xl font-bold text-white">Elegí tu club</h2>
            <p className="text-sm text-gray-400 mt-1">
              La solicitud queda pendiente hasta que un admin la apruebe. Esto
              no reemplaza el carnet FAP.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <MapPin className="size-3 text-brand-chartreuse" />
                Provincia
              </label>
              <CustomDropdown
                options={PROVINCIAS_ARG}
                value={provincia}
                onChange={(v) => {
                  setProvincia(v);
                  setSelectedClub("");
                }}
                placeholder="Seleccioná provincia"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Building2 className="size-3 text-brand-chartreuse" />
                Club
              </label>
              <CustomDropdown
                options={clubOptions}
                value={selectedClub}
                onChange={setSelectedClub}
                placeholder={
                  provincia ? "Seleccioná club" : "Primero elegí provincia"
                }
                disabled={!provincia}
              />
            </div>

            {!userProfile?.dni && (
              <p className="text-xs text-amber-300/90">
                Falta DNI en tu perfil.{" "}
                <Link
                  href="/mi-perfil/ajustes"
                  className="underline text-brand-chartreuse"
                >
                  Ir a ajustes
                </Link>
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !selectedClub}
              className="w-full bg-brand-chartreuse disabled:opacity-40 text-brand-black py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar solicitud"
              )}
            </button>
          </form>
        </motion.div>
      </div>

      <FeedbackModal
        isOpen={feedback.isOpen}
        title={feedback.title}
        description={feedback.description}
        type={feedback.type}
        onClose={handleCloseFeedback}
      />
    </>
  );
}

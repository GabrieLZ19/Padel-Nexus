"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, X, Loader2 } from "lucide-react";
import { AsociacionesService, Asociacion } from "@/utils/services/asociaciones";
import { PasesService } from "@/utils/services/pases";
import { Perfil } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal from "@/components/ui/FeedbackModal";

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
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [destinoId, setDestinoId] = useState("");
  const [motivo, setMotivo] = useState("");
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

  const origen = userProfile?.afiliaciones?.find(
    (af) => af.asociacion_id && af.estado?.toLowerCase() === "activo",
  );

  useEffect(() => {
    if (!isOpen) {
      setDestinoId("");
      setMotivo("");
      return;
    }

    let mounted = true;
    AsociacionesService.getAll()
      .then((items) => {
        if (mounted) setAsociaciones(items);
      })
      .catch((err) => console.error("Error cargando asociaciones:", err));

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const opciones = asociaciones
    .filter((asoc) => asoc.id !== origen?.asociacion_id)
    .map((asoc) => ({
      value: asoc.id,
      label: asoc.provincia ? `${asoc.nombre} · ${asoc.provincia}` : asoc.nombre,
    }));

  const handleCloseFeedback = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));
    if (feedback.isSuccessFlow) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinoId || !motivo.trim()) {
      setFeedback({
        isOpen: true,
        title: "Faltan datos",
        description: "Elegí la asociación de destino y escribí el motivo.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      await PasesService.solicitar(destinoId, motivo.trim());
      fetchProfile();
      setFeedback({
        isOpen: true,
        title: "Pase enviado",
        description:
          "La asociación de destino queda pendiente hasta que un administrador lo apruebe.",
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
        title: "No se pudo pedir el pase",
        description:
          apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          apiError.message ||
          "Hubo un error al enviar el pase.",
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
              <ArrowRightLeft className="size-3" />
              Pase de provincia
            </div>
            <h2 className="text-2xl font-bold text-white">Cambiar de asociación</h2>
            <p className="text-sm text-gray-400 mt-1">
              No hace falta afiliarte a un club para jugar. El pase cambia la
              asociación que te representa.
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Origen: {origen?.entidad || "sin asociación activa"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Asociación de destino
              </label>
              <CustomDropdown
                options={opciones}
                value={destinoId}
                onChange={setDestinoId}
                placeholder="Elegí la asociación"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
                Motivo
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-chartreuse/40"
                placeholder="Por qué pedís el cambio de provincia"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !destinoId || !motivo.trim()}
              className="w-full bg-brand-chartreuse disabled:opacity-40 text-brand-black py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Pedir pase"
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

"use client";

import { useState, useEffect } from "react";
import { LicenciasService } from "@/utils/services/licencias";
import { ClubesService } from "@/utils/services/clubes";
import { Club, Perfil } from "@/utils/types";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal from "@/components/ui/FeedbackModal";

const PROVINCIAS = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const provinciaOptions = PROVINCIAS.map((prov) => ({
  value: prov,
  label: prov,
}));

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
  const [dni, setDni] = useState("");
  const [provincia, setProvincia] = useState("");
  const [selectedClub, setSelectedClub] = useState("");

  const [allClubes, setAllClubes] = useState<Club[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: "success" | "danger" | "warning" | "info";
    isSuccessFlow?: boolean;
  }>({
    isOpen: false,
    title: "",
    description: "",
    type: "info",
  });

  useEffect(() => {
    if (!isOpen || hasFetched) return;
    let isMounted = true;

    const loadClubes = async () => {
      try {
        const data = await ClubesService.getAll();
        if (isMounted) {
          setAllClubes(data || []);
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
  }, [isOpen, hasFetched]);

  const filteredClubes = provincia
    ? allClubes.filter(
        (c) => c.provincia === provincia && c.estado === "Activo",
      )
    : [];

  const clubOptions = filteredClubes.map((c) => ({
    value: c.id,
    label: c.nombre,
  }));

  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorNumerico = e.target.value.replace(/\D/g, "");
    if (valorNumerico.length <= 8) {
      setDni(valorNumerico);
    }
  };

  const handleCloseFeedback = () => {
    setFeedback((prev) => ({ ...prev, isOpen: false }));
    if (feedback.isSuccessFlow) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userProfile?.nombre_completo) {
      setFeedback({
        isOpen: true,
        title: "Perfil incompleto",
        description:
          "Por favor, completá tu nombre en la configuración de tu perfil antes de solicitar una licencia.",
        type: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      await LicenciasService.solicitarAlta({
        nombre_completo: userProfile.nombre_completo,
        documento: dni,
        club: selectedClub,
        provincia: provincia,
      });

      // Refrescamos los datos del usuario tras el éxito
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
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md bg-[#161616] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
          <h2 className="text-2xl font-bold text-white mb-6">
            Solicitar Licencia
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Nombre Completo
              </label>
              <input
                type="text"
                value={userProfile?.nombre_completo || ""}
                disabled
                className="w-full bg-[#111] p-3.5 rounded-xl border border-white/5 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                DNI (Sin puntos)
              </label>
              <input
                type="text"
                value={dni}
                onChange={handleDniChange}
                placeholder="Ej: 35123456"
                required
                minLength={7}
                className="w-full bg-padel-1 p-3.5 rounded-xl border border-white/5 text-white focus:border-padel-4 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Provincia del Club
              </label>
              <CustomDropdown
                value={provincia}
                onChange={(val) => {
                  setProvincia(val);
                  setSelectedClub("");
                }}
                options={provinciaOptions}
                placeholder="Seleccioná tu provincia..."
              />
            </div>

            {provincia && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Club Representante
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
                />
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-transparent border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !selectedClub || dni.length < 7}
                className="flex-1 py-3.5 bg-padel-4 text-black font-bold rounded-xl disabled:bg-padel-2 disabled:text-gray-500 hover:bg-[#b3e600] transition-colors flex justify-center"
              >
                {loading ? "Procesando..." : "Solicitar Alta"}
              </button>
            </div>
          </form>
        </div>
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

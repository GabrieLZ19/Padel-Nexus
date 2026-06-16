"use client";

import { useState } from "react";
import { LicenciasService } from "@/utils/services/licencias";
import { useProfileStore } from "@/store/useProfileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function LicenciaModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: "",
    documento: "",
    club: "",
  });
  const fetchProfile = useProfileStore((state) => state.fetchProfile);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Usamos el servicio que definimos para enviar datos
      await LicenciasService.solicitarAlta(formData);
      await fetchProfile();
      onClose();
    } catch (err) {
      console.error("Error al solicitar", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-[#161616] p-8 rounded-3xl border border-white/10 w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-bold">Solicitar Licencia</h2>
        <p className="text-gray-400 text-sm">
          Completa tus datos para enviarlos a revisión.
        </p>

        <input
          required
          placeholder="Nombre Completo"
          className="w-full p-3 bg-white/5 rounded-xl border border-white/10"
          onChange={(e) =>
            setFormData({ ...formData, nombre_completo: e.target.value })
          }
        />
        <input
          required
          placeholder="DNI / Documento"
          className="w-full p-3 bg-white/5 rounded-xl border border-white/10"
          onChange={(e) =>
            setFormData({ ...formData, documento: e.target.value })
          }
        />
        <input
          required
          placeholder="Club de origen"
          className="w-full p-3 bg-white/5 rounded-xl border border-white/10"
          onChange={(e) => setFormData({ ...formData, club: e.target.value })}
        />

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10"
          >
            Cancelar
          </button>
          <button
            disabled={loading}
            type="submit"
            className="flex-1 py-3 rounded-xl bg-padel-4 text-black font-bold"
          >
            {loading ? "Enviando..." : "Enviar Solicitud"}
          </button>
        </div>
      </form>
    </div>
  );
}

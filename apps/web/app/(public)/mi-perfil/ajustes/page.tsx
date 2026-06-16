"use client";

import { useState, useEffect } from "react";
import { PerfilService } from "@/utils/services/perfil";
import { Perfil } from "@/utils/types";
import { Save, User, Swords, Loader2, Mail } from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown"; // Asegura la ruta correcta
import FeedbackModal from "@/components/ui/FeedbackModal";
import { useProfileStore } from "@/store/useProfileStore";

const CATEGORIAS = [
  { value: "1ra", label: "1ra" },
  { value: "2da", label: "2da" },
  { value: "3ra", label: "3ra" },
  { value: "4ta", label: "4ta" },
  { value: "5ta", label: "5ta" },
  { value: "6ta", label: "6ta" },
  { value: "7ma", label: "7ma" },
  { value: "8va", label: "8va" },
  { value: "Iniciante", label: "Iniciante" },
];

const LADOS = [
  { value: "Drive", label: "Drive (Derecha)" },
  { value: "Revés", label: "Revés (Izquierda)" },
  { value: "Ambos", label: "Ambos" },
];

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-2xl ${className}`} />
);

export default function ProfileSettings() {
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    PerfilService.getMe().then(setProfile).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return; // 'profile' viene de tu useState local

    setSaving(true);
    try {
      // 1. Llamamos al backend para persistir los cambios
      const updatedProfile = await PerfilService.updateMe(profile);

      // 2. Actualizamos el estado local (para mantener el formulario sincronizado)
      setProfile(updatedProfile);

      // 3. Actualizamos el store global para que el Navbar se entere al instante
      useProfileStore.getState().setProfile(updatedProfile);

      setShowModal(true);
    } catch (error) {
      console.error("Error al actualizar:", error);
      // Aquí podrías agregar un modal de error también
    } finally {
      setSaving(false);
    }
  };

  if (!profile)
    return (
      <div className="max-w-4xl mx-auto p-10 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="bg-[#161616] p-8 rounded-3xl space-y-6">
          <Skeleton className="h-6 w-40" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10">
      <h1 className="text-3xl font-bold mb-8">Configuración de Perfil</h1>

      <form className="space-y-8" onSubmit={handleSave}>
        {/* Datos Personales */}
        <section className="bg-[#161616] p-8 rounded-3xl border border-white/5">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <User size={20} className="text-padel-4" /> Datos Personales
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* NUEVO CAMPO: Email (Solo lectura) */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">
                Email (Credencial de acceso)
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 size-4" />
                <input
                  className="w-full bg-[#111] pl-12 pr-4 py-4 rounded-xl border border-white/5 text-gray-500 cursor-not-allowed outline-none"
                  value={profile.email || ""}
                  disabled
                  title="Para cambiar tu email debes ir a la configuración de seguridad."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">
                Nombre completo
              </label>
              <input
                className="w-full bg-[#0a0a0a] p-4 rounded-xl border border-white/10 focus:border-padel-4 outline-none"
                value={profile.nombre_completo || ""}
                onChange={(e) =>
                  setProfile({ ...profile, nombre_completo: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">
                Teléfono
              </label>
              <input
                className="w-full bg-[#0a0a0a] p-4 rounded-xl border border-white/10 focus:border-padel-4 outline-none"
                value={profile.telefono || ""}
                onChange={(e) =>
                  setProfile({ ...profile, telefono: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        {/* Preferencias de Juego con CustomDropdown */}
        <section className="bg-[#161616] p-8 rounded-3xl border border-white/5">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Swords size={20} className="text-padel-4" /> Preferencias de Juego
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">
                Categoría
              </label>
              <CustomDropdown
                value={profile.categoria_padel || ""}
                onChange={(val) =>
                  setProfile({ ...profile, categoria_padel: val })
                }
                options={CATEGORIAS}
                placeholder="Seleccionar categoría"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">
                Lado preferido
              </label>
              <CustomDropdown
                value={profile.lado_preferido || ""}
                onChange={(val) =>
                  setProfile({ ...profile, lado_preferido: val })
                }
                options={LADOS}
                placeholder="Seleccionar lado"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="bg-padel-4 text-black font-bold px-8 py-4 rounded-xl flex items-center gap-2 hover:bg-white transition-colors"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Save size={20} />
          )}
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </form>

      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Perfil Actualizado"
        description="Tus datos han sido guardados correctamente en la plataforma."
        type="success"
      />
    </div>
  );
}

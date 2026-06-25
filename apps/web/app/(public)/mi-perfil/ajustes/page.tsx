"use client";

import { useState, useEffect } from "react";
import { PerfilService } from "@/utils/services/perfil";
import { Perfil } from "@/utils/types";
import {
  Save,
  User,
  Swords,
  Loader2,
  Mail,
  Fingerprint,
  MapPin,
  Phone,
} from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { useProfileStore } from "@/store/useProfileStore";
import { NIVELES_PADEL, LADOS_PADEL } from "@/utils/constants/padelConfig";

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-brand-white/5 rounded-2xl ${className}`} />
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
    if (!profile) return;

    setSaving(true);
    try {
      const updatedProfile = await PerfilService.updateMe(profile);
      setProfile(updatedProfile);
      useProfileStore.getState().setProfile(updatedProfile);
      setShowModal(true);
    } catch (error) {
      console.error("Error al actualizar:", error);
    } finally {
      setSaving(false);
    }
  };

  const labelStyles =
    "text-xs text-gray-400 font-semibold tracking-wide uppercase block mb-2";
  const inputStyles =
    "w-full bg-brand-input px-4 py-3.5 rounded-xl border border-brand-white/5 text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse transition-all text-sm sm:text-base caret-white";

  if (!profile)
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="bg-brand-card p-8 rounded-3xl space-y-6 border border-brand-white/5">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 pb-20 animate-in fade-in duration-300">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-8">
        Configuración de Perfil
      </h1>

      <form className="space-y-8" onSubmit={handleSave}>
        {/* SECCIÓN 1: DATOS PERSONALES */}
        {/* ➡️ SOLUCIÓN: Cambiamos el div absoluto por border-t-2 nativo. Cero desbordes en las esquinas */}
        <section className="bg-brand-card p-6 md:p-8 rounded-3xl border-x border-b border-t-2 border-brand-white/5 border-t-brand-chartreuse/20 shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2.5 text-brand-white">
            <User size={20} className="text-brand-chartreuse" /> Datos
            Personales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelStyles}>Email de la cuenta</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 size-4" />
                <input
                  className="w-full bg-brand-black pl-12 pr-4 py-3.5 rounded-xl border border-brand-white/5 text-gray-500 cursor-not-allowed outline-none text-sm sm:text-base"
                  value={profile.email || ""}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelStyles}>Nombre completo</label>
              <input
                className={inputStyles}
                type="text"
                value={profile.nombre_completo || ""}
                onChange={(e) =>
                  setProfile({ ...profile, nombre_completo: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-1">
              <label className={labelStyles}>DNI (Ficha Oficial)</label>
              <div className="relative group">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
                <input
                  className={inputStyles}
                  type="text"
                  value={profile.dni || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, dni: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelStyles}>Teléfono de contacto</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
                <input
                  className={inputStyles}
                  type="tel"
                  value={profile.telefono || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, telefono: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className={labelStyles}>
                Provincia / Lugar de residencia
              </label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
                <input
                  className={inputStyles}
                  type="text"
                  value={profile.lugar_residencia || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, lugar_residencia: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: PREFERENCIAS DE JUEGO */}
        {/* ➡️ SOLUCIÓN: border-t-2 nativo aplicado acá también */}
        <section className="bg-brand-card p-6 md:p-8 rounded-3xl border-x border-b border-t-2 border-brand-white/5 border-t-brand-chartreuse/20 shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2.5 text-brand-white">
            <Swords size={20} className="text-brand-chartreuse" /> Preferencias
            de Juego
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelStyles}>Categoría oficial</label>
              {/* Le pasamos un prop indicando que se abra hacia arriba para evitar el corte con Windows */}
              <CustomDropdown
                value={profile.categoria_padel || ""}
                onChange={(val) =>
                  setProfile({ ...profile, categoria_padel: val })
                }
                options={NIVELES_PADEL}
                placeholder="Seleccionar categoría"
                haciaArriba={true}
              />
            </div>
            <div className="space-y-1">
              <label className={labelStyles}>Lado preferido en cancha</label>
              <CustomDropdown
                value={profile.lado_preferido || ""}
                onChange={(val) =>
                  setProfile({ ...profile, lado_preferido: val })
                }
                options={LADOS_PADEL}
                placeholder="Seleccionar lado"
                haciaArriba={true}
              />
            </div>
          </div>
        </section>

        {/* ACCIÓN PRINCIPAL */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-brand-chartreuse text-brand-black font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2.5 hover:opacity-95 active:scale-[0.99] transition-all shadow-lg cursor-pointer text-base"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Save size={20} />
            )}
            {saving ? "Guardando..." : "Guardar Ajustes"}
          </button>
        </div>
      </form>

      <FeedbackModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Ficha Actualizada"
        description="Los cambios de tu perfil federativo impactaron con éxito en la base de datos."
        type="success"
      />
    </div>
  );
}

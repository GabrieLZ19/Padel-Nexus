"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { PerfilService } from "@/utils/services/perfil";
import { Perfil } from "@/utils/types";
import {
  Save,
  User,
  Swords,
  Loader2,
  Mail,
  Fingerprint,
  Phone,
  Camera,
} from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { useProfileStore } from "@/store/useProfileStore";
import { NIVELES_PADEL, LADOS_PADEL, PROVINCIAS_ARG } from "@/utils/constants/padelConfig";
import { validateNombre, validateDni, validateTelefono } from "@/utils/validation";

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-brand-white/5 rounded-2xl ${className}`} />
);

export default function ProfileSettings() {
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Estados para subida de avatar
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Estados de errores de validación
  const [errors, setErrors] = useState<{
    nombre?: string;
    apellido?: string;
    dni?: string;
    telefono?: string;
    lugar_residencia?: string;
  }>({});

  useEffect(() => {
    PerfilService.getMe().then(setProfile).catch(console.error);
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("El archivo debe ser una imagen.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("La imagen no debe superar los 2MB.");
      return;
    }

    setUploading(true);
    setAvatarError(null);
 
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const publicUrl = await PerfilService.subirAvatar(base64);
        
        setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null);
        useProfileStore.getState().setProfile({ ...profile, avatar_url: publicUrl });
      } catch (err: any) {
        console.error("Error al subir avatar:", err);
        setAvatarError(err.response?.data?.error || err.message || "Error al subir la imagen.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setErrors({});
    const newErrors: typeof errors = {};

    if (!profile.nombre?.trim()) {
      newErrors.nombre = "El nombre es obligatorio.";
    } else if (!validateNombre(profile.nombre)) {
      newErrors.nombre = "El nombre no es válido (mín. 2 letras, sin números).";
    }

    if (!profile.apellido?.trim()) {
      newErrors.apellido = "El apellido es obligatorio.";
    } else if (!validateNombre(profile.apellido)) {
      newErrors.apellido = "El apellido no es válido (mín. 2 letras, sin números).";
    }

    if (!profile.dni?.trim()) {
      newErrors.dni = "El DNI es obligatorio.";
    } else if (!validateDni(profile.dni)) {
      newErrors.dni = "El DNI debe tener 7 u 8 dígitos (ej: 40234567).";
    }

    if (profile.telefono && !validateTelefono(profile.telefono)) {
      newErrors.telefono = "El teléfono debe ser válido (mín. 10 dígitos, ej: +54 9 351...)";
    }

    if (!profile.lugar_residencia) {
      newErrors.lugar_residencia = "La provincia es obligatoria.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const cleanedProfile = {
        ...profile,
        nombre: (profile.nombre || "").trim(),
        apellido: (profile.apellido || "").trim(),
        dni: (profile.dni || "").trim().replace(/\./g, ""),
        telefono: profile.telefono?.trim() || null,
      };

      const updatedProfile = await PerfilService.updateMe(cleanedProfile);
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

  const getInputStyles = (hasError?: boolean, isIconInput?: boolean) =>
    `w-full bg-brand-input py-3.5 rounded-xl border text-brand-white placeholder-gray-500 ` +
    `focus:outline-none transition-all text-sm sm:text-base caret-white ${
      isIconInput ? "pl-12 pr-4" : "px-4"
    } ${
      hasError
        ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500"
        : "border-brand-white/5 focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse"
    }`;

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

  const userName = profile.nombre ? `${profile.apellido?.toUpperCase()}, ${profile.nombre}` : "";
  const userInitials =
    userName && userName.trim()
      ? userName
          .trim()
          .split(/\s+/)
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "PN";

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 pb-20 animate-in fade-in duration-300">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-8">
        Configuración de Perfil
      </h1>

      <form className="space-y-8" onSubmit={handleSave}>
        {/* SECCIÓN 1: DATOS PERSONALES */}
        <section className="bg-brand-card p-6 md:p-8 rounded-3xl border-x border-b border-t-2 border-brand-white/5 border-t-brand-chartreuse/20 shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2.5 text-brand-white">
            <User size={20} className="text-brand-chartreuse" /> Datos Personales
          </h3>

          {/* Subida de foto de perfil */}
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 pb-6 border-b border-brand-white/5">
            <div className="relative group size-24 md:size-28 rounded-full bg-brand-black border border-brand-white/10 flex items-center justify-center overflow-hidden cursor-pointer">
              {uploading ? (
                <Loader2 className="animate-spin text-brand-chartreuse size-8" />
              ) : profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Foto de Perfil"
                  fill
                  className="object-cover rounded-full group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <div className="text-xl md:text-2xl font-bold text-brand-chartreuse">
                  {userInitials}
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                <Camera className="size-5 text-brand-white mb-1" />
                <span className="text-[10px] text-brand-white font-bold tracking-wide uppercase">Subir foto</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            
            <div className="text-center sm:text-left">
              <h4 className="text-brand-white font-bold text-lg">Foto de Perfil</h4>
              <p className="text-gray-500 text-sm mt-1">Soporta PNG, JPG o JPEG. Máx. 2MB.</p>
              {avatarError && <p className="text-red-400 text-xs mt-1">{avatarError}</p>}
            </div>
          </div>

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
              <label className={labelStyles}>Nombre *</label>
              <input
                className={getInputStyles(!!errors.nombre, false)}
                type="text"
                value={profile.nombre || ""}
                onChange={(e) => {
                  setProfile({ ...profile, nombre: e.target.value.replace(/[0-9]/g, "") });
                  if (errors.nombre) setErrors((p) => ({ ...p, nombre: undefined }));
                }}
                required
              />
              {errors.nombre && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors.nombre}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <label className={labelStyles}>Apellido *</label>
              <input
                className={getInputStyles(!!errors.apellido, false)}
                type="text"
                value={profile.apellido || ""}
                onChange={(e) => {
                  setProfile({ ...profile, apellido: e.target.value.replace(/[0-9]/g, "") });
                  if (errors.apellido) setErrors((p) => ({ ...p, apellido: undefined }));
                }}
                required
              />
              {errors.apellido && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors.apellido}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className={labelStyles}>DNI (Ficha Oficial) *</label>
              <div className="relative group">
                <Fingerprint className={`absolute left-4 top-1/2 -translate-y-1/2 size-4 transition-colors ${errors.dni ? "text-red-400" : "text-gray-500"}`} />
                <input
                  className={getInputStyles(!!errors.dni, true)}
                  type="text"
                  value={profile.dni || ""}
                  onChange={(e) => {
                    setProfile({ ...profile, dni: e.target.value.replace(/[^0-9.]/g, "").slice(0, 10) });
                    if (errors.dni) setErrors((p) => ({ ...p, dni: undefined }));
                  }}
                  required
                />
              </div>
              {errors.dni && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors.dni}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className={labelStyles}>Teléfono de contacto (Opcional)</label>
              <div className="relative group">
                <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 size-4 transition-colors ${errors.telefono ? "text-red-400" : "text-gray-500"}`} />
                <input
                  className={getInputStyles(!!errors.telefono, true)}
                  type="tel"
                  value={profile.telefono || ""}
                  onChange={(e) => {
                    setProfile({ ...profile, telefono: e.target.value.replace(/[^0-9+\s\-()]/g, "") });
                    if (errors.telefono) setErrors((p) => ({ ...p, telefono: undefined }));
                  }}
                />
              </div>
              {errors.telefono && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors.telefono}</p>
              )}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className={labelStyles}>
                Provincia / Lugar de residencia *
              </label>
              <CustomDropdown
                value={profile.lugar_residencia || ""}
                onChange={(val) => {
                  setProfile({ ...profile, lugar_residencia: val });
                  if (errors.lugar_residencia) {
                    setErrors((p) => ({ ...p, lugar_residencia: undefined }));
                  }
                }}
                options={PROVINCIAS_ARG}
                placeholder="Seleccionar provincia..."
                hasError={!!errors.lugar_residencia}
              />
              {errors.lugar_residencia && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors.lugar_residencia}</p>
              )}
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: PREFERENCIAS DE JUEGO */}
        <section className="bg-brand-card p-6 md:p-8 rounded-3xl border-x border-b border-t-2 border-brand-white/5 border-t-brand-chartreuse/20 shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2.5 text-brand-white">
            <Swords size={20} className="text-brand-chartreuse" /> Preferencias de Juego
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className={labelStyles}>Categoría oficial *</label>
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
              <label className={labelStyles}>Lado preferido en cancha *</label>
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

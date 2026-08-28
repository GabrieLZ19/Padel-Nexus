"use client";

import { useRef } from "react";
import Image from "next/image";
import { Store, MapPin, BadgeCheck, Sparkles, Upload, Trash2 } from "lucide-react";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";
import type { Vendedor } from "@/utils/services/marketplace";

interface Props {
  tienda: Vendedor | null;
  nombreEntidad?: string;
  nombreTienda: string;
  descripcion: string;
  provincia: string;
  logoUrl?: string;
  logoPreview?: string;
  onChangeNombre: (v: string) => void;
  onChangeDescripcion: (v: string) => void;
  onChangeProvincia: (v: string) => void;
  onChangeLogo: (base64: string | null) => void;
  onPublicar: () => void;
  onGuardar: () => void;
}

function LogoAvatar({
  src,
  nombre,
  size = "lg",
}: {
  src?: string;
  nombre: string;
  size?: "lg" | "md";
}) {
  const dim = size === "lg" ? "size-20 md:size-24" : "size-14";
  const icon = size === "lg" ? "size-10" : "size-7";
  if (src) {
    return (
      <div className={`relative ${dim} rounded-2xl overflow-hidden bg-brand-black/40 border border-brand-white/10 shrink-0`}>
        <Image src={src} alt={nombre} fill className="object-cover" unoptimized={src.startsWith("data:")} />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-2xl bg-brand-chartreuse/15 flex items-center justify-center shrink-0`}>
      <Store className={`${icon} text-brand-chartreuse`} />
    </div>
  );
}

export default function MarketplaceTiendaTab({
  tienda,
  nombreEntidad,
  nombreTienda,
  descripcion,
  provincia,
  logoUrl,
  logoPreview,
  onChangeNombre,
  onChangeDescripcion,
  onChangeProvincia,
  onChangeLogo,
  onPublicar,
  onGuardar,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const logoMostrar = logoPreview || logoUrl;

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      sileo.error({ title: "Formato inválido", description: "Usá JPG o PNG." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      sileo.error({ title: "Archivo grande", description: "Máximo 5MB." });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => onChangeLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const bloqueLogo = (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase">Foto de perfil de la tienda</label>
      <div className="flex items-center gap-4">
        <LogoAvatar src={logoMostrar} nombre={nombreTienda || "Tienda"} size="md" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-white/10 text-xs font-bold text-gray-300 hover:border-brand-chartreuse/40 cursor-pointer"
          >
            <Upload className="size-3.5" />
            Subir foto
          </button>
          {logoMostrar && (
            <button
              type="button"
              onClick={() => onChangeLogo(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-red-400 cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              Quitar
            </button>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-600">Cuadrada, JPG o PNG, máx. 5MB. Se verá en tu tienda pública.</p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
    </div>
  );

  if (!tienda) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
        <div className="xl:col-span-8 bg-gradient-to-br from-brand-card to-brand-black border border-brand-white/5 rounded-3xl p-8 md:p-10 space-y-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-64 rounded-full bg-brand-chartreuse/5 blur-3xl pointer-events-none" />
          <div className="relative space-y-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-chartreuse bg-brand-chartreuse/10 px-3 py-1 rounded-full">
              <Sparkles className="size-3" />
              Primera vez
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Abrí tu tienda oficial
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg">
              Publicá productos y servicios a nombre de tu club, asociación o federación.
              Los jugadores verán tu tienda en el marketplace de Padel Nexus con el sello de entidad oficial.
            </p>
          </div>

          <div className="relative grid gap-4">
            {bloqueLogo}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Nombre de la tienda</label>
              <input
                type="text"
                placeholder={nombreEntidad || "Ej: Tienda Oficial New Center"}
                value={nombreTienda}
                onChange={(e) => onChangeNombre(e.target.value)}
                className="w-full bg-brand-black/50 border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Provincia</label>
              <CustomDropdown
                value={provincia}
                onChange={onChangeProvincia}
                placeholder="Seleccioná provincia"
                options={PROVINCIAS_ARG}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Presentación</label>
              <textarea
                placeholder="Contá qué vendés: indumentaria, equipamiento, clases, merchandising oficial..."
                value={descripcion}
                onChange={(e) => onChangeDescripcion(e.target.value)}
                rows={4}
                className="w-full bg-brand-black/50 border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm resize-none focus:border-brand-chartreuse focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onPublicar}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-chartreuse text-brand-black font-black px-8 py-4 rounded-xl hover:opacity-95 transition-all shadow-lg shadow-brand-chartreuse/15 cursor-pointer"
            >
              <Store className="size-5" />
              Publicar tienda en el marketplace
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 flex flex-col gap-4">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Así se verá</p>
          <div className="flex-1 rounded-3xl border border-brand-white/10 bg-brand-card p-6 space-y-5 opacity-80">
            <div className="flex items-center gap-4">
              <LogoAvatar src={logoMostrar} nombre={nombreTienda || nombreEntidad || "Tienda"} />
              <div>
                <p className="font-black text-lg">{nombreTienda || nombreEntidad || "Tu tienda"}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3" />
                  {provincia || "Provincia"}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {descripcion || "La descripción de tu tienda aparecerá en el perfil público."}
            </p>
            <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold">
              <BadgeCheck className="size-4" />
              Entidad verificada · Padel Nexus
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
      <div className="xl:col-span-8 bg-brand-card border border-brand-white/5 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <LogoAvatar src={logoMostrar} nombre={tienda.nombre_tienda} size="md" />
            <div>
              <h2 className="text-xl font-black">{tienda.nombre_tienda}</h2>
              <p className="text-xs text-gray-500 capitalize mt-0.5">
                {tienda.entidad_tipo} ·{" "}
                <span className={tienda.estado === "activo" ? "text-brand-chartreuse" : "text-red-400"}>
                  {tienda.estado}
                </span>
              </p>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black uppercase text-brand-chartreuse bg-brand-chartreuse/10 px-2.5 py-1 rounded-full">
            <BadgeCheck className="size-3" />
            Verificada
          </span>
        </div>

        <div className="space-y-4">
          {bloqueLogo}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Nombre de la tienda</label>
            <input
              type="text"
              value={nombreTienda}
              onChange={(e) => onChangeNombre(e.target.value)}
              className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Provincia</label>
            <CustomDropdown
              value={provincia}
              onChange={onChangeProvincia}
              placeholder="Provincia"
              options={PROVINCIAS_ARG}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Presentación</label>
            <textarea
              value={descripcion}
              onChange={(e) => onChangeDescripcion(e.target.value)}
              rows={4}
              className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm resize-none focus:border-brand-chartreuse focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onGuardar}
            className="bg-brand-chartreuse text-brand-black font-bold px-6 py-3 rounded-xl cursor-pointer hover:opacity-95"
          >
            Guardar cambios
          </button>
        </div>
      </div>

      <div className="xl:col-span-4 space-y-4">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vista pública</p>
        <div className="rounded-3xl border border-brand-white/10 bg-brand-black/40 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <LogoAvatar src={logoMostrar} nombre={nombreTienda} size="md" />
            <div>
              <p className="font-bold">{nombreTienda}</p>
              <p className="text-[11px] text-gray-500">{provincia}</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">{descripcion || "Sin descripción."}</p>
          <div className="pt-3 border-t border-brand-white/5 grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-lg font-black text-brand-chartreuse">{tienda.valoracion_promedio || "—"}</p>
              <p className="text-[10px] text-gray-500 uppercase">Reputación</p>
            </div>
            <div>
              <p className="text-lg font-black">{tienda.total_ventas}</p>
              <p className="text-[10px] text-gray-500 uppercase">Ventas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

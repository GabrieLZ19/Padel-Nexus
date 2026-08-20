"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Medal,
  Swords,
  MapPin,
  Calendar,
} from "lucide-react";
import { PerfilService } from "@/utils/services/perfil";
import { Perfil } from "@/utils/types";
import { useProfileStore } from "@/store/useProfileStore";
import { puedeVerFichaCompleta } from "@/utils/auth/roles";

type PerfilVista = Partial<Perfil> & {
  clubes?: { id?: string; nombre?: string } | null;
};

function FieldRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-white/6 last:border-0">
      <span className="text-gray-500 flex items-center gap-2.5 text-sm shrink-0">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-white text-sm text-right">
        {value}
      </span>
    </div>
  );
}

export default function FichaJugadorPublicaPage() {
  const { id } = useParams();
  const router = useRouter();
  const viewer = useProfileStore((s) => s.profile);
  const esCompleta = puedeVerFichaCompleta(viewer?.rol);

  const [perfil, setPerfil] = useState<PerfilVista | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = useCallback(
    async (mounted: boolean) => {
      if (!id) return;
      try {
        const data = esCompleta
          ? await PerfilService.getById(id as string)
          : await PerfilService.getPublico(id as string);
        if (mounted) setPerfil(data);
      } catch (error) {
        console.error("Error al cargar ficha del jugador:", error);
        if (mounted) setPerfil(null);
      } finally {
        if (mounted) setLoading(false);
      }
    },
    [id, esCompleta],
  );

  useEffect(() => {
    let mounted = true;
    const t = setTimeout(() => fetchPerfil(mounted), 0);
    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [fetchPerfil]);

  if (loading) {
    return (
      <div className="min-h-[70vh] w-full animate-pulse">
        <div className="h-44 bg-white/5 border-b border-white/5" />
        <div className="max-w-5xl mx-auto px-6 md:px-10 -mt-10 space-y-6">
          <div className="w-28 h-28 rounded-full bg-[#1a1a1a] border-4 border-brand-black" />
          <div className="h-8 w-72 bg-white/10 rounded-lg" />
          <div className="h-40 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-gray-500">No se encontró el jugador.</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-brand-chartreuse hover:underline font-medium cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  const nombreCompleto = perfil.nombre
    ? `${(perfil.apellido || "").toUpperCase()}, ${perfil.nombre}`
    : "Jugador";

  const clubNombre =
    (perfil.clubes &&
      typeof perfil.clubes === "object" &&
      "nombre" in perfil.clubes &&
      perfil.clubes.nombre) ||
    null;

  return (
    <div className="min-h-[70vh] w-full pb-16">
      {/* Hero full-bleed */}
      <div className="relative border-b border-white/8 bg-[#0c0c0c]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(203,254,1,0.08),transparent_55%)]" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 pt-6 pb-20">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium cursor-pointer mb-10"
          >
            <ArrowLeft className="size-4" /> Volver
          </button>

          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-7">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#161616] border border-white/10 overflow-hidden flex items-center justify-center text-gray-500 shrink-0 shadow-xl">
              {perfil.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={perfil.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="size-10" />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-chartreuse/80 mb-2">
                {esCompleta ? "Ficha completa" : "Jugador"}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight truncate">
                {nombreCompleto}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-400">
                {perfil.categoria_padel ? (
                  <span className="font-semibold text-gray-300">
                    Cat. {perfil.categoria_padel}
                  </span>
                ) : null}
                {perfil.lugar_residencia ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {perfil.lugar_residencia}
                  </span>
                ) : null}
                {clubNombre ? <span>{clubNombre}</span> : null}
              </div>
              {esCompleta && perfil.email ? (
                <p className="text-gray-500 flex items-center gap-2 text-sm mt-2">
                  <Mail className="size-3.5 shrink-0" /> {perfil.email}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 mt-10">
        <div
          className={`grid grid-cols-1 gap-10 ${
            esCompleta ? "lg:grid-cols-2" : ""
          }`}
        >
          <section>
            <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-1">
              Perfil deportivo
            </h2>
            <div className="border-t border-white/8">
              <FieldRow
                icon={<Medal className="size-4 text-brand-chartreuse/70" />}
                label="Categoría"
                value={perfil.categoria_padel || "—"}
              />
              <FieldRow
                icon={<Swords className="size-4 text-brand-chartreuse/70" />}
                label="Lado"
                value={perfil.lado_preferido || "—"}
              />
              <FieldRow
                icon={<MapPin className="size-4 text-brand-chartreuse/70" />}
                label="Residencia"
                value={perfil.lugar_residencia || "—"}
              />
              {clubNombre ? (
                <FieldRow
                  icon={<User className="size-4 text-brand-chartreuse/70" />}
                  label="Club"
                  value={clubNombre}
                />
              ) : null}
              {perfil.sexo ? (
                <FieldRow
                  icon={<User className="size-4 text-brand-chartreuse/70" />}
                  label="Sexo"
                  value={perfil.sexo}
                />
              ) : null}
            </div>
          </section>

          {esCompleta ? (
            <section>
              <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-1">
                Datos de contralor
              </h2>
              <div className="border-t border-white/8">
                <FieldRow
                  icon={<User className="size-4 text-amber-400/70" />}
                  label="DNI"
                  value={perfil.dni || "—"}
                />
                <FieldRow
                  icon={<Phone className="size-4 text-amber-400/70" />}
                  label="Teléfono"
                  value={perfil.telefono || "—"}
                />
                <FieldRow
                  icon={<Calendar className="size-4 text-amber-400/70" />}
                  label="Nacimiento"
                  value={
                    perfil.fecha_nacimiento
                      ? String(perfil.fecha_nacimiento).slice(0, 10)
                      : "—"
                  }
                />
              </div>
              {viewer?.rol && viewer.rol !== "admin_club" ? (
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/jugadores/${id}`)}
                  className="mt-6 text-xs font-bold text-brand-chartreuse hover:underline cursor-pointer"
                >
                  Abrir ficha CRM (licencias)
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

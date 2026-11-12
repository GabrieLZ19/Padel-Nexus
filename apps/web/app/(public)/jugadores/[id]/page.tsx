"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import { RankingsService } from "@/utils/services/rankings";
import { Perfil, RankingPerfilJugador } from "@/utils/types";
import { etiquetaCategoria } from "@/utils/etiquetaCategoria";
import { formatNombreJugador } from "@/utils/formatoNombreJugador";
import { useProfileStore } from "@/store/useProfileStore";
import { puedeVerFichaCompleta } from "@/utils/auth/roles";
import JugadorPublicoRankingSection, {
  elegirRegistroPrincipal,
} from "@/components/jugador/JugadorPublicoRankingSection";
import { categoriasJuegoYRankingDifieren } from "@/utils/fichaPublicaJugador";

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
  const searchParams = useSearchParams();
  const viewer = useProfileStore((s) => s.profile);
  const esCompleta = puedeVerFichaCompleta(viewer?.rol);

  const posicionQuery = searchParams.get("posicion");
  const scopeQuery = searchParams.get("scope");
  const categoriaQuery = searchParams.get("categoria");

  const [perfil, setPerfil] = useState<PerfilVista | null>(null);
  const [registrosRanking, setRegistrosRanking] = useState<
    RankingPerfilJugador[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = useCallback(
    async (mounted: boolean) => {
      if (!id) return;
      try {
        const userId = id as string;
        const [perfilData, rankingData] = await Promise.all([
          esCompleta
            ? PerfilService.getById(userId).catch(() => null)
            : PerfilService.getPublico(userId).catch(() => null),
          RankingsService.getByUserId(userId),
        ]);
        if (mounted) {
          setPerfil(perfilData);
          setRegistrosRanking(rankingData);
        }
      } catch (error) {
        console.error("Error al cargar ficha del jugador:", error);
        if (mounted) {
          setPerfil(null);
          setRegistrosRanking([]);
        }
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

  const registroPrincipal = elegirRegistroPrincipal(
    registrosRanking,
    scopeQuery,
    categoriaQuery,
  );

  if (!perfil && !registroPrincipal) {
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

  const nombreCompleto = perfil?.nombre
    ? `${(perfil.apellido || "").toUpperCase()}, ${perfil.nombre}`
    : formatNombreJugador(
        registroPrincipal?.perfiles?.nombre,
        registroPrincipal?.perfiles?.apellido,
        "Jugador",
      );

  const avatarUrl =
    (perfil?.es_menor ? null : perfil?.avatar_url) ||
    registroPrincipal?.perfiles?.avatar_url ||
    null;

  const clubNombre =
    (perfil?.clubes &&
      typeof perfil.clubes === "object" &&
      "nombre" in perfil.clubes &&
      perfil.clubes.nombre) ||
    registroPrincipal?.perfiles?.clubes?.nombre ||
    null;

  const categoriaJuego =
    perfil?.categoria_padel ||
    registroPrincipal?.perfiles?.categoria_padel ||
    null;
  const categoriaRanking = registroPrincipal?.categoria ?? null;
  const categoriasDifieren = categoriasJuegoYRankingDifieren(
    categoriaJuego,
    categoriaRanking,
  );
  const residenciaDisplay =
    perfil?.lugar_residencia ||
    registroPrincipal?.perfiles?.lugar_residencia ||
    registroPrincipal?.provincia_jurisdiccion;

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
            <div className="relative shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#161616] border border-white/10 overflow-hidden flex items-center justify-center text-gray-500 shadow-xl">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="size-10" />
                )}
              </div>
              {posicionQuery ? (
                <span className="absolute -bottom-1 -right-1 rounded-xl border border-brand-chartreuse bg-brand-black px-2.5 py-1 text-xs font-black text-brand-chartreuse">
                  #{posicionQuery}
                </span>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-chartreuse/80 mb-2">
                {esCompleta ? "Ficha completa" : "Ficha deportiva y ranking"}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight truncate">
                {nombreCompleto}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-400">
                {categoriaJuego ? (
                  <span className="font-semibold text-gray-300">
                    Categoría de juego:{" "}
                    {etiquetaCategoria(categoriaJuego)}
                  </span>
                ) : categoriaRanking ? (
                  <span className="font-semibold text-gray-300">
                    Ranking: {etiquetaCategoria(categoriaRanking)}
                  </span>
                ) : null}
                {categoriasDifieren && categoriaRanking ? (
                  <span className="text-gray-500">
                    Ranking actual: {etiquetaCategoria(categoriaRanking)}
                  </span>
                ) : null}
                {residenciaDisplay ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {residenciaDisplay}
                  </span>
                ) : null}
                {clubNombre ? <span>{clubNombre}</span> : null}
              </div>
              {esCompleta && perfil?.email ? (
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
          <div className="space-y-10">
            <section>
              <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-1">
                Perfil deportivo
              </h2>
              <div className="border-t border-white/8">
                <FieldRow
                  icon={<Medal className="size-4 text-brand-chartreuse/70" />}
                  label="Categoría de juego"
                  value={etiquetaCategoria(categoriaJuego) || "—"}
                />
                {categoriaRanking ? (
                  <FieldRow
                    icon={<Medal className="size-4 text-white/50" />}
                    label="Categoría en ranking"
                    value={etiquetaCategoria(categoriaRanking)}
                  />
                ) : null}
                <FieldRow
                  icon={<Swords className="size-4 text-brand-chartreuse/70" />}
                  label="Lado"
                  value={perfil?.lado_preferido || "—"}
                />
                <FieldRow
                  icon={<MapPin className="size-4 text-brand-chartreuse/70" />}
                  label="Residencia"
                  value={residenciaDisplay || "—"}
                />
                {clubNombre ? (
                  <FieldRow
                    icon={<User className="size-4 text-brand-chartreuse/70" />}
                    label="Club"
                    value={clubNombre}
                  />
                ) : null}
                {perfil?.sexo ? (
                  <FieldRow
                    icon={<User className="size-4 text-brand-chartreuse/70" />}
                    label="Sexo"
                    value={perfil.sexo}
                  />
                ) : null}
              </div>
            </section>

            <JugadorPublicoRankingSection
              registros={registrosRanking}
              principal={registroPrincipal}
              posicion={posicionQuery}
              scope={scopeQuery}
            />
          </div>

          {esCompleta && perfil ? (
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

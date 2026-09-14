"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Search,
  Eye,
  Activity,
  X,
  MapPin,
  Info,
} from "lucide-react";
import {
  RankingsService,
  type JugadorRanking,
  type RankingsQueryParams,
  type TipoRankingFront,
} from "@/utils/services/rankings";
import { TorneosService } from "@/utils/services/torneos";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { useProfileStore } from "@/store/useProfileStore";
import { PROVINCIAS_ARG, NIVELES_PADEL } from "@/utils/constants/padelConfig";

// -----------------------------------------------------------------------------
// Config: tabs por tipo de ranking (menores / ladies-veteranos / libres)
// -----------------------------------------------------------------------------

interface TipoRankingConfig {
  value: TipoRankingFront;
  label: string;
  descripcion: string;
  grupoNivel: "Menores" | "Ladies & Veteranos" | "Libres";
  /** Rama forzada por reglamento; null significa que el usuario elige. */
  ramaForzada: "masculino" | "femenino" | null;
  /** Si false, el selector de rama queda oculto. */
  permiteRama: boolean;
}

const TIPOS_RANKING_CONFIG: TipoRankingConfig[] = [
  {
    value: "libres",
    label: "Libres",
    descripcion: "Damas y Caballeros por nivel (1ª a 8ª e Inicial).",
    grupoNivel: "Libres",
    ramaForzada: null,
    permiteRama: true,
  },
  {
    value: "veteranos",
    label: "Ladies & Veteranos",
    descripcion:
      "Categorias por edad. Ladies (femenino) y Veteranos (masculino).",
    grupoNivel: "Ladies & Veteranos",
    ramaForzada: null,
    permiteRama: true,
  },
  {
    value: "menores",
    label: "Menores",
    descripcion: "Sub-10 a Sub-18 y promocionales.",
    grupoNivel: "Menores",
    ramaForzada: null,
    permiteRama: true,
  },
];

// Categorias disponibles por tipo, derivadas de NIVELES_PADEL.
const CATEGORIAS_POR_TIPO: Record<TipoRankingFront, string[]> = {
  menores: NIVELES_PADEL.filter((n) => n.grupo === "Menores").map((n) => n.value),
  veteranos: NIVELES_PADEL.filter(
    (n) => n.grupo === "Ladies & Veteranos",
  ).map((n) => n.value),
  libres: NIVELES_PADEL.filter((n) => n.grupo === "Libres").map((n) => n.value),
};

const RAMAS_OPCIONES = [
  { value: "", label: "Todas las Ramas" },
  { value: "masculino", label: "Caballeros / Masculino" },
  { value: "femenino", label: "Damas / Femenino" },
];

// -----------------------------------------------------------------------------
// Panel: ranking por provincias en torneos nacionales
// -----------------------------------------------------------------------------

function RankingProvincialPanel() {
  const [torneos, setTorneos] = useState<Array<{ id: string; nombre: string }>>(
    [],
  );
  const [torneoId, setTorneoId] = useState("");
  const [rows, setRows] = useState<
    Array<{ provincia: string; puntos: number; parejas: number }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await TorneosService.getByPage(1, 50, undefined, undefined, {
          incluirBorradores: false,
        });
        if (cancelled) return;
        setTorneos(
          list.data
            .filter((t) =>
              String(t.alcance || "")
                .toLowerCase()
                .includes("nacional"),
            )
            .map((t) => ({ id: t.id, nombre: t.nombre })),
        );
      } catch {
        if (!cancelled) setTorneos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!torneoId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const data = await RankingsService.getProvincialPorTorneo(torneoId);
        if (cancelled) return;
        setRows(data.provincias || []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [torneoId]);

  return (
    <div className="bg-brand-card border border-white/10 rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest">
        <MapPin className="size-4" /> Ranking por provincias (nacionales)
      </div>
      <CustomDropdown
        value={torneoId}
        onChange={setTorneoId}
        options={[
          { value: "", label: "Elegí un torneo nacional…" },
          ...torneos.map((t) => ({ value: t.id, label: t.nombre })),
        ]}
        placeholder="Torneo nacional"
      />
      {loading ? (
        <p className="text-sm text-gray-500">Calculando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          Sin datos aún (hace falta llave con resultados).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Provincia</th>
                <th className="py-2 pr-4">Puntos</th>
                <th className="py-2">Parejas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.provincia} className="border-b border-white/5 text-white">
                  <td className="py-2 pr-4 text-brand-chartreuse font-bold">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-4 font-semibold">{r.provincia}</td>
                  <td className="py-2 pr-4">{r.puntos}</td>
                  <td className="py-2">{r.parejas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Pagina principal
// -----------------------------------------------------------------------------

export default function RankingsPage() {
  const profile = useProfileStore((s) => s.profile);
  const rol = profile?.rol;

  // El scope se define por rol: provincial y club fuerzan Provincial;
  // federacion/superadmin van a Nacional/Global por defecto.
  const scopePorRol = useMemo(() => {
    if (rol === "admin_provincial" || rol === "admin_club") return "Provincial";
    if (rol === "admin_federacion") return "Nacional";
    return "Global";
  }, [rol]);

  // El provincial y el club ven forzada su provincia (residencia del perfil).
  const provinciaForzada = useMemo(() => {
    if (rol === "admin_provincial" || rol === "admin_club") {
      return profile?.lugar_residencia || "";
    }
    return "";
  }, [rol, profile?.lugar_residencia]);

  // Estado de filtros
  const [tipo, setTipo] = useState<TipoRankingFront>("libres");
  const [rama, setRama] = useState<string>("");
  const [categoria, setCategoria] = useState<string>("");
  const [provincia, setProvincia] = useState<string>(provinciaForzada);
  const [scope, setScope] = useState<string>(scopePorRol);
  const [search, setSearch] = useState<string>("");

  // Datos
  const [rankings, setRankings] = useState<JugadorRanking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal expediente
  const [selectedJugador, setSelectedJugador] = useState<JugadorRanking | null>(
    null,
  );

  // Reset de provincia/scope cuando cambia el rol resuelto (montaje o post-login).
  useEffect(() => {
    setScope(scopePorRol);
    setProvincia(provinciaForzada);
  }, [scopePorRol, provinciaForzada]);

  // Fetch al cambiar filtros
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const params: RankingsQueryParams = {
          tipo_ranking: tipo,
          scope,
          rama: rama || undefined,
          categoria: categoria || undefined,
          provincia: provincia || undefined,
          limit: 200,
        };
        const data = await RankingsService.getAll(params);
        if (!cancelled) setRankings(data);
      } catch (err) {
        console.error("Error al cargar rankings:", err);
        if (!cancelled) setRankings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tipo, rama, categoria, provincia, scope]);

  // Reset de categoria al cambiar de tipo (evita valores invalidos entre grupos).
  useEffect(() => {
    setCategoria("");
  }, [tipo]);

  const tipoConfig = TIPOS_RANKING_CONFIG.find((t) => t.value === tipo)!;
  const categoriasDelTipo = CATEGORIAS_POR_TIPO[tipo];

  const filteredRankings = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rankings;
    return rankings.filter((j) => {
      const nombreCompleto = `${j.nombre || ""} ${j.apellido || ""}`.toLowerCase();
      return nombreCompleto.includes(q);
    });
  }, [rankings, search]);

  const handleOpenJugador = (j: JugadorRanking, posIndex: number) => {
    setSelectedJugador({
      ...j,
      posicion_actual: posIndex + 1,
    });
  };

  const tituloContexto = useMemo(() => {
    if (rol === "admin_provincial") return "Ranking Provincial / Regional";
    if (rol === "admin_federacion" || rol === "superadmin")
      return "Ranking Nacional FAP";
    if (rol === "admin_club") return "Ranking del Circuito del Club";
    return "Tabla General de Rankings";
  }, [rol]);

  const subtituloContexto = useMemo(() => {
    if (rol === "admin_provincial") {
      return `Jugadores de ${provinciaForzada || "tu provincia"} por categoria y rama. Usa "Ver Ranking Nacional" para consultar el ranking federativo.`;
    }
    if (rol === "admin_club") {
      return "Ranking filtrado por circuito privado. Se muestran solo las categorias que administra el club.";
    }
    return "Posiciones oficiales, rendimiento y expedientes completos por categoria y rama.";
  }, [rol, provinciaForzada]);

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto space-y-8">
      {/* Header contextual */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase tracking-widest mb-1">
          <Trophy className="size-4" /> {tituloContexto}
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {tipoConfig.label}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{subtituloContexto}</p>
        {rol === "admin_provincial" && (
          <button
            type="button"
            onClick={() => setScope("Nacional")}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Trophy className="size-3.5" />
            Ver Ranking Nacional
          </button>
        )}
      </div>

      {/* Nota de desempate */}
      <div className="flex items-start gap-2 bg-white/5 border border-white/10 rounded-2xl p-3 text-xs text-gray-400">
        <Info className="size-4 text-brand-chartreuse shrink-0 mt-0.5" />
        <span>
          Ante igualdad de puntos, el orden se resuelve alfabeticamente por
          apellido y nombre segun reglamento.
        </span>
      </div>

      {/* Ranking provincial por torneo nacional (solo fed / superadmin) */}
      {(rol === "admin_federacion" || rol === "superadmin") && (
        <RankingProvincialPanel />
      )}

      {/* Tabs por tipo de ranking */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {TIPOS_RANKING_CONFIG.map((t) => (
          <button
            key={t.value}
            onClick={() => setTipo(t.value)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
              tipo === t.value
                ? "bg-brand-chartreuse text-brand-black shadow-[0_0_15px_rgba(203,254,1,0.2)]"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros contextuales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 size-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o apellido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-brand-card border border-white/10 text-white pl-11 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-chartreuse/50"
          />
        </div>

        <CustomDropdown
          value={rama}
          onChange={setRama}
          options={RAMAS_OPCIONES}
          placeholder="Rama"
        />

        <CustomDropdown
          value={categoria}
          onChange={setCategoria}
          options={[
            { value: "", label: `Todas las categorias (${tipoConfig.label})` },
            ...categoriasDelTipo.map((c) => ({ value: c, label: c })),
          ]}
          placeholder="Categoría"
        />

        {/* Provincia solo para fed / superadmin. Provincial y club la tienen forzada. */}
        {rol === "admin_federacion" || rol === "superadmin" ? (
          <CustomDropdown
            value={provincia}
            onChange={setProvincia}
            options={[
              { value: "", label: "Todas las provincias" },
              ...PROVINCIAS_ARG.map((p) => ({ value: p.value, label: p.label })),
            ]}
            placeholder="Provincia"
          />
        ) : (
          <div className="flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-xs text-gray-400 px-4 py-3 font-semibold">
            <MapPin className="size-3.5 mr-2 text-brand-chartreuse" />
            {provincia || "Sin provincia asignada"}
          </div>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-semibold">
          Cargando tabla de posiciones...
        </div>
      ) : filteredRankings.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-3xl text-gray-500 space-y-2">
          {rankings.length === 0 ? (
            <>
              <p className="font-semibold">
                Aún no hay puntos cargados para{" "}
                <span className="text-white">{tipoConfig.label}</span>
                {provincia ? ` en ${provincia}` : ""}.
              </p>
              <p className="text-xs">
                Los rankings se completan a medida que se disputan torneos que
                otorgan puntos en esta clasificación.
              </p>
            </>
          ) : (
            <p className="font-semibold">
              No hay jugadores que coincidan con la búsqueda actual.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-[#161616] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-black/30">
                  <th className="px-6 py-4 text-center">Pos.</th>
                  <th className="px-6 py-4">Jugador</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Provincia</th>
                  <th className="px-6 py-4 text-center">Partidos</th>
                  <th className="px-6 py-4 text-center">Efectividad</th>
                  <th className="px-6 py-4 text-right">Puntos FAP</th>
                  <th className="px-6 py-4 text-right">Expediente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-semibold text-gray-300">
                {filteredRankings.map((j, idx) => {
                  const pj = j.pj || 0;
                  const pg = j.pg || 0;
                  const efectividad = pj > 0 ? Math.round((pg / pj) * 100) : 0;
                  const avatarUrl = j.avatar_url;

                  return (
                    <tr
                      key={j.id || idx}
                      onClick={() => handleOpenJugador(j, idx)}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${
                            idx === 0
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : idx === 1
                                ? "bg-gray-300/20 text-gray-200 border border-gray-300/30"
                                : idx === 2
                                  ? "bg-amber-700/20 text-amber-500 border border-amber-700/30"
                                  : "bg-white/5 text-gray-400"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatarUrl}
                              alt={`${j.nombre} ${j.apellido}`}
                              className="size-9 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="size-9 rounded-full bg-brand-chartreuse/20 border border-brand-chartreuse/30 flex items-center justify-center font-bold text-brand-chartreuse text-xs">
                              {(j.nombre?.[0] || "J").toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-white block">
                              {j.nombre} {j.apellido}
                            </span>
                            <span className="text-[11px] text-gray-500 font-normal">
                              DNI: {j.dni || "N/D"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 font-bold">
                          {j.categoria_padel || j.categoria || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {j.provincia || "Argentina"}
                      </td>
                      <td className="px-6 py-4 text-center text-xs">
                        <span className="text-white font-bold">{pj}</span>
                        <span className="text-gray-500 text-[10px] block font-normal">
                          {pg} victorias
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs">
                        <span
                          className={`font-black ${
                            efectividad >= 70
                              ? "text-emerald-400"
                              : efectividad >= 40
                                ? "text-yellow-400"
                                : "text-gray-400"
                          }`}
                        >
                          {efectividad}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-brand-chartreuse text-base">
                        {j.puntos || 0} pts
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenJugador(j, idx);
                          }}
                          className="p-2 bg-white/5 hover:bg-brand-chartreuse/20 text-gray-400 hover:text-brand-chartreuse rounded-xl transition-all inline-flex items-center gap-1 text-xs font-bold cursor-pointer"
                          title="Ver Expediente Completo"
                        >
                          <Eye className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal expediente del jugador */}
      {selectedJugador && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {selectedJugador.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedJugador.avatar_url}
                    alt={`${selectedJugador.nombre} ${selectedJugador.apellido}`}
                    className="size-14 rounded-2xl object-cover border-2 border-brand-chartreuse/40"
                  />
                ) : (
                  <div className="size-14 rounded-2xl bg-brand-chartreuse/20 border border-brand-chartreuse/40 flex items-center justify-center font-black text-brand-chartreuse text-xl">
                    {(selectedJugador.nombre?.[0] || "J").toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-chartreuse block">
                    Expediente Oficial de Jugador
                  </span>
                  <h3 className="text-xl font-black text-white">
                    {selectedJugador.nombre} {selectedJugador.apellido}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedJugador(null)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">
                  Club de Pertenencia
                </span>
                <span className="text-white font-bold block">
                  {selectedJugador.club || "Club Afiliado"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">
                  DNI
                </span>
                <span className="text-white font-mono font-bold block">
                  {selectedJugador.dni || "N/D"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">
                  Categoría
                </span>
                <span className="text-brand-chartreuse font-extrabold block">
                  {selectedJugador.categoria_padel || selectedJugador.categoria || "-"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">
                  Posición Ranking
                </span>
                <span className="text-yellow-400 font-black text-xs block">
                  #{selectedJugador.posicion_actual || "-"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">
                  Rama
                </span>
                <span className="text-white font-bold block capitalize">
                  {selectedJugador.sexo || "-"}
                </span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-gray-500 font-bold uppercase text-[10px] block">
                  Provincia
                </span>
                <span className="text-gray-300 font-bold block">
                  {selectedJugador.provincia || "Argentina"}
                </span>
              </div>
            </div>

            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="size-4 text-brand-chartreuse" />
                Rendimiento & Estadísticas
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">
                    Puntos FAP
                  </span>
                  <span className="text-sm font-black text-brand-chartreuse">
                    {selectedJugador.puntos || 0} pts
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">
                    Partidos Jugados
                  </span>
                  <span className="text-sm font-black text-white">
                    {selectedJugador.pj || 0}
                  </span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 block">
                    Efectividad
                  </span>
                  <span className="text-sm font-black text-emerald-400">
                    {(selectedJugador.pj || 0) > 0
                      ? Math.round(
                          ((selectedJugador.pg || 0) /
                            (selectedJugador.pj || 1)) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedJugador(null)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar Ficha del Jugador
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

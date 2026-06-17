"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MapPin,
  Calendar,
  Trophy,
  ChevronDown,
  X,
  Filter,
} from "lucide-react";
import { TorneosService } from "../../../utils/services/torneos";
import { Torneo } from "../../../utils/types";
import { useProfileStore } from "@/store/useProfileStore";

function TorneosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useProfileStore();
  const initialQuery = searchParams.get("q") || "";

  const [tournaments, setTournaments] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- ESTADOS DE FILTROS ---
  const [search, setSearch] = useState<string>(initialQuery);
  const [activeProvincia, setActiveProvincia] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(
    "Inscripción",
  );
  const [activeModalidad, setActiveModalidad] = useState<string | null>(null);

  // --- ESTADO RESPONSIVE ---
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // --- ESTADOS DE ORDENAMIENTO ---
  const [sortBy, setSortBy] = useState<string>("recientes");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    TorneosService.getAll()
      .then((data) => {
        if (isMounted) {
          setTournaments(data || []);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error al cargar torneos:", error);
        if (isMounted) setLoading(false);
      });

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      isMounted = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isMobileFiltersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileFiltersOpen]);

  // ==========================================
  // ⚡ GENERACIÓN DINÁMICA DE FILTROS ⚡
  // ==========================================
  const PROVINCIAS_DINAMICAS = Array.from(
    new Set(tournaments.map((t) => t.clubes?.provincia).filter(Boolean)),
  ).sort() as string[];

  const CATEGORIAS_DINAMICAS = Array.from(
    new Set(tournaments.map((t) => t.nivel).filter(Boolean)),
  ).sort() as string[];

  const ESTADOS = [
    {
      id: "Inscripción",
      label: "Inscripciones Abiertas",
      color: "bg-[#00ff88]",
      shadow: "shadow-[0_0_8px_rgba(0,255,136,0.6)]",
    },
    {
      id: "En curso",
      label: "En Curso",
      color: "bg-[#ffb800]",
      shadow: "shadow-[0_0_8px_rgba(255,184,0,0.6)]",
    },
    {
      id: "Finalizado",
      label: "Finalizado",
      color: "bg-blue-500",
      shadow: "shadow-none",
    },
  ];

  // --- LÓGICA DE FILTRADO CRUZADO ---
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch =
      t.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (t.clubes?.nombre || "").toLowerCase().includes(search.toLowerCase());

    const matchesProvincia =
      !activeProvincia || t.clubes?.provincia === activeProvincia;
    const matchesCategory = !activeCategory || t.nivel === activeCategory;
    // Hacemos el matcheo de estado insensible a mayúsculas
    const matchesStatus =
      !activeStatus ||
      (t.estado || "").toLowerCase() === activeStatus.toLowerCase();
    const matchesModalidad =
      !activeModalidad || t.modalidad === activeModalidad;

    return (
      matchesSearch &&
      matchesProvincia &&
      matchesCategory &&
      matchesStatus &&
      matchesModalidad
    );
  });

  // --- LÓGICA DE ORDENAMIENTO ---
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    if (sortBy === "recientes") return Number(b.id) - Number(a.id);
    if (sortBy === "alfabetico") return a.nombre.localeCompare(b.nombre);
    return 0;
  });

  const handleClearFilters = () => {
    setSearch("");
    setActiveProvincia(null);
    setActiveCategory(null);
    setActiveStatus(null);
    setActiveModalidad(null);
  };

  const formatFecha = (fechaVal?: string | number | null) => {
    if (!fechaVal) return "Fecha a confirmar";
    const date = new Date(String(fechaVal));
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="min-h-screen bg-padel-1 text-white font-sans selection:bg-padel-4 selection:text-padel-1 flex flex-col pt-20">
      <div className="flex flex-1 max-w-[1600px] w-full mx-auto relative">
        {/* OVERLAY PARA MÓVIL */}
        {isMobileFiltersOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileFiltersOpen(false)}
          />
        )}

        {/* SIDEBAR DE FILTROS */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#161616] border-r border-white/5 p-8 space-y-8 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-72 lg:bg-transparent overflow-y-auto ${
            isMobileFiltersOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Filtros</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClearFilters}
                className="text-padel-4 text-xs font-semibold hover:underline"
              >
                Limpiar
              </button>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
            <input
              type="text"
              placeholder="Buscar torneo o club..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:border-padel-4 focus:outline-none transition-colors"
            />
          </div>

          {/* FILTRO PROVINCIA */}
          {PROVINCIAS_DINAMICAS.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Provincia
              </h3>
              <div className="space-y-3">
                {PROVINCIAS_DINAMICAS.map((prov) => (
                  <label
                    key={prov}
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() =>
                      setActiveProvincia(activeProvincia === prov ? null : prov)
                    }
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${activeProvincia === prov ? "border-padel-4 bg-padel-4" : "border-white/20 group-hover:border-padel-4"}`}
                    >
                      {activeProvincia === prov && (
                        <div className="w-2.5 h-2.5 bg-padel-1 rounded-sm"></div>
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors ${activeProvincia === prov ? "text-white" : "text-gray-400 group-hover:text-white"}`}
                    >
                      {prov}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* FILTRO NIVEL */}
          {CATEGORIAS_DINAMICAS.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Nivel
              </h3>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIAS_DINAMICAS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setActiveCategory(activeCategory === cat ? null : cat)
                    }
                    className={`px-4 h-10 rounded-xl text-sm font-bold transition-all border ${
                      activeCategory === cat
                        ? "bg-padel-4 border-padel-4 text-padel-1 shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                        : "border-white/10 text-gray-400 hover:border-padel-4/50 hover:text-white bg-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FILTRO ESTADO */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Estado
            </h3>
            <div className="space-y-3">
              {ESTADOS.map((est) => (
                <label
                  key={est.id}
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() =>
                    setActiveStatus(activeStatus === est.id ? null : est.id)
                  }
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${activeStatus === est.id ? "border-padel-4" : "border-white/20 group-hover:border-padel-4/50"}`}
                  >
                    {activeStatus === est.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-padel-4"></div>
                    )}
                  </div>
                  <span
                    className={`text-sm flex items-center gap-2 ${activeStatus === est.id ? "text-white" : "text-gray-400"}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${est.color} ${activeStatus === est.id ? est.shadow : ""}`}
                    ></span>
                    {est.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* FILTRO MODALIDAD */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Modalidad
            </h3>
            <div className="flex gap-2">
              {["Duplas", "Individual"].map((mod) => (
                <button
                  key={mod}
                  onClick={() =>
                    setActiveModalidad(activeModalidad === mod ? null : mod)
                  }
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                    activeModalidad === mod
                      ? "bg-padel-4 text-padel-1"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* GRILLA PRINCIPAL */}
        <main className="flex-1 p-6 lg:p-10 w-full overflow-x-hidden">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-[32px] md:text-[40px] font-bold leading-tight tracking-tight">
                Explorá torneos
              </h1>
              <p className="text-gray-400 mt-1 md:mt-2 text-sm md:text-base">
                {sortedTournaments.length} torneos encontrados
                {activeProvincia && <span> en {activeProvincia}</span>}
                {activeCategory && <span> · Nivel {activeCategory}</span>}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="lg:hidden flex-1 flex justify-center items-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors bg-[#161616]"
              >
                <Filter className="size-4" /> Filtros
              </button>

              <div className="relative flex-1 md:flex-none" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors bg-[#161616]"
                >
                  {sortBy === "recientes"
                    ? "Más recientes"
                    : "Orden alfabético"}
                  <ChevronDown
                    className={`size-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-full md:w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-20 py-1">
                    <button
                      onClick={() => {
                        setSortBy("recientes");
                        setIsDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-3 text-sm transition-colors ${sortBy === "recientes" ? "bg-white/10 text-white font-bold border-l-2 border-padel-4" : "text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent"}`}
                    >
                      Más recientes
                    </button>
                    <button
                      onClick={() => {
                        setSortBy("alfabetico");
                        setIsDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-3 text-sm transition-colors ${sortBy === "alfabetico" ? "bg-white/10 text-white font-bold border-l-2 border-padel-4" : "text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent"}`}
                    >
                      Orden alfabético
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/5 rounded-3xl h-70"
                ></div>
              ))}
            </div>
          ) : sortedTournaments.length === 0 ? (
            <div className="w-full py-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-white/5">
              <Trophy className="size-12 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No se encontraron torneos
              </h3>
              <p className="text-gray-400 text-sm mb-6 max-w-sm text-center px-4">
                Modificá los filtros o intentá con otra palabra clave para
                encontrar lo que buscás.
              </p>
              <button
                onClick={handleClearFilters}
                className="bg-white/10 border border-white/10 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-white/20 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedTournaments.map((t) => {
                // NORMALIZACIÓN DE ESTADOS (Blindaje contra mayúsculas/minúsculas)
                const estadoStr = (t.estado || "").toLowerCase().trim();
                const isAbierto =
                  estadoStr === "inscripción" || estadoStr === "borrador";
                const isEnCurso = estadoStr === "en curso";
                const isFinalizado = estadoStr === "finalizado";

                const isEnrolled =
                  profile &&
                  t.inscripciones?.some((ins) => ins.usuario_id === profile.id);

                // --- LÓGICA DINÁMICA DEL BOTÓN SEGÚN ESTADO ---
                let btnText = "Inscribirme";
                let btnHref = `/torneos/${t.id}`;
                let btnClass = "bg-padel-4 text-[#111] hover:bg-[#b3e600]";

                if (isEnCurso) {
                  btnText = "Ver en vivo";
                  btnHref = `/torneos/${t.id}`;
                  btnClass =
                    "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20";
                } else if (isFinalizado) {
                  btnText = "Ver resultados";
                  btnHref = `/torneos/${t.id}`;
                  btnClass =
                    "bg-white/10 text-white hover:bg-white/20 border border-white/10";
                } else {
                  if (!profile) {
                    btnText = "Ingresar";
                    btnHref = "/login";
                  } else if (isEnrolled) {
                    btnText = "Ver inscripción";
                    btnHref = "/mis-inscripciones";
                    btnClass = "bg-gray-800 text-gray-300 hover:bg-gray-700";
                  }
                }

                // Definimos el label visual del estado (con Capitalización correcta)
                const labelEstado = isAbierto
                  ? "Abierto"
                  : isEnCurso
                    ? "En curso"
                    : isFinalizado
                      ? "Finalizado"
                      : t.estado;

                return (
                  <div
                    key={t.id}
                    className="group bg-[#161616] border border-white/5 hover:border-padel-4/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_25px_rgba(204,255,0,0.05)] h-70"
                  >
                    {/* ENCABEZADO DE LA CARD */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="bg-padel-4 text-[#111] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                        {t.nivel || "5ª"} {t.categoria || "Caballeros"}
                      </div>
                      <div className="bg-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        {t.modalidad || "Duplas"}
                      </div>
                    </div>

                    {/* CUERPO DE LA CARD */}
                    <div className="mt-auto mb-6">
                      <h3
                        className="text-xl font-bold text-white mb-3 line-clamp-1"
                        title={t.nombre}
                      >
                        {t.nombre}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="size-4 text-gray-500 shrink-0" />
                          <span className="truncate">
                            {t.clubes?.nombre || "Sede a confirmar"}{" "}
                            {t.clubes?.provincia
                              ? `· ${t.clubes.provincia}`
                              : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="size-4 text-gray-500 shrink-0" />
                          <span className="capitalize">
                            {formatFecha(t.fecha)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* FOOTER DE LA CARD BLINDADO CON FLEXBOX */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5 gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${isAbierto ? "bg-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.6)]" : isFinalizado ? "bg-gray-500" : "bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.6)]"}`}
                        ></span>
                        <span
                          className={`text-sm font-bold truncate ${isAbierto ? "text-[#00ff88]" : isFinalizado ? "text-gray-400" : "text-red-500"}`}
                        >
                          {labelEstado}
                        </span>
                      </div>

                      <Link
                        href={btnHref}
                        onClick={() => {
                          setTimeout(() => router.refresh(), 100);
                        }}
                        className={`font-bold px-4 py-2.5 rounded-xl text-[13px] transition-colors whitespace-nowrap shrink-0 text-center ${btnClass}`}
                      >
                        {btnText}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function TorneosExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-padel-1 flex items-center justify-center text-padel-4 font-bold tracking-widest uppercase">
          Cargando Ecosistema...
        </div>
      }
    >
      <TorneosContent />
    </Suspense>
  );
}

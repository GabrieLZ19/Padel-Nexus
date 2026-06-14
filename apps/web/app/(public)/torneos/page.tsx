"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MapPin, Calendar, Trophy, ChevronDown, X } from "lucide-react";
import { TorneosService } from "../../../utils/services/torneos";
import { Torneo } from "../../../utils/types";

function TorneosContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [tournaments, setTournaments] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- ESTADOS DE FILTROS ---
  const [search, setSearch] = useState<string>(initialQuery);
  const [activeProvincia, setActiveProvincia] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>("5ª");
  const [activeStatus, setActiveStatus] = useState<string | null>(
    "Inscripción",
  );

  // --- ESTADOS DE ORDENAMIENTO (Dropdown) ---
  const [sortBy, setSortBy] = useState<string>("recientes"); // 'recientes' | 'alfabetico'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Referencia para cerrar el dropdown al hacer clic afuera (UX premium)
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    TorneosService.getAll()
      .then((data) => {
        if (isMounted) {
          setTournaments(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error al cargar torneos:", error);
        if (isMounted) setLoading(false);
      });

    // Listener para cerrar dropdown
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

  // --- LÓGICA DE FILTRADO CRUZADO ---
  const filteredTournaments = tournaments.filter((t) => {
    // 1. Búsqueda por texto
    const matchesSearch =
      t.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (t.clubes?.nombre || "").toLowerCase().includes(search.toLowerCase());

    // 2. Filtro Provincia (Asumimos que si no hay provincia en BD, mostramos igual si no hay filtro activo)
    const matchesProvincia =
      !activeProvincia || t.clubes?.provincia === activeProvincia;

    // 3. Filtro Categoría (Comparamos el primer caracter ej: '5' para coincidir '5ª Caballeros' con '5ª')
    const matchesCategory =
      !activeCategory || (t.nivel && t.nivel.includes(activeCategory[0]));

    // 4. Filtro Estado
    const matchesStatus = !activeStatus || t.estado.includes(activeStatus);

    return (
      matchesSearch && matchesProvincia && matchesCategory && matchesStatus
    );
  });

  // --- LÓGICA DE ORDENAMIENTO ---
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    if (sortBy === "recientes") {
      // Como no tenemos fecha de creación en el mock, ordenamos por ID de mayor a menor simulando "más recientes"
      return Number(b.id) - Number(a.id);
    }
    if (sortBy === "alfabetico") {
      return a.nombre.localeCompare(b.nombre);
    }
    return 0;
  });

  // --- ACCIÓN LIMPIAR FILTROS ---
  const handleClearFilters = () => {
    setSearch("");
    setActiveProvincia(null);
    setActiveCategory(null);
    setActiveStatus(null);
  };

  // --- CONSTANTES PARA UI ---
  const PROVINCIAS = ["Buenos Aires", "Córdoba", "Santa Fe", "Mendoza"];
  const CATEGORIAS = ["3ª", "4ª", "5ª", "6ª"];
  const ESTADOS = [
    {
      id: "Inscripción",
      label: "Inscripción abierta",
      color: "bg-green-500",
      shadow: "shadow-[0_0_8px_rgba(34,197,94,0.6)]",
    },
    {
      id: "En curso",
      label: "En curso",
      color: "bg-orange-500",
      shadow: "shadow-[0_0_8px_rgba(249,115,22,0.6)]",
    },
    {
      id: "Finalizado",
      label: "Finalizado",
      color: "bg-gray-500",
      shadow: "shadow-none",
    },
  ];

  return (
    <div className="min-h-screen bg-padel-1 text-white font-sans selection:bg-padel-4 selection:text-padel-1 flex flex-col">
      <div className="flex flex-1 max-w-[1600px] w-full mx-auto">
        {/* SIDEBAR DE FILTROS */}
        <aside className="w-64 border-r border-white/5 p-8 space-y-10 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Filtros</h2>
            <button
              onClick={handleClearFilters}
              className="text-padel-4 text-xs font-semibold hover:underline"
            >
              Limpiar
            </button>
          </div>

          {/* Búsqueda rápida local */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
            <input
              type="text"
              placeholder="Buscar torneo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-padel-5 border border-white/10 rounded-lg text-sm text-white focus:border-padel-4 focus:outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filtro Provincia */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Provincia
            </h3>
            <div className="space-y-3">
              {PROVINCIAS.map((prov) => (
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

          {/* Filtro Categoría */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Categoría
            </h3>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setActiveCategory(activeCategory === cat ? null : cat)
                  }
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all border ${
                    activeCategory === cat
                      ? "bg-padel-4 border-padel-4 text-padel-1 shadow-[0_0_15px_rgba(204,255,0,0.2)]"
                      : "border-white/10 text-gray-400 hover:border-padel-4/50 hover:text-white bg-padel-5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro Estado */}
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
                      className={`w-1.5 h-1.5 rounded-full ${est.color} ${activeStatus === est.id ? est.shadow : ""}`}
                    ></span>
                    {est.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* GRILLA PRINCIPAL */}
        <main className="flex-1 p-10 relative">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h1 className="text-[40px] font-bold leading-tight tracking-tight">
                Explorá torneos
              </h1>
              <p className="text-gray-400 mt-2">
                {sortedTournaments.length} torneos encontrados
                {activeProvincia && <span> en {activeProvincia}</span>}
                {activeCategory && <span> · Categoría {activeCategory}</span>}
              </p>
            </div>

            {/* DROPDOWN FUNCIONAL */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-medium hover:bg-padel-5 transition-colors bg-padel-1"
              >
                {sortBy === "recientes" ? "Más recientes" : "Orden alfabético"}
                <ChevronDown
                  className={`size-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-padel-5 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20 py-1">
                  <button
                    onClick={() => {
                      setSortBy("recientes");
                      setIsDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === "recientes" ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    Más recientes
                  </button>
                  <button
                    onClick={() => {
                      setSortBy("alfabetico");
                      setIsDropdownOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === "alfabetico" ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
                  >
                    Orden alfabético
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="w-full py-20 text-center text-gray-500 animate-pulse font-medium">
              Cargando ecosistema...
            </div>
          ) : sortedTournaments.length === 0 ? (
            <div className="w-full py-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-white/2">
              <Trophy className="size-12 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No se encontraron torneos
              </h3>
              <p className="text-gray-400 text-sm mb-6 max-w-sm text-center">
                Modificá los filtros de la barra lateral o intentá con otra
                palabra clave para encontrar lo que buscás.
              </p>
              <button
                onClick={handleClearFilters}
                className="bg-padel-5 border border-white/10 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {sortedTournaments.map((t) => {
                const isAbierto =
                  t.estado === "Inscripción" || t.estado === "Borrador";
                return (
                  <div
                    key={t.id}
                    className="group bg-padel-5 border border-white/5 hover:border-padel-4/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_0_25px_rgba(204,255,0,0.05)] h-62.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="bg-padel-4 text-padel-1 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wide shadow-[0_0_15px_rgba(204,255,0,0.2)]">
                        {t.nivel || "5ª"} {t.categoria || "Caballeros"}
                      </div>
                      <Trophy className="size-5 text-gray-600 group-hover:text-padel-4 transition-colors" />
                    </div>

                    <div className="mt-auto mb-6">
                      <h3 className="text-xl font-bold text-white mb-3 line-clamp-1">
                        {t.nombre}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="size-4 text-gray-500 shrink-0" />
                          <span className="truncate">
                            {t.clubes?.nombre || "Sede a confirmar"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="size-4 text-gray-500 shrink-0" />
                          Sáb 14 Mar · 09:00
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${isAbierto ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : t.estado === "Finalizado" ? "bg-gray-500" : "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"}`}
                        ></span>
                        <span
                          className={`text-sm font-bold ${isAbierto ? "text-green-500" : t.estado === "Finalizado" ? "text-gray-400" : "text-orange-500"}`}
                        >
                          {isAbierto ? "Abierto" : t.estado}
                        </span>
                      </div>

                      <button className="bg-padel-4 text-padel-1 font-bold px-6 py-2.5 rounded-xl text-sm hover:opacity-90 transition-opacity">
                        Inscribirme
                      </button>
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

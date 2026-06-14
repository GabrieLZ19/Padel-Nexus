"use client";

import { useState, useEffect } from "react";
import { Search, User, Pencil, ShieldCheck } from "lucide-react";
import { JugadorLicencia } from "@/utils/types";

// Mock exacto a tu captura de pantalla para que la UI se vea perfecta desde hoy
const MOCK_JUGADORES: JugadorLicencia[] = [
  {
    id: "1",
    nombre: "Tomás Ríos",
    email: "tomas.rios@email.com",
    categoria: "5ª",
    club: "Náutico Pilar",
    estado_licencia: "Vigente",
    vencimiento: "12/2026",
  },
  {
    id: "2",
    nombre: "Lucía Gómez",
    email: "lucia.g@email.com",
    categoria: "4ª",
    club: "Pádel Norte",
    estado_licencia: "Por validar",
    vencimiento: null,
  },
  {
    id: "3",
    nombre: "Pablo Díaz",
    email: "pablo.diaz@email.com",
    categoria: "6ª",
    club: "Tigre PC",
    estado_licencia: "Vigente",
    vencimiento: "08/2026",
  },
  {
    id: "4",
    nombre: "Andrés Soto",
    email: "a.soto@email.com",
    categoria: "5ª",
    club: "La Comarca",
    estado_licencia: "Vencida",
    vencimiento: "02/2026",
  },
  {
    id: "5",
    nombre: "Joaquín Russo",
    email: "j.russo@email.com",
    categoria: "3ª",
    club: "Pádel Pilar",
    estado_licencia: "Por validar",
    vencimiento: null,
  },
  {
    id: "6",
    nombre: "Diego Sánchez",
    email: "d.sanchez@email.com",
    categoria: "3ª",
    club: "Vilas CABA",
    estado_licencia: "Vigente",
    vencimiento: "11/2026",
  },
];

export default function JugadoresLicenciasPage() {
  const [jugadores, setJugadores] = useState<JugadorLicencia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Carga de datos limpia sin renders en cascada
  useEffect(() => {
    let isMounted = true;

    // Simulación de llamada a la API (Acá iría LicenciasService.getAll())
    Promise.resolve(MOCK_JUGADORES)
      .then((data) => {
        if (isMounted) {
          setJugadores(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error al cargar jugadores:", error);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Simulación de la acción "Validar"
  const handleValidar = (id: string) => {
    setLoading(true);
    // Acá iría: LicenciasService.updateEstado(id, 'Vigente').then(() => ...)
    setTimeout(() => {
      setJugadores((prev) =>
        prev.map((j) =>
          j.id === id
            ? { ...j, estado_licencia: "Vigente", vencimiento: "12/2026" }
            : j,
        ),
      );
      setLoading(false);
    }, 600);
  };

  // Filtrado en tiempo real
  const filteredJugadores = jugadores.filter((j) => {
    const term = search.toLowerCase();
    return (
      j.nombre.toLowerCase().includes(term) ||
      j.email.toLowerCase().includes(term) ||
      j.club.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto p-10 space-y-8">
      {/* HEADER Y BUSCADOR (Alineados como en la maqueta) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Jugadores y licencias
          </h1>
          <p className="text-gray-400 mt-1">
            4.820 jugadores · 36 licencias por validar (rol fiscal)
          </p>
        </div>

        <div className="relative w-full lg:w-87.5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
          <input
            type="text"
            placeholder="Buscar jugador o N° licencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-padel-5 border border-white/5 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-padel-4/50 transition-colors"
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-padel-5 rounded-3xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-225">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider bg-black/20">
                  <th className="py-5 px-8">Jugador</th>
                  <th className="py-5 px-6">Categoría</th>
                  <th className="py-5 px-6">Club</th>
                  <th className="py-5 px-6">Licencia</th>
                  <th className="py-5 px-6">Vence</th>
                  <th className="py-5 px-8">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 animate-pulse">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="hover:bg-transparent">
                    {/* Skeleton Jugador */}
                    <td className="py-4 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 shrink-0"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-white/10 rounded"></div>
                          <div className="h-3 w-24 bg-white/5 rounded"></div>
                        </div>
                      </div>
                    </td>
                    {/* Skeleton Categoría */}
                    <td className="py-4 px-6">
                      <div className="h-4 w-8 bg-white/10 rounded"></div>
                    </td>
                    {/* Skeleton Club */}
                    <td className="py-4 px-6">
                      <div className="h-4 w-28 bg-white/10 rounded"></div>
                    </td>
                    {/* Skeleton Licencia */}
                    <td className="py-4 px-6">
                      <div className="h-4 w-20 bg-white/10 rounded-full"></div>
                    </td>
                    {/* Skeleton Vence */}
                    <td className="py-4 px-6">
                      <div className="h-4 w-16 bg-white/10 rounded"></div>
                    </td>
                    {/* Skeleton Acciones */}
                    <td className="py-4 px-8">
                      <div className="h-9 w-24 bg-white/5 rounded-lg"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredJugadores.length === 0 ? (
          <div className="p-20 text-center text-gray-500 font-medium">
            No se encontraron jugadores para el criterio de búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-225">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider bg-black/20">
                  <th className="py-5 px-8">Jugador</th>
                  <th className="py-5 px-6">Categoría</th>
                  <th className="py-5 px-6">Club</th>
                  <th className="py-5 px-6">Licencia</th>
                  <th className="py-5 px-6">Vence</th>
                  <th className="py-5 px-8">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredJugadores.map((jugador) => (
                  <tr
                    key={jugador.id}
                    className="hover:bg-white/2 transition-colors group"
                  >
                    {/* JUGADOR (Avatar + Nombre + Email) */}
                    <td className="py-4 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-padel-1 border border-white/10 flex items-center justify-center text-gray-500 shrink-0 group-hover:border-padel-4/30 transition-colors">
                          <User className="size-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-padel-4 transition-colors">
                            {jugador.nombre}
                          </div>
                          <div className="text-xs text-gray-500">
                            {jugador.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* CATEGORÍA (Con ícono de editar) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-300">
                          {jugador.categoria}
                        </span>
                        <button className="text-gray-600 hover:text-white transition-colors">
                          <Pencil className="size-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* CLUB */}
                    <td className="py-4 px-6 text-sm font-semibold text-gray-300">
                      {jugador.club}
                    </td>

                    {/* LICENCIA (Badges idénticos a la maqueta) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {jugador.estado_licencia === "Vigente" && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-sm font-bold text-green-500">
                              Vigente
                            </span>
                          </>
                        )}
                        {jugador.estado_licencia === "Por validar" && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            <span className="text-sm font-bold text-yellow-500">
                              Por validar
                            </span>
                          </>
                        )}
                        {jugador.estado_licencia === "Vencida" && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-sm font-bold text-red-500">
                              Vencida
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* VENCE */}
                    <td className="py-4 px-6 text-sm text-gray-400">
                      {jugador.vencimiento || "—"}
                    </td>

                    {/* ACCIONES */}
                    <td className="py-4 px-8">
                      {jugador.estado_licencia === "Por validar" ? (
                        <button
                          onClick={() => handleValidar(jugador.id)}
                          className="flex items-center gap-2 bg-padel-4 hover:bg-[#b3e600] text-padel-1 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                        >
                          <ShieldCheck className="size-4" /> Validar
                        </button>
                      ) : (
                        <button className="text-padel-4 hover:underline font-semibold text-sm transition-all">
                          Ver perfil
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

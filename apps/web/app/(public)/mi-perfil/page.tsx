"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Trophy,
  CreditCard,
  Users,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Store,
} from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { useSocket } from "@/hooks/useSocket";
import CredencialDigital from "@/components/perfil/CredencialDigital";
import LicenciaModal from "@/components/perfil/LicenciaModal";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-brand-white/5 rounded-3xl ${className}`} />
);

const LICENSE_RELATED_TITLES = [
  "Licencia Aprobada",
  "Licencia Suspendida",
  "Solicitud de Alta Rechazada",
];

export default function PlayerDashboard() {
  const { profile, fetchProfile } = useProfileStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLicenciaIndex, setActiveLicenciaIndex] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Refrescar el perfil en tiempo real cuando cambia el estado de una licencia
  const handleSocketNotif = useCallback(
    (notif: { titulo: string }) => {
      if (LICENSE_RELATED_TITLES.includes(notif.titulo)) {
        fetchProfile();
      }
    },
    [fetchProfile],
  );

  useSocket(handleSocketNotif);

  return (
    <main className="max-w-6xl mx-auto p-5 md:p-10 space-y-8 md:space-y-10 relative isolate">
      {/* EFECTO DE LUZ DE FONDO SUTIL */}
      <div className="absolute top-[-10%] left-[-5%] w-100 h-100 rounded-full bg-brand-chartreuse/5 blur-[100px] pointer-events-none z-0" />

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 border-b border-brand-white/5 pb-6 md:pb-8 relative z-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Hola,{" "}
            <span className="text-brand-chartreuse">
              {profile?.nombre || "Jugador"}
            </span>
          </h1>
          <p className="text-sm md:text-lg text-gray-400 mt-1 md:mt-2">
            Gestioná tu ficha unificada FAP, torneos oficiales y reservas.
          </p>
        </div>
        <Link
          href="/reservar"
          className="w-full sm:w-auto text-center bg-brand-white text-brand-black px-6 py-3.5 md:py-4 rounded-xl font-bold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md md:text-lg cursor-pointer"
        >
          Nueva Reserva
        </Link>
      </header>

      {/* BENTO GRID MAESTRO */}
      <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 relative z-10">
        {!profile ? (
          <>
            <Skeleton className="col-span-1 lg:row-span-2 min-h-80" />
            <Skeleton className="col-span-2 min-h-35" />
            <Skeleton className="col-span-2 min-h-40" />
            <Skeleton className="col-span-1 lg:row-span-2 min-h-80" />
          </>
        ) : (
          <>
            {/* 1. Licencia - Tarjeta Vertical Alta (Columna 1) */}
            <div className="order-1 col-span-1 lg:row-span-2 bg-brand-card p-6 md:p-8 rounded-3xl border border-brand-white/5 flex flex-col items-center justify-center text-center gap-6 group hover:border-brand-white/10 transition-colors relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-brand-chartreuse/5 to-transparent"></div>

              <div className="flex flex-col items-center w-full relative z-10">
                <div className="p-3 bg-brand-chartreuse/10 rounded-2xl mb-3">
                  <CreditCard className="text-brand-chartreuse size-6 md:size-8" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  Licencia Federativa
                </p>
              </div>

              <div className="w-full flex flex-col items-center relative z-10">
                {profile.licencias && profile.licencias.length > 0 ? (
                  (() => {
                    const licList = profile.licencias;
                    const index =
                      activeLicenciaIndex < licList.length
                        ? activeLicenciaIndex
                        : 0;
                    const currentLic = licList[index];

                    return (
                      <div className="w-full flex flex-col items-center">
                        {/* Selector de Licencias si hay más de una */}
                        {licList.length > 1 && (
                          <div className="flex items-center justify-between w-full max-w-60 mb-4 bg-brand-black/40 border border-brand-white/5 rounded-xl p-1.5">
                            <button
                              onClick={() =>
                                setActiveLicenciaIndex((prev) =>
                                  prev === 0 ? licList.length - 1 : prev - 1,
                                )
                              }
                              className="p-1 hover:text-brand-chartreuse text-gray-400 transition-colors cursor-pointer"
                            >
                              <ChevronLeft className="size-5" />
                            </button>
                            <span className="text-xs font-bold text-gray-300">
                              Licencia {index + 1} de {licList.length}
                            </span>
                            <button
                              onClick={() =>
                                setActiveLicenciaIndex((prev) =>
                                  prev === licList.length - 1 ? 0 : prev + 1,
                                )
                              }
                              className="p-1 hover:text-brand-chartreuse text-gray-400 transition-colors cursor-pointer"
                            >
                              <ChevronRight className="size-5" />
                            </button>
                          </div>
                        )}

                        {currentLic.estado === "Activa" ? (
                          <div className="flex flex-col items-center w-full">
                            <div className="w-full max-w-50 md:max-w-55 flex justify-center drop-shadow-[0_0_30px_rgba(203,254,1,0.1)]">
                              <CredencialDigital
                                usuarioId={profile.id}
                                licenciaId={currentLic.id}
                              />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold mt-5 text-brand-white tracking-wider">
                              {currentLic.nro_licencia}
                            </h2>
                            <p className="text-xs md:text-sm text-brand-chartreuse uppercase font-black tracking-widest mt-1">
                              Estado: Activa
                            </p>
                          </div>
                        ) : currentLic.estado === "Pendiente" ? (
                          <div className="w-full flex flex-col items-center gap-3">
                            <div className="w-full p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-sm font-medium text-center">
                              En revisión administrativa
                            </div>
                            <h2 className="text-xl font-bold text-gray-400 font-mono">
                              {currentLic.nro_licencia}
                            </h2>
                          </div>
                        ) : (
                          <div className="w-full flex flex-col items-center gap-3">
                            <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm  text-center uppercase font-bold">
                              {currentLic.estado}
                            </div>
                            <h2 className="text-xl font-bold text-gray-400 font-mono">
                              {currentLic.nro_licencia}
                            </h2>
                            <button
                              onClick={() => setIsModalOpen(true)}
                              className="w-full max-w-60 bg-brand-chartreuse text-brand-black font-bold py-2.5 px-4 rounded-xl hover:opacity-95 transition-all shadow-md cursor-pointer text-xs"
                            >
                              Solicitar Reingreso
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full max-w-60 bg-brand-chartreuse text-brand-black font-bold py-3.5 px-4 rounded-xl hover:opacity-95 transition-all shadow-md cursor-pointer"
                  >
                    Solicitar Alta
                  </button>
                )}
              </div>

              {/* Afiliaciones cruzadas */}
              {profile.licencias && profile.licencias.length > 0 && (
                <div className="mt-4 pt-4 border-t border-brand-white/5 w-full relative z-10 flex flex-col items-center">
                  {profile.afiliaciones &&
                  profile.afiliaciones.filter(
                    (af) => af.estado !== "suspendido",
                  ).length > 0 ? (
                    <>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                        Clubes Afiliados (
                        {
                          profile.afiliaciones.filter(
                            (af) => af.estado !== "suspendido",
                          ).length
                        }
                        )
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 max-h-24 overflow-y-auto pr-1 mb-3 w-full">
                        {profile.afiliaciones
                          .filter((af) => af.estado !== "suspendido")
                          .map((af) => (
                            <span
                              key={af.id}
                              className="px-2.5 py-1 bg-brand-chartreuse/10 border border-brand-chartreuse/25 rounded-lg text-[9px] text-brand-chartreuse font-extrabold uppercase tracking-wider"
                            >
                              {af.entidad}
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 italic mb-3">
                      Sin clubes activos.
                    </p>
                  )}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full max-w-50 py-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/10 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Afiliarse a otro club
                  </button>
                </div>
              )}
            </div>

            {/* Columnas del Centro (Columna 2 y 3) */}
            <div className="order-2 col-span-1 md:col-span-2 flex flex-col gap-4 md:gap-6 justify-between h-auto lg:h-full lg:min-h-[580px]">
              {/* 2. Categoría - Banner Horizontal */}
              <div className="w-full bg-brand-card p-6 md:p-8 rounded-3xl border border-brand-white/5 flex items-center justify-between group hover:border-brand-white/10 transition-colors overflow-hidden relative flex-1 lg:min-h-[270px] min-h-[160px] h-full">
                <div className="flex items-center gap-4 md:gap-6 relative z-10">
                  <div className="p-4 bg-brand-chartreuse/10 rounded-2xl">
                    <Trophy className="text-brand-chartreuse size-7 md:size-10" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs md:text-sm font-medium text-gray-400 mb-0.5 md:mb-1">
                      Categoría del Circuito
                    </p>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                      {profile.categoria_padel || "S/C"}
                    </h2>
                  </div>
                </div>
                {/* Marca de agua decorativa */}
                <div className="absolute -right-6 top-1/2 -translate-y-1/2 select-none pointer-events-none z-0">
                  <span
                    className="font-black text-[120px] italic"
                    style={{ color: "var(--color-brand-white)", opacity: 0.07 }}
                  >
                    {profile.categoria_padel || "S/C"}
                  </span>
                </div>
              </div>

              {/* Sub-grilla interna de 3 columnas para los botones de abajo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 w-full flex-1 lg:min-h-[270px] h-auto">
                {/* 3. Mis Torneos - Botón Bento */}
                <Link
                  href="/torneos"
                  className="bg-brand-card p-5 md:p-8 rounded-3xl border border-brand-white/5 hover:border-brand-chartreuse/40 transition-all flex flex-col items-center justify-center text-center gap-4 group cursor-pointer h-full"
                >
                  <div className="p-4 bg-brand-white/5 rounded-2xl group-hover:bg-brand-chartreuse/10 transition-colors">
                    <ClipboardList className="text-brand-white group-hover:text-brand-chartreuse size-7 md:size-10 transition-colors" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold text-brand-white">
                      Historial
                    </h2>
                    <p className="text-[11px] md:text-sm text-gray-400 mt-1">
                      Mis Torneos
                    </p>
                  </div>
                </Link>

                {/* 4. Partidos - Botón Bento */}
                <Link
                  href="/partidos"
                  className="bg-brand-card p-5 md:p-8 rounded-3xl border border-brand-white/5 hover:border-brand-chartreuse/40 transition-all flex flex-col items-center justify-center text-center gap-4 group cursor-pointer h-full"
                >
                  <div className="p-4 bg-brand-white/5 rounded-2xl group-hover:bg-brand-chartreuse/10 transition-colors">
                    <Users className="text-brand-white group-hover:text-brand-chartreuse size-7 md:size-10 transition-colors" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold text-brand-white">
                      Buscar 4to
                    </h2>
                    <p className="text-[11px] md:text-sm text-gray-400 mt-1">
                      Partidos Abiertos
                    </p>
                  </div>
                </Link>

                {/* 5. Reservas - Botón Bento */}
                <Link
                  href="/mi-perfil/reservas"
                  className="bg-brand-card p-5 md:p-8 rounded-3xl border border-brand-white/5 hover:border-brand-chartreuse/40 transition-all flex flex-col items-center justify-center text-center gap-4 group cursor-pointer h-full"
                >
                  <div className="p-4 bg-brand-white/5 rounded-2xl group-hover:bg-brand-chartreuse/10 transition-colors">
                    <Calendar className="text-brand-white group-hover:text-brand-chartreuse size-7 md:size-10 transition-colors" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold text-brand-white">
                      Reservas
                    </h2>
                    <p className="text-[11px] md:text-sm text-gray-400 mt-1">
                      Mis Turnos
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* 6. Vendedor - Tarjeta Vertical Alta (Columna 4) */}
            <Link
              href="/mi-perfil/vendedor"
              className="order-3 col-span-1 lg:row-span-2 bg-brand-card p-6 md:p-8 rounded-3xl border border-brand-white/5 hover:border-brand-chartreuse/40 transition-all flex flex-col items-center justify-center text-center gap-6 group cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-brand-chartreuse/5 to-transparent"></div>

              <div className="flex flex-col items-center w-full relative z-10">
                <div className="p-3 bg-brand-chartreuse/10 rounded-2xl mb-3 group-hover:bg-brand-chartreuse/20 transition-colors">
                  <Store className="text-brand-chartreuse size-6 md:size-8" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  Portal Vendedor
                </p>
              </div>

              <div className="w-full flex flex-col items-center relative z-10 space-y-4">
                <h2 className="text-xl md:text-2xl font-black text-brand-white tracking-wider">
                  Mi Tienda
                </h2>
                <p className="text-xs text-gray-500 max-w-[150px] mx-auto">
                  Gestioná tus artículos a la venta, stock y clases.
                </p>
                <div className="w-full py-2 bg-brand-chartreuse text-brand-black rounded-xl text-xs font-bold shadow-md shadow-brand-chartreuse/10 group-hover:opacity-90 transition-opacity">
                  Ingresar
                </div>
              </div>
            </Link>
          </>
        )}
      </section>

      <LicenciaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchProfile();
        }}
        userProfile={profile}
        fetchProfile={fetchProfile}
      />
    </main>
  );
}

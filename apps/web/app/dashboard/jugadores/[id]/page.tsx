"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PerfilService } from "@/utils/services/perfil";
import { LicenciasService } from "@/utils/services/licencias";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Medal,
  Swords,
  Calendar,
  Ban,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Perfil } from "@/utils/types";
import CredencialDigital from "@/components/perfil/CredencialDigital";

export default function PerfilJugadorAdminPage() {
  const { id } = useParams();
  const router = useRouter();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [editingFecha, setEditingFecha] = useState(false);
  const [fechaVencimientoInput, setFechaVencimientoInput] = useState("");
  const [activeLicenciaIndex, setActiveLicenciaIndex] = useState(0);

  const licenciasList = perfil?.licencias || [];
  const currentLicencia =
    licenciasList[activeLicenciaIndex] || licenciasList[0];

  const handleUpdateLicencia = async (
    nuevoEstado: string,
    fechaVenc?: string,
  ) => {
    if (!currentLicencia) return;
    setActualizando(true);
    try {
      await LicenciasService.updateEstado(
        currentLicencia.id,
        nuevoEstado,
        fechaVenc,
      );
      // Actualizamos el input de fecha con la nueva
      if (fechaVenc) setFechaVencimientoInput(fechaVenc);
      await fetchPerfil(true);
      setEditingFecha(false);
    } catch (err) {
      console.error("Error al actualizar licencia:", err);
    } finally {
      setActualizando(false);
    }
  };

  const fetchPerfil = useCallback(
    async (isMounted: boolean) => {
      if (!id) return;
      try {
        const data = await PerfilService.getById(id as string);
        if (isMounted) {
          setPerfil(data);
        }
      } catch (error) {
        console.error("Error al cargar perfil:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (perfil?.licencias) {
      const current =
        perfil.licencias[activeLicenciaIndex] || perfil.licencias[0];
      if (current?.fecha_vencimiento) {
        setFechaVencimientoInput(current.fecha_vencimiento.split("T")[0]);
      } else {
        setFechaVencimientoInput("");
      }
    }
  }, [activeLicenciaIndex, perfil]);

  useEffect(() => {
    let isMounted = true;
    const defer = setTimeout(() => {
      fetchPerfil(isMounted);
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(defer);
    };
  }, [fetchPerfil]);

  // --- SKELETON LOADER ---
  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-pulse">
        <div className="h-5 w-36 bg-white/5 rounded-md"></div>
        <div className="bg-[#161616] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="h-32 bg-white/5 relative border-b border-white/5">
            <div className="absolute -bottom-10 left-8">
              <div className="w-24 h-24 rounded-full bg-[#1e1e1e] border-4 border-[#161616]"></div>
            </div>
          </div>
          <div className="pt-14 pb-8 px-8 border-b border-white/5">
            <div className="h-8 w-64 bg-white/10 rounded-lg mb-3"></div>
            <div className="h-4 w-48 bg-white/5 rounded-md"></div>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="h-4 w-32 bg-white/5 rounded-md"></div>
              <div className="h-32 bg-black/20 rounded-2xl border border-white/5"></div>
            </div>
            <div className="space-y-6">
              <div className="h-4 w-40 bg-white/5 rounded-md"></div>
              <div className="h-48 bg-black/20 rounded-2xl border border-white/5"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- ESTADO VACÍO ---
  if (!perfil) {
    return (
      <div className="w-full max-w-4xl mx-auto p-10 text-center">
        <p className="text-gray-500 mb-4">No se encontró el jugador.</p>
        <button
          onClick={() => router.back()}
          className="text-brand-chartreuse hover:underline font-medium"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  const licencia = perfil.licencias?.[0];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-10 space-y-8">
      {/* Botón Volver */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft className="size-4" /> Volver a jugadores
      </button>

      {/* Tarjeta Principal del Perfil */}
      <div className="bg-[#161616] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="h-32 bg-linear-to-r from-brand-chartreuse/10 to-transparent border-b border-white/5 relative">
          {/* Foto de Perfil (Izquierda) */}
          <div className="absolute -bottom-10 left-8">
            <div className="w-24 h-24 rounded-full bg-[#1a1a1a] border-4 border-[#161616] flex items-center justify-center text-gray-500 shadow-lg">
              <User className="size-10" />
            </div>
          </div>

          {/* QR Digital  */}
          {currentLicencia && currentLicencia.estado === "Activa" && (
            <div className="absolute -bottom-14 right-8 z-10">
              <div className="w-32 h-32 border-4 border-[#161616] rounded-2xl shadow-2xl overflow-hidden bg-white flex items-center justify-center">
                <CredencialDigital
                  usuarioId={perfil.id}
                  licenciaId={currentLicencia.id}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center font-bold uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                Escanear
              </p>
            </div>
          )}
        </div>

        <div className="pt-14 pb-8 px-8 border-b border-white/5">
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
            {perfil.nombre
              ? `${perfil.apellido?.toUpperCase()}, ${perfil.nombre}`
              : "Usuario sin nombre"}
          </h1>
          <p className="text-gray-400 flex items-center gap-2 text-sm">
            <Mail className="size-4" /> {perfil.email || "Sin email registrado"}
          </p>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Datos Deportivos */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Perfil Deportivo
            </h3>

            <div className="bg-[#111111] p-5 rounded-2xl border border-white/5 space-y-4 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2 text-sm">
                  <Medal className="size-4" /> Categoría
                </span>
                <span className="font-bold text-white">
                  {perfil.categoria_padel || "No asignada"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2 text-sm">
                  <Swords className="size-4" /> Lado preferido
                </span>
                <span className="font-medium text-white">
                  {perfil.lado_preferido || "No especificado"}
                </span>
              </div>
            </div>
          </div>

          {/* Contacto y Licencia  */}
          <div className="bg-[#111111] p-5 rounded-2xl border border-white/5 shadow-inner h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2 text-sm">
                  <Phone className="size-4" /> Teléfono
                </span>
                <span className="font-medium text-white">
                  {perfil.telefono || "No registrado"}
                </span>
              </div>

              {licenciasList.length > 0 ? (
                <>
                  {/* Selector de Licencias si hay más de una */}
                  {licenciasList.length > 1 && (
                    <div className="flex items-center justify-between w-full mb-4 bg-brand-black/40 border border-white/5 rounded-xl p-1.5">
                      <button
                        onClick={() => {
                          setActiveLicenciaIndex((prev) =>
                            prev === 0 ? licenciasList.length - 1 : prev - 1,
                          );
                          setEditingFecha(false);
                        }}
                        className="p-1 hover:text-brand-chartreuse text-gray-400 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="text-xs font-bold text-gray-300">
                        Licencia {activeLicenciaIndex + 1} de{" "}
                        {licenciasList.length}
                      </span>
                      <button
                        onClick={() => {
                          setActiveLicenciaIndex((prev) =>
                            prev === licenciasList.length - 1 ? 0 : prev + 1,
                          );
                          setEditingFecha(false);
                        }}
                        className="p-1 hover:text-brand-chartreuse text-gray-400 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Estado</span>
                    <span
                      className={`font-bold text-sm ${
                        currentLicencia.estado === "Activa"
                          ? "text-brand-chartreuse"
                          : currentLicencia.estado === "Pendiente"
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {currentLicencia.estado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">N° Licencia</span>
                    <span className="font-mono text-gray-300 text-sm font-semibold ml-2">
                      {currentLicencia.nro_licencia}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Vencimiento</span>
                      {editingFecha ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            className="bg-[#1a1a1a] text-white border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-brand-chartreuse"
                            value={fechaVencimientoInput}
                            onChange={(e) =>
                              setFechaVencimientoInput(e.target.value)
                            }
                          />
                          <button
                            disabled={actualizando}
                            onClick={() =>
                              handleUpdateLicencia(
                                currentLicencia.estado,
                                fechaVencimientoInput,
                              )
                            }
                            className="p-1 bg-brand-chartreuse text-black rounded hover:bg-[#b3e600] transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <ShieldCheck size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* 🚀 CORRECCIÓN APLICADA AQUÍ ABAJO */}
                          <span className="text-gray-300 text-sm font-semibold">
                            {currentLicencia.fecha_vencimiento
                              ? currentLicencia.fecha_vencimiento.split("T")[0]
                              : "No asignada"}
                          </span>
                          <button
                            onClick={() => setEditingFecha(true)}
                            className="text-gray-500 hover:text-white transition-colors p-1 cursor-pointer"
                          >
                            <Calendar size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Licencia */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                    {currentLicencia.estado === "Activa" ? (
                      <button
                        disabled={actualizando}
                        onClick={() => handleUpdateLicencia("Suspendida")}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Ban size={14} /> Revocar Licencia
                      </button>
                    ) : (
                      <button
                        disabled={actualizando}
                        onClick={() => handleUpdateLicencia("Activa")}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-chartreuse text-brand-black font-extrabold rounded-xl text-xs hover:bg-[#b3e600] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck size={14} /> Activar Licencia
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="pt-4 border-t border-white/5 text-sm text-gray-500">
                  Sin licencia activa.
                </div>
              )}
            </div>
          </div>

          {/* Afiliaciones */}
          <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Afiliaciones y Clubes Activos
            </h3>

            {perfil.afiliaciones && perfil.afiliaciones.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {perfil.afiliaciones.map((af) => (
                  <div
                    key={af.id}
                    className={`bg-brand-black/40 p-4 rounded-2xl flex justify-between items-center relative overflow-hidden hover:border-white/10 transition-colors border ${
                      af.estado === "suspendido"
                        ? "border-red-500/10"
                        : "border-brand-chartreuse/10"
                    }`}
                  >
                    <div
                      className={`absolute top-0 right-0 w-16 h-16 rounded-full blur-xl pointer-events-none ${
                        af.estado === "suspendido"
                          ? "bg-red-500/5"
                          : "bg-brand-chartreuse/5"
                      }`}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        {af.entidad}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        Vence:{" "}
                        {af.fecha_vencimiento
                          ? af.fecha_vencimiento.split("T")[0]
                          : af.vencimiento
                            ? af.vencimiento.split("T")[0]
                            : "S/V"}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border ${
                        af.estado === "suspendido"
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-brand-chartreuse/10 text-brand-chartreuse border-brand-chartreuse/20"
                      }`}
                    >
                      {af.estado || "activo"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-brand-black/20 p-6 rounded-2xl border border-white/5 text-center text-sm text-gray-500">
                El jugador no tiene afiliaciones activas a ningún club federado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

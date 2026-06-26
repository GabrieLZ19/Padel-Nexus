"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PerfilService } from "@/utils/services/perfil";
import { ArrowLeft, User, Mail, Phone, Medal, Swords } from "lucide-react";
import { Perfil } from "@/utils/types";
import CredencialDigital from "@/components/perfil/CredencialDigital";

export default function PerfilJugadorAdminPage() {
  const { id } = useParams();
  const router = useRouter();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = useCallback(
    async (isMounted: boolean) => {
      if (!id) return;
      try {
        const data = await PerfilService.getById(id as string);
        if (isMounted) setPerfil(data);
      } catch (error) {
        console.error("Error al cargar perfil:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    },
    [id],
  );

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

          {licencia && (
            <div className="absolute -bottom-14 right-8 z-10">
              {/* Contenedor aumentado a w-32 h-32 y centrado */}
              <div className="w-32 h-32 border-4 border-[#161616] rounded-2xl shadow-2xl overflow-hidden bg-white flex items-center justify-center">
                <CredencialDigital usuarioId={perfil.id} />
              </div>
              {/* Texto mejorado para mayor legibilidad */}
              <p className="text-[10px] text-gray-400 mt-2 text-center font-bold uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                Escanear
              </p>
            </div>
          )}
        </div>

        <div className="pt-14 pb-8 px-8 border-b border-white/5">
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
            {perfil.nombre_completo || "Usuario sin nombre"}
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

              {licencia ? (
                <>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-gray-400 text-sm">Estado</span>
                    <span
                      className={`font-bold text-sm ${
                        licencia.estado === "Activa"
                          ? "text-brand-chartreuse"
                          : licencia.estado === "Pendiente"
                            ? "text-yellow-500"
                            : "text-red-500"
                      }`}
                    >
                      {licencia.estado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">N° Licencia</span>
                    <span className="font-mono text-gray-300 text-sm font-semibold ml-2">
                      {licencia.nro_licencia}
                    </span>
                  </div>
                </>
              ) : (
                <div className="pt-4 border-t border-white/5 text-sm text-gray-500">
                  Sin licencia activa.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

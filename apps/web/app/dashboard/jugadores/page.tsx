"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  User,
  Pencil,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { LicenciasService } from "@/utils/services/licencias";
import { Licencia } from "@/utils/types";
import FeedbackModal from "@/components/ui/FeedbackModal";
import Pagination from "@/components/ui/Pagination";
import Link from "next/link";

const PAGE_SIZE = 5;

export default function JugadoresLicenciasPage() {
  const [licencias, setLicencias] = useState<Licencia[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Estado para el modal de Feedback General
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: "success" | "danger" | "warning" | "info";
  }>({ isOpen: false, title: "", description: "", type: "info" });

  // Estado para el Modal de VERIFICACIÓN PREVIA
  const [licenciaAVerificar, setLicenciaAVerificar] = useState<Licencia | null>(
    null,
  );
  const [procesando, setProcesando] = useState(false);

  const fetchLicencias = useCallback(
    async (isMounted: boolean, pageNumber: number, query?: string) => {
      try {
        const response = await LicenciasService.getByPage(
          pageNumber,
          PAGE_SIZE,
          query,
        );

        if (isMounted) {
          setLicencias(response.data || []);
          setTotal(response.total || 0);
        }
      } catch (error) {
        console.error("Error al cargar licencias:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    const defer = setTimeout(() => {
      void fetchLicencias(isMounted, page, search);
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(defer);
    };
  }, [fetchLicencias, page, search]);

  // Acción REAL para validar o rechazar
  const confirmarEstadoLicencia = async (
    nuevoEstado: "Activa" | "Suspendida",
  ) => {
    if (!licenciaAVerificar) return;
    setProcesando(true);

    try {
      await LicenciasService.updateEstado(
        String(licenciaAVerificar.id),
        nuevoEstado,
      );

      setFeedback({
        isOpen: true,
        title:
          nuevoEstado === "Activa" ? "Licencia aprobada" : "Licencia rechazada",
        description:
          nuevoEstado === "Activa"
            ? "El alta del jugador se ha procesado con éxito."
            : "La solicitud ha sido rechazada correctamente.",
        type: nuevoEstado === "Activa" ? "success" : "info",
      });

      setLicenciaAVerificar(null); // Cerramos el modal de verificación
      await fetchLicencias(true, page, search); // Recargamos la tabla
    } catch (error) {
      console.error("Error al procesar licencia:", error);
      setFeedback({
        isOpen: true,
        title: "Error de servidor",
        description: "No se pudo actualizar el estado de la licencia.",
        type: "danger",
      });
    } finally {
      setProcesando(false);
    }
  };

  const filteredLicencias = licencias;

  const formatVencimiento = (dateString?: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-10 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Jugadores y licencias
          </h1>
          <p className="text-gray-400 mt-1">
            Mostrando {licencias.length} de {total} solicitudes ·{" "}
            {licencias.filter((l) => l.estado === "Pendiente").length}{" "}
            pendientes en esta página
          </p>
        </div>

        <div className="relative w-full lg:w-87.5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
          <input
            type="text"
            placeholder="Buscar por jugador, email o N° licencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#111111] border border-white/5 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse/50 transition-colors"
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="bg-[#111111] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-225">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider bg-black/20">
                  <th className="py-5 px-8">Jugador</th>
                  <th className="py-5 px-6">Categoría</th>
                  <th className="py-5 px-6">N° Licencia</th>
                  <th className="py-5 px-6">Estado</th>
                  <th className="py-5 px-6">Vence</th>
                  <th className="py-5 px-8">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 animate-pulse">
                {[...Array(5)].map((_, index) => (
                  <tr key={index}>
                    <td className="py-4 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-40 bg-white/10 rounded" />
                          <div className="h-3 w-32 bg-white/5 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-24 bg-white/10 rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-28 bg-white/10 rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-20 bg-white/10 rounded" />
                    </td>
                    <td className="py-4 px-6">
                      <div className="h-4 w-16 bg-white/10 rounded" />
                    </td>
                    <td className="py-4 px-8">
                      <div className="h-10 w-full bg-white/10 rounded-lg" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredLicencias.length === 0 ? (
          <div className="p-20 text-center text-gray-500 font-medium">
            No se encontraron licencias.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-225">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs font-bold uppercase tracking-wider bg-black/20">
                  <th className="py-5 px-8">Jugador</th>
                  <th className="py-5 px-6">Categoría</th>
                  <th className="py-5 px-6">N° Licencia</th>
                  <th className="py-5 px-6">Estado</th>
                  <th className="py-5 px-6">Vence</th>
                  <th className="py-5 px-8">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLicencias.map((licencia) => (
                  <tr
                    key={licencia.id}
                    className="hover:bg-white/2 transition-colors group"
                  >
                    <td className="py-4 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-card border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                          <User className="size-5" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-brand-chartreuse transition-colors">
                            {licencia.perfiles?.nombre_completo || "Sin nombre"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {licencia.perfiles?.email || "Sin email registrado"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-300">
                          {licencia.perfiles?.categoria_padel || "—"}
                        </span>
                        <button className="text-gray-600 hover:text-white transition-colors">
                          <Pencil className="size-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-sm font-semibold text-gray-400 font-mono">
                      {licencia.nro_licencia}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {licencia.estado === "Activa" && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-sm font-bold text-green-500">
                              Vigente
                            </span>
                          </>
                        )}
                        {licencia.estado === "Pendiente" && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            <span className="text-sm font-bold text-yellow-500">
                              Por validar
                            </span>
                          </>
                        )}
                        {licencia.estado === "Vencida" && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-sm font-bold text-red-500">
                              Vencida
                            </span>
                          </>
                        )}
                        {licencia.estado === "Suspendida" && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span className="text-sm font-bold text-orange-500">
                              Rechazada
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-sm text-gray-400">
                      {formatVencimiento(licencia.fecha_vencimiento)}
                    </td>

                    <td className="py-4 px-8">
                      {licencia.estado === "Pendiente" ? (
                        <button
                          onClick={() => setLicenciaAVerificar(licencia)} // <-- ABRE EL MODAL
                          className="flex items-center gap-2 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-card px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                        >
                          <ShieldCheck className="size-4" /> Validar
                        </button>
                      ) : (
                        <Link
                          href={`/dashboard/jugadores/${licencia.usuario_id}`}
                          className="text-brand-chartreuse hover:underline font-semibold text-sm transition-all"
                        >
                          Ver perfil
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        currentCount={licencias.length}
        onPageChange={setPage}
      />

      {/* --- MODAL DE VERIFICACIÓN PREVIA --- */}
      {licenciaAVerificar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] rounded-3xl border border-white/10 w-full max-w-md p-8 relative shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6">
              Verificar Solicitud
            </h3>

            <div className="space-y-4 mb-8 bg-black/20 p-5 rounded-2xl border border-white/5">
              <div>
                <p className="text-xs text-gray-500 mb-1">Jugador</p>
                <p className="text-white font-medium">
                  {licenciaAVerificar.perfiles?.nombre_completo}
                </p>
                <p className="text-sm text-gray-400">
                  {licenciaAVerificar.perfiles?.email}
                </p>
              </div>
              <div className="pt-3 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-1">Documento (DNI)</p>
                <p className="text-white font-mono text-lg">
                  {licenciaAVerificar.datos_solicitud?.documento ||
                    "No provisto"}
                </p>
              </div>
              <div className="pt-3 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-1">Provincia</p>
                <p className="text-white">
                  {licenciaAVerificar.datos_solicitud?.provincia ||
                    "No provista"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                disabled={procesando}
                onClick={() => confirmarEstadoLicencia("Activa")}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-chartreuse text-black font-bold rounded-xl hover:bg-[#b3e600] transition-colors disabled:opacity-50"
              >
                {procesando ? (
                  "Procesando..."
                ) : (
                  <>
                    <CheckCircle2 className="size-5" /> Aprobar Licencia
                  </>
                )}
              </button>
              <button
                disabled={procesando}
                onClick={() => confirmarEstadoLicencia("Suspendida")}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <XCircle className="size-5" /> Rechazar Solicitud
              </button>
              <button
                disabled={procesando}
                onClick={() => setLicenciaAVerificar(null)}
                className="w-full py-3 text-gray-400 font-medium hover:text-white transition-colors mt-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK GENERAL */}
      <FeedbackModal
        isOpen={feedback.isOpen}
        onClose={() => setFeedback((prev) => ({ ...prev, isOpen: false }))}
        title={feedback.title}
        description={feedback.description}
        type={feedback.type}
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  User,
  Pencil,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Ban,
  Calendar,
  Check,
  X,
} from "lucide-react";
import { LicenciasService } from "@/utils/services/licencias";
import { ClubesService } from "@/utils/services/clubes";
import { Licencia } from "@/utils/types";
import FeedbackModal from "@/components/ui/FeedbackModal";
import Pagination from "@/components/ui/Pagination";
import Link from "next/link";

const PAGE_SIZE = 5;

const getDisplayLicencia = (licList?: any[]) => {
  if (!licList || licList.length === 0) return null;
  const pending = licList.find((l) => l.estado === "Pendiente");
  if (pending) return pending;
  const active = licList.find((l) => l.estado === "Activa");
  if (active) return active;
  const vencida = licList.find((l) => l.estado === "Vencida");
  if (vencida) return vencida;
  return licList[0];
};

export default function JugadoresLicenciasPage() {
  const [licencias, setLicencias] = useState<any[]>([]);
  const [clubes, setClubes] = useState<{ [id: string]: string }>({});
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const fetchClubes = async () => {
      try {
        const response = await ClubesService.getAll();
        if (isMounted && response.data) {
          const map: { [id: string]: string } = {};
          response.data.forEach((c: any) => {
            map[c.id] = c.nombre;
          });
          setClubes(map);
        }
      } catch (err) {
        console.error("Error al cargar clubes para mapeo:", err);
      }
    };
    fetchClubes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Estado para el modal de Feedback General
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: "success" | "danger" | "warning" | "info" | "error";
  }>({ isOpen: false, title: "", description: "", type: "info" });

  // Estado para el Modal de VERIFICACIÓN PREVIA
  const [licenciaAVerificar, setLicenciaAVerificar] = useState<Licencia | null>(
    null,
  );
  const [procesando, setProcesando] = useState(false);

  // Estados y handlers para acciones rápidas en la tabla
  const [editingLicenciaId, setEditingLicenciaId] = useState<string | null>(null);
  const [editingFechaInput, setEditingFechaInput] = useState<string>("");

  const handleCambiarEstadoRapido = async (licenciaId: string, nuevoEstado: "Activa" | "Suspendida") => {
    setLoading(true);
    try {
      await LicenciasService.updateEstado(licenciaId, nuevoEstado);
      setFeedback({
        isOpen: true,
        title: nuevoEstado === "Activa" ? "Licencia aprobada" : "Licencia revocada",
        description: nuevoEstado === "Activa"
          ? "La licencia ha sido activada con éxito."
          : "La licencia ha sido suspendida correctamente.",
        type: nuevoEstado === "Activa" ? "success" : "info",
      });
      await fetchLicencias(true, page, search);
    } catch (error) {
      console.error("Error al actualizar licencia rápido:", error);
      setFeedback({
        isOpen: true,
        title: "Error al actualizar",
        description: "No se pudo cambiar el estado de la licencia.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarFechaRapido = async (licenciaId: string, estadoActual: string) => {
    if (!editingFechaInput) return;
    setLoading(true);
    try {
      await LicenciasService.updateEstado(licenciaId, estadoActual, editingFechaInput);
      setFeedback({
        isOpen: true,
        title: "Vencimiento actualizado",
        description: "La fecha de vencimiento ha sido modificada con éxito.",
        type: "success",
      });
      setEditingLicenciaId(null);
      await fetchLicencias(true, page, search);
    } catch (error) {
      console.error("Error al guardar fecha rápido:", error);
      setFeedback({
        isOpen: true,
        title: "Error",
        description: "No se pudo actualizar la fecha de vencimiento.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

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
        type: "error",
      });
    } finally {
      setProcesando(false);
    }
  };

  const filteredLicencias = licencias;

  const formatVencimiento = (dateString?: string | null) => {
    if (!dateString) return "—";
    // Parse date parts directly to avoid UTC→local timezone shift (off-by-one-day in UTC-3)
    const parts = dateString.split("T")[0].split("-");
    if (parts.length < 3) return dateString;
    const [year, month, day] = parts;
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
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
            Mostrando {licencias.length} de {total} jugadores ·{" "}
            {licencias.filter((j) => j.licencias?.some((l: any) => l.estado === "Pendiente")).length}{" "}
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
                  <th className="py-5 px-6">DNI</th>
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
                      <div className="h-4 w-20 bg-white/10 rounded" />
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
                  <th className="py-5 px-6">DNI</th>
                  <th className="py-5 px-6">Categoría</th>
                  <th className="py-5 px-6">N° Licencia</th>
                  <th className="py-5 px-6">Estado</th>
                  <th className="py-5 px-6">Vence</th>
                  <th className="py-5 px-8">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLicencias.map((jugador) => {
                  const licencia = getDisplayLicencia(jugador.licencias);
                  if (!licencia) return null;

                  return (
                    <tr
                      key={jugador.id}
                      className="hover:bg-white/2 transition-colors group"
                    >
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-brand-card border border-white/10 flex items-center justify-center text-gray-500 shrink-0">
                            <User className="size-5" />
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-brand-chartreuse transition-colors">
                              {jugador.nombre
                                ? `${jugador.apellido?.toUpperCase()}, ${jugador.nombre}`
                                : "Sin nombre"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {jugador.email || "Sin email registrado"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-sm font-semibold text-gray-400 font-mono">
                        {jugador.dni || "—"}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-300">
                            {jugador.categoria_padel || "—"}
                          </span>
                          <button className="text-gray-600 hover:text-white transition-colors">
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-sm font-semibold text-gray-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{licencia.nro_licencia}</span>
                          {jugador.licencias && jugador.licencias.length > 1 && (
                            <span
                              className="text-[10px] bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/25 px-1.5 py-0.5 rounded font-bold"
                              title={`${jugador.licencias.length} licencias registradas`}
                            >
                              ({jugador.licencias.length})
                            </span>
                          )}
                        </div>
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
                        {editingLicenciaId === licencia.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              className="bg-[#1a1a1a] text-brand-white border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-brand-chartreuse cursor-pointer"
                              value={editingFechaInput}
                              onClick={(e) => {
                                try {
                                  (e.target as any).showPicker();
                                } catch (err) {}
                              }}
                              onChange={(e) => setEditingFechaInput(e.target.value)}
                            />
                            <button
                              onClick={() => handleGuardarFechaRapido(licencia.id, licencia.estado)}
                              className="p-1.5 bg-brand-chartreuse text-black rounded hover:bg-[#b3e600] transition-colors cursor-pointer"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setEditingLicenciaId(null)}
                              className="p-1.5 bg-white/5 text-gray-400 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/date">
                            <span>{formatVencimiento(licencia.fecha_vencimiento)}</span>
                            {licencia.estado !== "Pendiente" && (
                              <button
                                onClick={() => {
                                  setEditingLicenciaId(licencia.id);
                                  setEditingFechaInput(licencia.fecha_vencimiento ? licencia.fecha_vencimiento.split("T")[0] : "");
                                }}
                                className="text-brand-chartreuse/60 hover:text-brand-chartreuse transition-all cursor-pointer p-1 rounded hover:bg-white/5"
                                title="Editar fecha"
                              >
                                <Calendar className="size-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-8">
                        <div className="flex items-center gap-2">
                          {licencia.estado === "Pendiente" ? (
                            <button
                              onClick={() => setLicenciaAVerificar({ ...licencia, perfiles: jugador })}
                              className="flex items-center gap-1.5 bg-brand-chartreuse hover:bg-[#b3e600] text-brand-card px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-[0_0_15px_rgba(204,255,0,0.15)] cursor-pointer"
                              title="Validar y Aprobar Solicitud"
                            >
                              <ShieldCheck className="size-3.5" /> Validar
                            </button>
                          ) : (
                            <>
                              {licencia.estado === "Activa" ? (
                                <button
                                  onClick={() => handleCambiarEstadoRapido(licencia.id, "Suspendida")}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg transition-colors cursor-pointer"
                                  title="Revocar Licencia"
                                >
                                  <Ban className="size-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCambiarEstadoRapido(licencia.id, "Activa")}
                                  className="p-1.5 bg-brand-chartreuse/10 hover:bg-brand-chartreuse text-brand-chartreuse hover:text-brand-card border border-brand-chartreuse/25 rounded-lg transition-colors cursor-pointer"
                                  title="Activar Licencia"
                                >
                                  <ShieldCheck className="size-3.5" />
                                </button>
                              )}
                            </>
                          )}
                          <Link
                            href={`/dashboard/jugadores/${jugador.id}`}
                            className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 rounded-lg transition-colors flex items-center justify-center"
                            title="Ver perfil completo"
                          >
                            <User className="size-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-brand-card/95 border border-brand-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-md relative shadow-2xl backdrop-blur-2xl">
            {/* Neon Glow inside modal */}
            <div className="absolute -top-20 -right-20 size-45 rounded-full bg-brand-chartreuse/10 blur-[60px] pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 size-45 rounded-full bg-brand-chartreuse/5 blur-[60px] pointer-events-none" />

            <div className="flex flex-col items-center text-center mb-6 pt-2">
              <div className="size-14 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(203,254,1,0.1)]">
                <ShieldCheck className="size-7 text-brand-chartreuse" />
              </div>
              <h3 className="text-xl font-bold text-brand-white tracking-tight">
                Verificar Solicitud
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-normal max-w-[280px]">
                Revisá los datos federativos declarados por el jugador para su alta.
              </p>
            </div>

            <div className="space-y-4 mb-6 bg-brand-black/50 p-4 rounded-2xl border border-brand-white/5 relative z-10">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Jugador</p>
                <p className="text-sm font-semibold text-brand-white">
                  {licenciaAVerificar.perfiles?.nombre
                    ? `${licenciaAVerificar.perfiles.apellido?.toUpperCase()}, ${licenciaAVerificar.perfiles.nombre}`
                    : "No provisto"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {licenciaAVerificar.perfiles?.email}
                </p>
              </div>

              <div className="pt-3 border-t border-brand-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">DNI / Documento</p>
                  <p className="text-sm font-mono text-brand-white font-semibold">
                    {licenciaAVerificar.datos_solicitud?.documento || "No provisto"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Provincia</p>
                  <p className="text-sm font-semibold text-brand-white">
                    {licenciaAVerificar.datos_solicitud?.provincia || "No provista"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-white/5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Club Representante Solicitado</p>
                <p className="text-sm font-bold text-brand-chartreuse">
                  {clubes[licenciaAVerificar.datos_solicitud?.club_id || ""] || "Cargando club..."}
                </p>
              </div>

              {/* Afiliaciones Actuales */}
              <div className="pt-3 border-t border-brand-white/5">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">
                  Afiliaciones Cruzadas / Clubes Activos ({licenciaAVerificar.perfiles?.afiliaciones?.length || 0})
                </p>
                {licenciaAVerificar.perfiles?.afiliaciones && licenciaAVerificar.perfiles.afiliaciones.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {licenciaAVerificar.perfiles.afiliaciones.map((af) => (
                      <span
                        key={af.id}
                        className="px-2 py-0.5 bg-brand-chartreuse/10 border border-brand-chartreuse/20 rounded-md text-[10px] text-brand-chartreuse font-semibold uppercase"
                      >
                        {af.entidad}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Sin otras afiliaciones registradas.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 relative z-10">
              <button
                disabled={procesando}
                onClick={() => confirmarEstadoLicencia("Activa")}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-chartreuse text-brand-black font-extrabold rounded-xl hover:bg-[#b3e600] transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-brand-chartreuse/10"
              >
                {procesando ? (
                  "Procesando..."
                ) : (
                  <>
                    <CheckCircle2 className="size-4" /> Aprobar y Afiliar Jugador
                  </>
                )}
              </button>
              <button
                disabled={procesando}
                onClick={() => confirmarEstadoLicencia("Suspendida")}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <XCircle className="size-4" /> Rechazar Solicitud
              </button>
              <button
                disabled={procesando}
                onClick={() => setLicenciaAVerificar(null)}
                className="w-full py-2.5 text-gray-500 font-medium hover:text-white transition-colors cursor-pointer text-sm mt-1"
              >
                Cerrar
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

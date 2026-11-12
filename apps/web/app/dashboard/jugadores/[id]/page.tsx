"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PerfilService } from "@/utils/services/perfil";
import { etiquetaCategoria } from "@/utils/etiquetaCategoria";
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
import FeedbackModal from "@/components/ui/FeedbackModal";
import { useProfileStore } from "@/store/useProfileStore";
import { CrmContactosService } from "@/utils/services/crm-contactos";
import { licenciasComoArray } from "@/utils/licenciasArray";
import { ContactoEtiquetasEditor } from "@/components/crm/ContactoEtiquetasEditor";
import type { ComunicacionesEtiqueta } from "@/utils/types/comunicaciones.types";
import { sileo } from "sileo";
import { fechaLatina, fechaHoraLatinaArgentina } from "@/utils/fechaArgentina";
import {
  detalleTextoHistorialLicencia,
  etiquetaAccionHistorialLicencia,
} from "@/utils/historialLicenciaUi";

export default function PerfilJugadorAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const esSuperadmin = useProfileStore((s) => s.profile?.rol === "superadmin");

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [editingFecha, setEditingFecha] = useState(false);
  const [fechaVencimientoInput, setFechaVencimientoInput] = useState("");
  const [activeLicenciaIndex, setActiveLicenciaIndex] = useState(0);
  const [confirmarSuspender, setConfirmarSuspender] = useState(false);
  const [confirmarReactivar, setConfirmarReactivar] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [etiquetasCrm, setEtiquetasCrm] = useState<ComunicacionesEtiqueta[]>(
    [],
  );
  const [guardandoEtiquetas, setGuardandoEtiquetas] = useState(false);

  const licenciasList = licenciasComoArray(perfil?.licencias);
  const currentLicencia =
    licenciasList[activeLicenciaIndex] || licenciasList[0];

  const [historialLicencia, setHistorialLicencia] = useState<
    Array<{
      id: string;
      accion: string;
      detalles: Record<string, unknown> | null;
      created_at: string;
      admin_nombre?: string | null;
    }>
  >([]);

  const cargarHistorialLicencia = useCallback(async (licenciaId: string) => {
    try {
      const rows = await LicenciasService.getHistorial(licenciaId);
      setHistorialLicencia(rows);
    } catch {
      setHistorialLicencia([]);
    }
  }, []);

  useEffect(() => {
    if (currentLicencia?.id) {
      void cargarHistorialLicencia(currentLicencia.id);
    }
  }, [currentLicencia?.id, cargarHistorialLicencia]);

  const handleUpdateLicencia = async (
    nuevoEstado: string,
    fechaVenc?: string,
    motivo?: string,
  ) => {
    if (!currentLicencia) return;
    setActualizando(true);
    try {
      const previo = currentLicencia.estado;
      const actualizada = await LicenciasService.updateEstado(
        currentLicencia.id,
        nuevoEstado,
        fechaVenc,
        motivo,
      );
      // Actualizamos el input de fecha con la nueva
      if (fechaVenc) setFechaVencimientoInput(fechaVenc);
      if (fechaVenc) {
        if (previo === "Vencida" && actualizada.estado === "Activa") {
          sileo.success({
            title: "Licencia vigente",
            description:
              "Se actualizó el vencimiento y la licencia volvió a estado activo.",
          });
        } else if (previo === "Activa" && actualizada.estado === "Vencida") {
          sileo.warning({
            title: "Vencimiento en el pasado",
            description:
              "Con esa fecha la licencia figura vencida en el sistema.",
          });
        } else {
          sileo.success({
            title: "Vencimiento actualizado",
            description: "La fecha de vencimiento fue guardada.",
          });
        }
      }
      await fetchPerfil(true);
      if (currentLicencia?.id) {
        await cargarHistorialLicencia(currentLicencia.id);
      }
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
          setEtiquetasCrm(data?.etiquetas_contacto ?? []);
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
    if (licenciasList.length > 0) {
      const current =
        licenciasList[activeLicenciaIndex] || licenciasList[0];
      if (current?.fecha_vencimiento) {
        setFechaVencimientoInput(current.fecha_vencimiento.split("T")[0]);
      } else {
        setFechaVencimientoInput("");
      }
    }
  }, [activeLicenciaIndex, licenciasList]);

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

  const guardarEtiquetasCrm = async (siguiente: ComunicacionesEtiqueta[]) => {
    if (!perfil?.id) return;
    const previo = etiquetasCrm;
    setEtiquetasCrm(siguiente);
    setGuardandoEtiquetas(true);
    try {
      const guardadas = await CrmContactosService.actualizarEtiquetas(
        perfil.id,
        siguiente,
      );
      setEtiquetasCrm(guardadas);
      setPerfil((p) => (p ? { ...p, etiquetas_contacto: guardadas } : p));
      sileo.success({
        title: "Etiquetas guardadas",
        description: "El segmento del contacto quedó actualizado.",
      });
    } catch {
      setEtiquetasCrm(previo);
      sileo.error({
        title: "No se guardaron las etiquetas",
        description: "Intentá de nuevo en unos segundos.",
      });
    } finally {
      setGuardandoEtiquetas(false);
    }
  };

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

  const licencia = licenciasList[0];

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
                  titulo={currentLicencia.datos_solicitud?.nombre_carne}
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
                  {etiquetaCategoria(perfil.categoria_padel) || "No asignada"}
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
              {esSuperadmin ? (
                <div className="rounded-xl border border-white/5 bg-brand-black/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                    Etiquetas CRM
                  </p>
                  <ContactoEtiquetasEditor
                    valor={etiquetasCrm}
                    disabled={guardandoEtiquetas}
                    onChange={guardarEtiquetasCrm}
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-2 text-sm">
                  <User className="size-4" /> DNI
                </span>
                <span className="font-medium text-white">
                  {perfil.dni || "No registrado"}
                </span>
              </div>

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
                            className="bg-[#1a1a1a] text-brand-white border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-brand-chartreuse cursor-pointer"
                            value={fechaVencimientoInput}
                            onClick={(e) => {
                              try {
                                (e.target as any).showPicker();
                              } catch (err) {}
                            }}
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
                              ? fechaLatina(currentLicencia.fecha_vencimiento)
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

                  {historialLicencia.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Historial de licencia
                      </p>
                      <ul className="space-y-2 max-h-36 overflow-y-auto text-[11px] text-gray-400">
                        {historialLicencia.map((ev) => {
                          const detalle = detalleTextoHistorialLicencia(ev);
                          const autor =
                            ev.admin_nombre?.trim() || "Sin autor registrado";
                          return (
                            <li key={ev.id} className="space-y-0.5">
                              <div className="flex flex-wrap items-center gap-x-2">
                                <span className="font-semibold text-gray-200">
                                  {etiquetaAccionHistorialLicencia(ev.accion)}
                                </span>
                                <span className="text-gray-500">
                                  {fechaHoraLatinaArgentina(ev.created_at)}
                                </span>
                              </div>
                              <p className="text-gray-500 leading-snug">
                                Por {autor}
                                {detalle ? ` · ${detalle}` : ""}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {/* Acciones de Licencia */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                    {currentLicencia.estado === "Activa" ? (
                      <button
                        type="button"
                        disabled={actualizando}
                        onClick={() => setConfirmarSuspender(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border border-orange-500/30 bg-orange-500/10 text-orange-300 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 hover:bg-orange-500/20"
                      >
                        <Ban size={14} /> Suspender licencia
                      </button>
                    ) : currentLicencia.estado !== "Pendiente" ? (
                      <button
                        type="button"
                        disabled={actualizando}
                        onClick={() => setConfirmarReactivar(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-chartreuse text-brand-black font-extrabold rounded-xl text-xs hover:bg-[#b3e600] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck size={14} /> Reactivar licencia
                      </button>
                    ) : null}
                    {["Activa", "Suspendida", "Vencida"].includes(
                      currentLicencia.estado,
                    ) && (
                      <button
                        type="button"
                        disabled={actualizando}
                        onClick={() => setConfirmarBaja(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Ban size={14} /> Dar de baja
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
      <FeedbackModal
        isOpen={confirmarSuspender}
        type="warning"
        title="¿Suspender licencia?"
        description="La licencia quedará suspendida. El jugador recibirá una notificación con el motivo."
        confirmText="Suspender"
        cancelText="Cancelar"
        isLoading={actualizando}
        showInput
        inputType="textarea"
        inputLabel="Motivo (obligatorio)"
        inputPlaceholder="Ej. falta de pago, documentación incompleta..."
        inputMinLength={3}
        onClose={() => setConfirmarSuspender(false)}
        onConfirm={(motivo) => {
          if (!motivo?.trim() || motivo.trim().length < 3) return;
          void handleUpdateLicencia("Suspendida", undefined, motivo.trim()).finally(
            () => setConfirmarSuspender(false),
          );
        }}
      />
      <FeedbackModal
        isOpen={confirmarReactivar}
        type="info"
        title="¿Reactivar licencia?"
        description="La licencia volverá a estado activo. El jugador podrá usar el carnet según la vigencia actual."
        confirmText="Reactivar"
        cancelText="Cancelar"
        isLoading={actualizando}
        onClose={() => setConfirmarReactivar(false)}
        onConfirm={() => {
          void handleUpdateLicencia("Activa").finally(() =>
            setConfirmarReactivar(false),
          );
        }}
      />
      <FeedbackModal
        isOpen={confirmarBaja}
        type="danger"
        title="¿Dar de baja la licencia?"
        description="Se eliminará el carnet de forma definitiva. El jugador deberá iniciar un nuevo trámite."
        confirmText="Dar de baja"
        cancelText="Cancelar"
        isLoading={actualizando}
        onClose={() => setConfirmarBaja(false)}
        onConfirm={() => {
          if (!currentLicencia) return;
          setActualizando(true);
          void LicenciasService.darDeBaja(currentLicencia.id)
            .then(() => fetchPerfil(true))
            .catch((err) => console.error("Error al dar de baja:", err))
            .finally(() => {
              setActualizando(false);
              setConfirmarBaja(false);
            });
        }}
      />
    </div>
  );
}

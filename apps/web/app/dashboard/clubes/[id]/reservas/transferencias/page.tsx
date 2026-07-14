"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Loader2,
  DollarSign,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
  Search,
} from "lucide-react";
import { api } from "@/utils/api";
import { sileo } from "sileo";

interface PagoPendiente {
  id: string;
  monto: number;
  metodo_pago: string;
  referencia_pago: string | null;
  comprobante_url: string | null;
  estado: string;
  created_at: string;
  perfiles?: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    telefono?: string | null;
  } | null;
  reservas?: {
    id: string;
    fecha_reserva: string;
    turnos?: {
      id: string;
      hora_inicio: string;
      hora_fin: string;
      precio: number;
      canchas?: {
        id: string;
        nombre: string;
        club_id: string;
        clubes?: {
          id: string;
          nombre: string;
        } | null;
      } | null;
    } | null;
  } | null;
}

export default function TransferenciasPendientesPage() {
  const params = useParams();
  const clubId = params.id as string;

  const [pagos, setPagos] = useState<PagoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [modalImagenUrl, setModalImagenUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPendientes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reservas/pagos/pendientes", {
        params: { club_id: clubId },
      });
      setPagos(data.data || []);
    } catch (err: any) {
      console.error("Error al cargar transferencias pendientes:", err);
      sileo.error({
        title: "Error de Carga",
        description: "No se pudieron obtener las transferencias pendientes.",
      });
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchPendientes();
  }, [fetchPendientes]);

  const handleValidar = async (pagoId: string, aprobado: boolean) => {
    setProcessingId(pagoId);
    try {
      await api.post(`/reservas/pagos/${pagoId}/validar`, { aprobado });
      
      sileo.success({
        title: aprobado ? "Transferencia Aprobada" : "Transferencia Rechazada",
        description: aprobado
          ? "El pago ha sido acreditado y la reserva confirmada."
          : "El pago fue marcado como rechazado.",
      });

      // Actualizar lista localmente
      setPagos((prev) => prev.filter((pago) => pago.id !== pagoId));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Error al procesar validación.";
      sileo.error({
        title: "Error al validar",
        description: msg,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatHora = (time?: string) => (time ? time.slice(0, 5) : "00:00");

  const formatFecha = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T12:00:00Z");
    const dias = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${dias[date.getUTCDay()]} ${date.getUTCDate()} de ${meses[date.getUTCMonth()]}`;
  };

  const filteredPagos = pagos.filter((p) => {
    const userName = `${p.perfiles?.apellido || ""} ${p.perfiles?.nombre || ""}`.toLowerCase();
    const reference = (p.referencia_pago || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return userName.includes(query) || reference.includes(query);
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto p-6 sm:p-10 space-y-8">
      {/* Encabezado */}
      <div>
        <Link
          href={`/dashboard/clubes/${clubId}/reservas`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-brand-chartreuse transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a reservas
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Validación de Transferencias
        </h1>
        <p className="text-gray-400 mt-1.5 text-sm">
          Revisá y acreditá los comprobantes de pago subidos por los usuarios.
        </p>
      </div>

      {/* Buscador */}
      <div className="flex max-w-md items-center bg-brand-card border border-white/10 rounded-xl px-3 py-2">
        <Search className="w-4 h-4 text-gray-500 mr-2" />
        <input
          type="text"
          placeholder="Buscar por jugador o código de referencia..."
          className="bg-transparent border-none text-sm text-white focus:outline-none w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Listado */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-chartreuse" />
        </div>
      ) : filteredPagos.length === 0 ? (
        <div className="text-center py-20 bg-brand-card border border-white/5 rounded-3xl max-w-xl mx-auto space-y-4">
          <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-400">Sin transferencias pendientes</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            ¡Buen trabajo! No hay solicitudes de validación de pago pendientes de revisión para este club en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredPagos.map((pago) => {
            const perfil = pago.perfiles;
            const reserva = pago.reservas;
            const turno = reserva?.turnos;
            const canchaNombre = turno?.canchas?.nombre || "Cancha";

            return (
              <div
                key={pago.id}
                className="bg-brand-card border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="space-y-4 flex-1">
                  {/* Datos del Turno */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/25 px-2 py-0.5 rounded">
                      {canchaNombre}
                    </span>
                    <h3 className="font-bold text-lg mt-2 flex items-center gap-2 text-white">
                      <span>${pago.monto}</span>
                      <span className="text-xs text-gray-400 font-normal">monto cargado</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-brand-chartreuse" />
                        <span>{formatFecha(reserva?.fecha_reserva)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-brand-chartreuse" />
                        <span>
                          {formatHora(turno?.hora_inicio)} - {formatHora(turno?.hora_fin)} Hs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Datos del Usuario */}
                  <div className="border-t border-white/5 pt-3 space-y-1.5 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-500" />
                      <span className="font-semibold text-white">
                        {perfil ? `${perfil.apellido || ""}, ${perfil.nombre || ""}` : "Usuario desconocido"}
                      </span>
                    </div>
                    {perfil?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-500" />
                        <span>{perfil.email}</span>
                      </div>
                    )}
                    {perfil?.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-500" />
                        <span>{perfil.telefono}</span>
                      </div>
                    )}
                  </div>

                  {/* Referencia y Comprobante */}
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Referencia:</span>
                      <span className="font-mono text-white font-bold select-all">{pago.referencia_pago || "Sin código"}</span>
                    </div>
                    {pago.comprobante_url ? (
                      <button
                        onClick={() => setModalImagenUrl(pago.comprobante_url)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/25 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver Comprobante Adjunto
                      </button>
                    ) : (
                      <div className="text-center py-2 text-xs text-gray-500 italic">
                        No se adjuntó archivo de comprobante
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones de Validación */}
                <div className="flex md:flex-col justify-end gap-2.5 shrink-0 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                  <button
                    disabled={processingId === pago.id}
                    onClick={() => handleValidar(pago.id, true)}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-chartreuse hover:brightness-110 disabled:opacity-50 text-black font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    {processingId === pago.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Aprobar
                  </button>
                  <button
                    disabled={processingId === pago.id}
                    onClick={() => handleValidar(pago.id, false)}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 disabled:opacity-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Previsualizar el Comprobante */}
      {modalImagenUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="relative max-w-4xl w-full h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setModalImagenUrl(null)}
              className="absolute -top-12 right-0 p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-white cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full h-full flex items-center justify-center bg-brand-black rounded-3xl overflow-hidden border border-white/10">
              {modalImagenUrl.endsWith(".pdf") ? (
                <iframe src={modalImagenUrl} className="w-full h-full border-none" title="Comprobante PDF" />
              ) : (
                <img
                  src={modalImagenUrl}
                  alt="Comprobante de Pago"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
            <a
              href={modalImagenUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-chartreuse hover:underline"
            >
              Abrir en una nueva pestaña <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
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
  FileText,
  Eye,
} from "lucide-react";
import { ReservasService } from "@/utils/services/reservas";
import { useProfileStore } from "@/store/useProfileStore";
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
      };
    };
  };
}

export default function ClubTransferenciasPendientesPage() {
  const { profile } = useProfileStore();
  const clubId = profile?.club_id;

  const [pagos, setPagos] = useState<PagoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPago, setSelectedPago] = useState<PagoPendiente | null>(null);
  const [modalImagenUrl, setModalImagenUrl] = useState<string | null>(null);

  const fetchPendientes = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const data = await ReservasService.getPagosPendientes(clubId);
      const list = data || [];
      setPagos(list);
      if (list.length > 0) {
        setSelectedPago(list[0]);
      } else {
        setSelectedPago(null);
      }
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
      await ReservasService.validarPago(pagoId, aprobado);

      sileo.success({
        title: aprobado ? "Transferencia Aprobada" : "Transferencia Rechazada",
        description: aprobado
          ? "El pago ha sido acreditado y la reserva confirmada."
          : "El pago fue marcado como rechazado.",
      });

      // Actualizar lista localmente
      setPagos((prev) => {
        const filtrados = prev.filter((pago) => pago.id !== pagoId);
        if (selectedPago?.id === pagoId) {
          setSelectedPago(filtrados.length > 0 ? filtrados[0] : null);
        }
        return filtrados;
      });
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Error al procesar validación.";
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
    const meses = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    return `${dias[date.getUTCDay()]} ${date.getUTCDate()} de ${meses[date.getUTCMonth()]}`;
  };

  const filteredPagos = pagos.filter((p) => {
    const userName =
      `${p.perfiles?.apellido || ""} ${p.perfiles?.nombre || ""}`.toLowerCase();
    const reference = (p.referencia_pago || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return userName.includes(query) || reference.includes(query);
  });

  return (
    <div className="w-full max-w-[1500px] mx-auto p-4 sm:p-8 flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-3rem)]">
      {/* Encabezado */}
      <div className="mb-6 shrink-0">
        <Link
          href="/club/reservas"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-brand-chartreuse transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a reservas
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-brand-white">
              Validación de Transferencias
            </h1>
            <p className="text-gray-400 mt-1 text-xs font-medium">
              Gestione y apruebe comprobantes bancarios cargados por los
              usuarios para asegurar sus turnos
            </p>
          </div>
          <div className="flex items-center bg-brand-card border border-brand-white/5 rounded-xl px-3.5 py-2 w-full sm:max-w-xs focus-within:border-brand-chartreuse/40 transition-colors">
            <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Buscar emisor o referencia..."
              className="bg-transparent border-none text-xs text-brand-white focus:outline-none w-full placeholder-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-brand-card/30 border border-brand-white/5 rounded-3xl">
          <Loader2 className="w-8 h-8 animate-spin text-brand-chartreuse" />
        </div>
      ) : filteredPagos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-brand-card border border-brand-white/5 rounded-3xl max-w-xl mx-auto w-full px-6 space-y-4">
          <div className="size-16 rounded-full bg-brand-chartreuse/10 flex items-center justify-center text-brand-chartreuse border border-brand-chartreuse/20">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-brand-white text-center">
            Sin transferencias pendientes
          </h3>
          <p className="text-gray-500 text-xs text-center max-w-sm">
            ¡Excelente! Todos los comprobantes de transferencias bancarias han
            sido procesados. No hay pagos pendientes en la bandeja de entrada.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Panel Izquierdo: Bandeja de Entrada (Lista de Transferencias) */}
          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 flex flex-col min-h-0 bg-brand-card border border-brand-white/5 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-brand-white/5 bg-brand-card/50 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                Bandeja de Entrada
              </span>
              <span className="text-[10px] font-black bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/25 px-2 py-0.5 rounded-full">
                {filteredPagos.length} pendiente
                {filteredPagos.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-brand-white/5">
              {filteredPagos.map((pago) => {
                const isSelected = selectedPago?.id === pago.id;
                const perfil = pago.perfiles;
                const reserva = pago.reservas;
                const canchaNombre =
                  reserva?.turnos?.canchas?.nombre || "Cancha";

                return (
                  <button
                    key={pago.id}
                    onClick={() => setSelectedPago(pago)}
                    className={`w-full p-4 flex flex-col text-left transition-all relative border-l-4 cursor-pointer ${
                      isSelected
                        ? "bg-brand-chartreuse/3 border-l-brand-chartreuse"
                        : "hover:bg-brand-white/1 border-l-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full gap-2">
                      <p className="text-xs font-black text-brand-white truncate flex-1">
                        {perfil?.apellido?.toUpperCase()}, {perfil?.nombre}
                      </p>
                      <span className="text-xs font-black text-brand-chartreuse shrink-0">
                        ${pago.monto.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-500 font-bold">
                      <span className="bg-brand-white/5 px-2 py-0.5 rounded text-gray-400">
                        {canchaNombre}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-brand-chartreuse" />
                        {reserva?.fecha_reserva
                          ? formatFecha(reserva.fecha_reserva).split(" de ")[0]
                          : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-brand-chartreuse" />
                        {formatHora(reserva?.turnos?.hora_inicio)} hs
                      </span>
                    </div>

                    {pago.referencia_pago && (
                      <span className="text-[9px] text-gray-500 mt-2 block truncate font-medium bg-brand-black/20 px-2 py-1 rounded w-fit border border-brand-white/5">
                        Ref: {pago.referencia_pago}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panel Derecho: Inspector de Comprobante Seleccionado */}
          {selectedPago && (
            <div className="flex-1 flex flex-col min-h-0 bg-brand-card border border-brand-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
              {/* Header Inspector */}
              <div className="p-6 border-b border-brand-white/5 bg-brand-card/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-chartreuse">
                    Detalle del Pago
                  </span>
                  <h3 className="text-lg font-black text-brand-white mt-1">
                    {selectedPago.perfiles?.apellido?.toUpperCase()},{" "}
                    {selectedPago.perfiles?.nombre}
                  </h3>
                </div>
                <div className="flex items-center gap-3 bg-brand-black/40 border border-brand-white/5 px-4 py-2 rounded-2xl w-fit">
                  <span className="text-xs text-gray-500 font-bold uppercase">
                    Monto Acreditar:
                  </span>
                  <span className="text-lg font-black text-brand-chartreuse">
                    ${selectedPago.monto.toLocaleString("es-AR")}
                  </span>
                </div>
              </div>

              {/* Contenido Inspector */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col lg:flex-row gap-6 min-h-0">
                {/* Datos del Turno y Emisor */}
                <div className="flex-1 space-y-6">
                  {/* Bloque Turno */}
                  <div className="bg-brand-black/30 border border-brand-white/5 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-brand-chartreuse flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Información de Reserva
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">
                          Cancha
                        </span>
                        <span className="text-xs text-brand-white font-bold mt-1 block">
                          {selectedPago.reservas?.turnos?.canchas?.nombre ||
                            "Cancha"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">
                          Fecha del Turno
                        </span>
                        <span className="text-xs text-brand-white font-bold mt-1 block">
                          {selectedPago.reservas?.fecha_reserva
                            ? formatFecha(selectedPago.reservas.fecha_reserva)
                            : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">
                          Horario
                        </span>
                        <span className="text-xs text-brand-white font-bold mt-1 block">
                          {formatHora(
                            selectedPago.reservas?.turnos?.hora_inicio,
                          )}{" "}
                          -{" "}
                          {formatHora(selectedPago.reservas?.turnos?.hora_fin)}{" "}
                          hs
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">
                          Precio Turno
                        </span>
                        <span className="text-xs text-brand-white font-bold mt-1 block">
                          $
                          {Number(
                            selectedPago.reservas?.turnos?.precio || 0,
                          ).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque Emisor */}
                  <div className="bg-brand-black/30 border border-brand-white/5 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Datos del Emisor
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-gray-300">
                        <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                        <span className="truncate">
                          {selectedPago.perfiles?.email}
                        </span>
                      </div>
                      {selectedPago.perfiles?.telefono && (
                        <div className="flex items-center gap-3 text-xs text-gray-300">
                          <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                          <span>{selectedPago.perfiles.telefono}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Referencia Operacion */}
                  <div className="bg-brand-black/30 border border-brand-white/5 rounded-2xl p-5 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 block">
                      Referencia o Nro de Operación
                    </span>
                    <p className="text-sm font-black text-brand-white mt-1">
                      {selectedPago.referencia_pago ||
                        "Sin código de referencia provisto"}
                    </p>
                  </div>
                </div>

                {/* Visor Comprobante */}
                <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Comprobante Adjunto
                  </span>

                  {selectedPago.comprobante_url ? (
                    <div className="flex-1 border border-brand-white/5 bg-brand-black/40 rounded-2xl overflow-hidden flex flex-col justify-center items-center min-h-[260px] relative group">
                      {selectedPago.comprobante_url
                        .toLowerCase()
                        .endsWith(".pdf") ? (
                        <div className="p-6 text-center space-y-3">
                          <FileText className="w-16 h-16 text-brand-chartreuse mx-auto opacity-80" />
                          <div>
                            <p className="text-xs font-bold text-brand-white">
                              Documento PDF
                            </p>
                            <p className="text-[10px] text-gray-500 mt-1">
                              El comprobante se subió en formato PDF
                            </p>
                          </div>
                          <a
                            href={selectedPago.comprobante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-black text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/25 px-4 py-2 rounded-xl hover:bg-brand-chartreuse/20 transition-all cursor-pointer"
                          >
                            Ver PDF Completo{" "}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedPago.comprobante_url}
                            alt="Comprobante de pago"
                            className="w-full h-full object-contain max-h-[350px] lg:max-h-full cursor-zoom-in"
                            onClick={() =>
                              setModalImagenUrl(selectedPago.comprobante_url)
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setModalImagenUrl(selectedPago.comprobante_url)
                            }
                            className="absolute bottom-4 right-4 bg-brand-black/80 hover:bg-brand-black text-white px-3 py-1.5 rounded-xl border border-brand-white/10 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer opacity-0 group-hover:opacity-100 shadow-md"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ampliar Imagen
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 border border-dashed border-brand-white/10 rounded-2xl flex flex-col justify-center items-center p-6 text-center text-gray-500 italic text-xs min-h-[260px]">
                      No se ha adjuntado ningún comprobante digital para esta
                      validación.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Inspector: Acciones */}
              <div className="p-6 border-t border-brand-white/5 bg-brand-card/80 backdrop-blur flex gap-3 shrink-0">
                <button
                  type="button"
                  disabled={processingId !== null}
                  onClick={() => handleValidar(selectedPago.id, false)}
                  className="flex-1 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Rechazar Pago
                </button>
                <button
                  type="button"
                  disabled={processingId !== null}
                  onClick={() => handleValidar(selectedPago.id, true)}
                  className="flex-1 py-3.5 rounded-2xl bg-brand-chartreuse text-brand-black text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 disabled:opacity-50 shadow-md shadow-brand-chartreuse/15"
                >
                  {processingId === selectedPago.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Validar y Acreditar Pago
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Visor de Imagen Ampliado */}
      {modalImagenUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setModalImagenUrl(null)}
        >
          <div className="relative max-w-4xl w-full h-full max-h-[80vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalImagenUrl}
              alt="Comprobante Ampliado"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setModalImagenUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-brand-chartreuse text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-brand-white/5 px-3 py-1.5 rounded-xl border border-brand-white/5"
            >
              Cerrar <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

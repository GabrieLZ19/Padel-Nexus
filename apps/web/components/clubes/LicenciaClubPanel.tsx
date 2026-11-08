"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, Receipt } from "lucide-react";
import {
  LicenciasClubService,
  type LicenciaClub,
  type LicenciaClubPago,
} from "@/utils/services/licenciasClub";
import { fechaLatina } from "@/utils/fechaArgentina";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { sileo } from "sileo";

interface LicenciaClubPanelProps {
  clubId: string;
  puedeEditar?: boolean;
}

const ESTADO_CLASE: Record<string, string> = {
  Activa: "text-green-400",
  Pendiente: "text-yellow-400",
  Vencida: "text-red-400",
  Suspendida: "text-orange-300",
};

export default function LicenciaClubPanel({
  clubId,
  puedeEditar = true,
}: LicenciaClubPanelProps) {
  const [licencia, setLicencia] = useState<LicenciaClub | null>(null);
  const [pagos, setPagos] = useState<LicenciaClubPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaVenc, setFechaVenc] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await LicenciasClubService.obtener(clubId);
      setLicencia(data);
      if (data?.fecha_vencimiento) {
        setFechaVenc(data.fecha_vencimiento.split("T")[0]);
      }
      if (data?.id) {
        const lista = await LicenciasClubService.listarPagos(clubId, data.id);
        setPagos(lista);
      } else {
        setPagos([]);
      }
    } catch {
      sileo.error({
        title: "Licencia del club",
        description: "No se pudo cargar la licencia federativa.",
      });
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const actualizarEstado = async (estado: string) => {
    if (!licencia) return;
    try {
      const data = await LicenciasClubService.actualizarEstado(
        clubId,
        licencia.id,
        estado,
        fechaVenc || undefined,
      );
      setLicencia(data);
      sileo.success({
        title: "Licencia actualizada",
        description: `Estado: ${data.estado}`,
      });
      await cargar();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      sileo.error({
        title: "Error",
        description: e?.response?.data?.error || "No se pudo actualizar.",
      });
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-brand-black/40 p-4 animate-pulse h-28" />
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-brand-black/40 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-brand-chartreuse" />
        <h3 className="text-sm font-bold text-white">Licencia federativa del club</h3>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Alta, vigencia y pagos del carnet institucional. El estado operativo del
        listado (Activo / Pendiente / Inactivo) es independiente de esta licencia.
      </p>

      {!licencia ? (
        <p className="text-xs text-gray-400">
          Sin licencia registrada. Guardá el club o contactá a soporte para
          generar el alta.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                N.º licencia
              </p>
              <p className="font-mono font-bold text-white">
                {licencia.nro_licencia}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Estado
              </p>
              <p
                className={`font-bold ${ESTADO_CLASE[licencia.estado] || "text-gray-300"}`}
              >
                {licencia.estado}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Vencimiento
              </p>
              {puedeEditar ? (
                <input
                  type="date"
                  value={fechaVenc}
                  onChange={(e) => setFechaVenc(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-white/10 bg-brand-input px-2 py-1 text-xs text-white"
                />
              ) : (
                <p className="text-white">
                  {fechaLatina(licencia.fecha_vencimiento) || "—"}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Emisión
              </p>
              <p className="text-white">
                {fechaLatina(licencia.fecha_emision) || "—"}
              </p>
            </div>
          </div>

          {puedeEditar ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setConfirm({
                    title: "¿Activar licencia?",
                    description: "El club quedará con carnet vigente.",
                    onConfirm: () => void actualizarEstado("Activa"),
                  })
                }
                className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-400 cursor-pointer"
              >
                Activar
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirm({
                    title: "¿Suspender licencia?",
                    description:
                      "El carnet queda suspendido hasta nueva habilitación.",
                    onConfirm: () => void actualizarEstado("Suspendida"),
                  })
                }
                className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-300 cursor-pointer"
              >
                Suspender
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfirm({
                    title: "¿Registrar renovación / pago?",
                    description:
                      "Se extiende la vigencia según la configuración de la asociación.",
                    onConfirm: async () => {
                      try {
                        await LicenciasClubService.registrarPago(
                          clubId,
                          licencia.id,
                        );
                        sileo.success({
                          title: "Pago registrado",
                          description: "Vigencia actualizada.",
                        });
                        await cargar();
                      } catch (err: unknown) {
                        const e = err as {
                          response?: { data?: { error?: string } };
                        };
                        sileo.error({
                          title: "Error",
                          description:
                            e?.response?.data?.error ||
                            "No se pudo registrar el pago.",
                        });
                      }
                    },
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-chartreuse/30 bg-brand-chartreuse/10 px-3 py-1.5 text-xs font-bold text-brand-chartreuse cursor-pointer"
              >
                <Receipt className="size-3.5" />
                Registrar pago
              </button>
              <button
                type="button"
                onClick={() => void cargar()}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-gray-400 cursor-pointer"
              >
                <RefreshCw className="size-3" />
              </button>
            </div>
          ) : null}

          {pagos.length > 0 ? (
            <div className="border-t border-white/5 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                Historial de pagos
              </p>
              <ul className="max-h-32 overflow-y-auto space-y-1 text-xs text-gray-300">
                {pagos.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between gap-2 border-b border-white/5 py-1"
                  >
                    <span>
                      {p.periodo} · ${Number(p.monto).toLocaleString("es-AR")}
                    </span>
                    <span className="text-gray-500">
                      {fechaLatina(p.pagado_en?.split("T")[0])}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <FeedbackModal
        isOpen={Boolean(confirm)}
        type="warning"
        title={confirm?.title || ""}
        description={confirm?.description || ""}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
      />
    </div>
  );
}

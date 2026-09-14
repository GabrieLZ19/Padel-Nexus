"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, ChevronDown, ChevronUp, Receipt } from "lucide-react";
import {
  LicenciasService,
  type LicenciaPago,
} from "@/utils/services/licencias";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { sileo } from "sileo";

interface LicenciaPagosHistorialProps {
  licenciaId: string;
  /** Si true, muestra el botón para registrar pago manual. */
  puedeRegistrar?: boolean;
}

/**
 * Historial de pagos mensuales/anuales de una licencia.
 * Se usa en el listado de jugadores (admin provincial / fed).
 */
export function LicenciaPagosHistorial({
  licenciaId,
  puedeRegistrar = true,
}: LicenciaPagosHistorialProps) {
  const [open, setOpen] = useState(false);
  const [pagos, setPagos] = useState<LicenciaPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await LicenciasService.listarPagos(licenciaId);
      setPagos(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      sileo.error({
        title: "Pagos",
        description:
          e?.response?.data?.error || "No se pudo cargar el historial.",
      });
    } finally {
      setLoading(false);
    }
  }, [licenciaId]);

  useEffect(() => {
    if (open) void cargar();
  }, [open, cargar]);

  const registrar = async () => {
    setSaving(true);
    try {
      await LicenciasService.registrarPago(licenciaId, { metodo: "manual" });
      sileo.success({
        title: "Pago registrado",
        description: "La vigencia de la licencia se actualizó.",
      });
      setConfirmOpen(false);
      await cargar();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      sileo.error({
        title: "Error",
        description: e?.response?.data?.error || "No se pudo registrar el pago.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 text-left cursor-pointer"
      >
        <Receipt className="size-3.5 text-brand-chartreuse shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex-1">
          Historial de pagos
          {pagos.length > 0 && open ? ` · ${pagos.length}` : ""}
        </span>
        {open ? (
          <ChevronUp className="size-3.5 text-gray-500" />
        ) : (
          <ChevronDown className="size-3.5 text-gray-500" />
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-xs text-gray-500">Cargando pagos…</p>
          ) : pagos.length === 0 ? (
            <p className="text-xs text-gray-500">
              Todavía no hay pagos registrados.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
              {pagos.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-black/30 border border-white/5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-brand-white tabular-nums">
                      {p.periodo}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {p.metodo || "manual"}
                      {p.pagado_en
                        ? ` · ${new Date(p.pagado_en).toLocaleDateString("es-AR")}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-black text-brand-chartreuse tabular-nums">
                    ${Number(p.monto || 0).toLocaleString("es-AR")}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {puedeRegistrar && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-chartreuse/30 text-brand-chartreuse hover:bg-brand-chartreuse/10 cursor-pointer"
            >
              <CalendarPlus className="size-3.5" />
              Registrar pago del mes
            </button>
          )}
        </div>
      )}

      <FeedbackModal
        isOpen={confirmOpen}
        onClose={() => (saving ? undefined : setConfirmOpen(false))}
        onConfirm={() => void registrar()}
        type="warning"
        title="Registrar pago de licencia"
        description="Se registrará el pago del período actual y se extenderá la vigencia según la configuración de la asociación."
        confirmText={saving ? "Registrando…" : "Registrar"}
        cancelText="Cancelar"
        isLoading={saving}
      />
    </div>
  );
}

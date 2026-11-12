"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Loader2, Wallet, Building2 } from "lucide-react";
import { sileo } from "sileo";
import { LicenciasService } from "@/utils/services/licencias";
import type { Licencia } from "@/utils/types";
import {
  formatMontoLicenciaArs,
  licenciaFrecuenciaPago,
  licenciaMontoPendiente,
} from "@/utils/licenciaPago";

interface LicenciaPagoPanelProps {
  licencia: Licencia;
  onPagoActualizado?: () => void;
}

export default function LicenciaPagoPanel({
  licencia,
  onPagoActualizado,
}: LicenciaPagoPanelProps) {
  const [procesando, setProcesando] = useState(false);
  const [instrucciones, setInstrucciones] = useState<string | null>(null);
  const [alias, setAlias] = useState<string | null>(null);
  const [cbu, setCbu] = useState<string | null>(null);
  const [referencia, setReferencia] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<"alias" | "cbu" | "ref" | null>(null);
  const [preferenciaCache, setPreferenciaCache] = useState<Awaited<
    ReturnType<typeof LicenciasService.crearPreferenciaMp>
  > | null>(null);
  const [transferenciaDisponible, setTransferenciaDisponible] = useState<
    boolean | null
  >(null);

  const monto =
    licenciaMontoPendiente(licencia) > 0
      ? licenciaMontoPendiente(licencia)
      : undefined;
  const etiqueta =
    licenciaFrecuenciaPago(licencia) === "mensual" ? "mensual" : "anual";

  useEffect(() => {
    let mounted = true;
    void LicenciasService.getDatosTransferencia(licencia.id)
      .then((datos) => {
        if (mounted) {
          setTransferenciaDisponible(datos.transferencia_disponible);
        }
      })
      .catch(() => {
        if (mounted) setTransferenciaDisponible(false);
      });
    return () => {
      mounted = false;
    };
  }, [licencia.id]);

  const copiar = async (valor: string, tipo: "alias" | "cbu" | "ref") => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(tipo);
      window.setTimeout(() => setCopiado(null), 2000);
    } catch {
      sileo.error({
        title: "No se pudo copiar",
        description: "Copiá manualmente el dato mostrado.",
      });
    }
  };

  const aplicarDatosPago = (pref: Awaited<
    ReturnType<typeof LicenciasService.crearPreferenciaMp>
  >) => {
    setInstrucciones(pref.instrucciones || null);
    setAlias(pref.alias ?? null);
    setCbu(pref.cbu ?? null);
    setReferencia(pref.referencia || licencia.nro_licencia);
  };

  const cargarPreferencia = async (usarCache = true) => {
    if (usarCache && preferenciaCache) return preferenciaCache;
    setProcesando(true);
    try {
      const pref = await LicenciasService.crearPreferenciaMp(licencia.id);
      setPreferenciaCache(pref);
      return pref;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "No se pudo iniciar el pago.";
      sileo.error({ title: "Error", description: msg });
      return null;
    } finally {
      setProcesando(false);
    }
  };

  const pagarConMercadoPago = async () => {
    const pref = await cargarPreferencia();
    if (!pref) return;

    if (pref.mockConfirmed) {
      sileo.success({
        title: "Pago registrado",
        description:
          "Tu pago quedó acreditado. La federación revisará el alta.",
      });
      onPagoActualizado?.();
      return;
    }

    const checkout = pref.initPoint || pref.sandboxInitPoint;
    if (checkout) {
      window.location.href = checkout;
      return;
    }

    if (pref.pagoAlternativo || pref.instrucciones) {
      aplicarDatosPago(pref);
      return;
    }

    sileo.warning({
      title: "Pago no disponible",
      description: "Contactá a tu federación para abonar la licencia.",
    });
  };

  const mostrarTransferencia = async () => {
    setProcesando(true);
    try {
      const datos = await LicenciasService.getDatosTransferencia(licencia.id);
      if (!datos.transferencia_disponible) {
        sileo.warning({
          title: "Transferencia no disponible",
          description:
            "Tu federación aún no cargó alias ni CBU. Usá Mercado Pago o contactalos.",
        });
        setTransferenciaDisponible(false);
        return;
      }
      setInstrucciones(datos.instrucciones || null);
      setAlias(datos.alias ?? null);
      setCbu(datos.cbu ?? null);
      setReferencia(datos.referencia || licencia.nro_licencia);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "No se pudieron cargar los datos.";
      sileo.error({ title: "Error", description: msg });
    } finally {
      setProcesando(false);
    }
  };

  const montoLabel = monto != null ? formatMontoLicenciaArs(monto) : "—";
  const licenciaAprobada =
    (licencia.estado || "").toLowerCase() === "activa";

  return (
    <div className="w-full max-w-sm space-y-3 text-left">
      <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 px-3 py-2.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/90">
          Pago {etiqueta} pendiente
        </p>
        <p className="text-lg font-black text-brand-white mt-1 tabular-nums">
          {montoLabel}
        </p>
        <p className="text-[11px] text-gray-400 mt-1 leading-snug">
          {licenciaAprobada
            ? "Tu licencia ya está aprobada; completá este pago para regularizar el alta."
            : "Completá el pago para que la federación pueda revisar tu solicitud."}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void pagarConMercadoPago()}
        disabled={procesando}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-chartreuse text-brand-black text-xs font-extrabold uppercase tracking-wide hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
      >
        {procesando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Wallet className="size-4" />
        )}
        {procesando ? "Procesando..." : "Pagar con Mercado Pago"}
      </button>

      {transferenciaDisponible !== false ? (
        <button
          type="button"
          onClick={() => void mostrarTransferencia()}
          disabled={procesando || transferenciaDisponible === null}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-white/15 bg-brand-white/5 text-brand-white text-xs font-bold hover:bg-brand-white/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Building2 className="size-3.5 text-brand-chartreuse" />
          {transferenciaDisponible === null
            ? "Cargando datos..."
            : "Ver datos para transferencia"}
        </button>
      ) : (
        <p className="text-[11px] text-gray-500 text-center px-2 leading-snug">
          El pago por transferencia no está habilitado: la federación debe cargar
          alias o CBU en Jugadores → Configuración.
        </p>
      )}

      {(instrucciones || alias || cbu || referencia) && (
        <div className="rounded-xl border border-brand-white/10 bg-brand-black/50 p-3 space-y-2.5 text-xs text-gray-300">
          {instrucciones ? (
            <p className="leading-relaxed">{instrucciones}</p>
          ) : null}
          {referencia ? (
            <div className="flex items-center justify-between gap-2">
              <span>
                Referencia:{" "}
                <strong className="text-white font-mono">{referencia}</strong>
              </span>
              <button
                type="button"
                onClick={() => void copiar(referencia, "ref")}
                className="p-1.5 rounded-lg border border-white/10 hover:border-brand-chartreuse/40 cursor-pointer"
                aria-label="Copiar referencia"
              >
                {copiado === "ref" ? (
                  <Check className="size-3.5 text-brand-chartreuse" />
                ) : (
                  <Copy className="size-3.5 text-gray-400" />
                )}
              </button>
            </div>
          ) : null}
          {alias ? (
            <div className="flex items-center justify-between gap-2">
              <span>
                Alias: <strong className="text-white">{alias}</strong>
              </span>
              <button
                type="button"
                onClick={() => void copiar(alias, "alias")}
                className="p-1.5 rounded-lg border border-white/10 hover:border-brand-chartreuse/40 cursor-pointer"
                aria-label="Copiar alias"
              >
                {copiado === "alias" ? (
                  <Check className="size-3.5 text-brand-chartreuse" />
                ) : (
                  <Copy className="size-3.5 text-gray-400" />
                )}
              </button>
            </div>
          ) : null}
          {cbu ? (
            <div className="flex items-center justify-between gap-2">
              <span className="truncate">
                CBU: <strong className="text-white font-mono">{cbu}</strong>
              </span>
              <button
                type="button"
                onClick={() => void copiar(cbu, "cbu")}
                className="p-1.5 rounded-lg border border-white/10 hover:border-brand-chartreuse/40 cursor-pointer shrink-0"
                aria-label="Copiar CBU"
              >
                {copiado === "cbu" ? (
                  <Check className="size-3.5 text-brand-chartreuse" />
                ) : (
                  <Copy className="size-3.5 text-gray-400" />
                )}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

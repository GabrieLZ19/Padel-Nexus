"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { sileo } from "sileo";
import { PlatformFeesService } from "@/utils/services/platformFees";
import FeedbackModal from "@/components/ui/FeedbackModal";

type ResumenOrg = Awaited<
  ReturnType<typeof PlatformFeesService.resumenLiquidaciones>
>[number];

export default function LiquidacionesPage() {
  const [items, setItems] = useState<ResumenOrg[]>([]);
  const [historial, setHistorial] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    item: ResumenOrg | null;
    loading: boolean;
  }>({ isOpen: false, item: null, loading: false });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [resumen, hist] = await Promise.all([
        PlatformFeesService.resumenLiquidaciones(),
        PlatformFeesService.historialLiquidaciones(),
      ]);
      setItems(resumen);
      setHistorial(hist);
    } catch {
      sileo.error({
        title: "Error",
        description: "No se pudo cargar liquidaciones.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirConfirmar = (item: ResumenOrg) => {
    setConfirm({ isOpen: true, item, loading: false });
  };

  const transferir = async () => {
    const item = confirm.item;
    if (!item) return;
  const hoy = new Date();
    const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-01`;
    setConfirm((p) => ({ ...p, loading: true }));
    try {
      await PlatformFeesService.marcarLiquidacion({
        org: { org_tipo: item.org_tipo, org_id: item.org_id },
        periodo_mes: periodo,
        monto_bruto: item.bruto_online,
        monto_fees: item.fees_descontar + item.saldo_pendiente,
        monto_neto: item.monto_neto,
        cbu: item.cbu || undefined,
        alias_cuenta: item.alias || undefined,
        notas: `Liquidación neto transferido · comisión MP estimada ${item.comision_mp_porcentaje}%`,
      });
      sileo.success({
        title: "Liquidación registrada",
        description: `Marcamos la transferencia para ${item.nombre}.`,
      });
      setConfirm({ isOpen: false, item: null, loading: false });
      await cargar();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo registrar.";
      sileo.error({ title: "Error", description: msg });
      setConfirm((p) => ({ ...p, loading: false }));
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Liquidaciones</h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            Neto a transferir = cobrado online − fee Padel Nexus (modo absorber) −
            comisión Mercado Pago (estimada) − saldo pendiente de fees
            off-platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Cargando organizadores...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-10 text-sm text-gray-500">
          No hay liquidaciones pendientes en este momento.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.org_tipo}:${item.org_id}`}
              className="rounded-2xl border border-white/10 bg-brand-card p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-white text-lg">{item.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.org_tipo} · {item.movimientos} movimientos
                  </p>
                  {(item.cbu || item.alias) && (
                    <p className="text-xs text-gray-400 mt-2 font-mono">
                      {item.alias ? `Alias ${item.alias}` : null}
                      {item.alias && item.cbu ? " · " : null}
                      {item.cbu ? `CBU ${item.cbu}` : null}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs flex-1 lg:max-w-2xl">
                  <div>
                    <p className="text-gray-500">Bruto online</p>
                    <p className="font-bold text-white tabular-nums">
                      ${item.bruto_online.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fees PN</p>
                    <p className="font-bold text-amber-300 tabular-nums">
                      ${(item.fees_descontar + item.saldo_pendiente).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Comisión MP (~)</p>
                    <p className="font-bold text-gray-300 tabular-nums">
                      ${item.comision_mp.toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Neto a transferir</p>
                    <p className="font-black text-brand-chartreuse text-lg tabular-nums">
                      ${item.monto_neto.toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={item.monto_neto <= 0}
                  onClick={() => abrirConfirmar(item)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-chartreuse px-4 py-3 text-sm font-bold text-brand-black disabled:opacity-40"
                >
                  <Banknote className="size-4" />
                  Marcar transferida
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {historial.length > 0 ? (
        <div className="mt-12">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-400" />
            Últimas liquidaciones
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-gray-400">
            {historial.slice(0, 10).map((h) => (
              <li
                key={String(h.id)}
                className="rounded-xl border border-white/5 bg-brand-card/50 px-4 py-3 flex justify-between gap-4"
              >
                <span>
                  {String(h.org_tipo)} ·{" "}
                  {new Date(String(h.creado_en)).toLocaleDateString("es-AR")}
                </span>
                <span className="tabular-nums text-white font-semibold">
                  ${Number(h.monto_neto).toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <FeedbackModal
        isOpen={confirm.isOpen}
        onClose={() =>
          setConfirm({ isOpen: false, item: null, loading: false })
        }
        type="warning"
        title="Confirmar liquidación"
        description={
          confirm.item
            ? `¿Registrar transferencia de $${confirm.item.monto_neto.toLocaleString("es-AR")} a ${confirm.item.nombre}? Los movimientos pendientes de liquidación de esta entidad pasarán a estado liquidado.`
            : ""
        }
        confirmText={confirm.loading ? "Procesando..." : "Confirmar"}
        cancelText="Cancelar"
        onConfirm={() => void transferir()}
      />
    </div>
  );
}
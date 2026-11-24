"use client";

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { sileo } from "sileo";
import { PlatformFeesService } from "@/utils/services/platformFees";

function exportarCsv(nombre: string, filas: string[][]) {
  const contenido = filas.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinanzasPlataformaPage() {
  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState(mesActual);
  const [reporte, setReporte] = useState<{
    resumen: {
      operaciones: number;
      ingresos_brutos: number;
      fees_plataforma: number;
    };
    movimientos: Array<Record<string, unknown>>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await PlatformFeesService.reporteMensual(anio, mes);
      setReporte(data);
    } catch {
      sileo.error({ title: "Error", description: "No se pudo cargar el reporte." });
      setReporte(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anio, mes]);

  const descargarExcel = () => {
    if (!reporte) return;
    const header = [
      "fecha",
      "canal",
      "organizacion",
      "org_tipo",
      "entidad",
      "bruto",
      "comision_mp",
      "fee_plataforma",
      "neto",
      "estado",
      "origen_pago",
    ];
    const rows = reporte.movimientos.map((m) => [
      String(m.creado_en || ""),
      String(m.canal || ""),
      String(m.org_nombre ?? m.org_id ?? ""),
      String(m.org_tipo || ""),
      String(m.entidad_nombre ?? `${m.entidad_tipo}:${m.entidad_id}`),
      String(m.monto_bruto ?? ""),
      String(m.comision_mp ?? ""),
      String(m.monto_fee ?? ""),
      String(m.monto_neto ?? ""),
      String(m.estado || ""),
      String(m.origen_pago || ""),
    ]);
    exportarCsv(`padel-nexus-fees-${anio}-${mes}.csv`, [header, ...rows]);
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl">
      <h1 className="text-2xl font-black text-white">Finanzas · Fees y reportes</h1>
      <p className="text-sm text-gray-500 mt-1">
        Para transferir neto a organizadores usá{" "}
        <a href="/dashboard/liquidaciones" className="text-brand-chartreuse underline">
          Liquidaciones
        </a>
        .
      </p>
      <p className="text-sm text-gray-400 mt-2">
        Ingresos brutos, fees de plataforma y detalle exportable (compatible con Excel).
      </p>

      <div className="mt-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="rounded-xl bg-brand-card border border-white/10 px-3 py-2 text-sm text-white w-28"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Mes</label>
          <input
            type="number"
            min={1}
            max={12}
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-xl bg-brand-card border border-white/10 px-3 py-2 text-sm text-white w-20"
          />
        </div>
        <button
          type="button"
          onClick={() => void descargarExcel()}
          disabled={!reporte?.movimientos?.length}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Download className="size-4" />
          Exportar CSV
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-gray-500">Cargando reporte...</p>
      ) : reporte ? (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-brand-card p-4">
            <p className="text-xs text-gray-500">Operaciones</p>
            <p className="text-2xl font-black text-white tabular-nums">
              {reporte.resumen.operaciones}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-brand-card p-4">
            <p className="text-xs text-gray-500">Ingresos brutos</p>
            <p className="text-2xl font-black text-white tabular-nums">
              ${Number(reporte.resumen.ingresos_brutos).toLocaleString("es-AR")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-brand-card p-4">
            <p className="text-xs text-gray-500">Fees plataforma</p>
            <p className="text-2xl font-black text-brand-chartreuse tabular-nums">
              ${Number(reporte.resumen.fees_plataforma).toLocaleString("es-AR")}
            </p>
          </div>
        </div>
      ) : null}

      {reporte?.movimientos?.length ? (
        <div className="mt-8 rounded-2xl border border-white/10 overflow-hidden">
          <div className="bg-brand-card px-4 py-3 flex items-center gap-2 text-sm font-semibold text-gray-300">
            <FileSpreadsheet className="size-4 text-brand-chartreuse" />
            Últimos movimientos del período
          </div>
          <div className="max-h-96 overflow-y-auto text-xs">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-brand-black text-gray-500">
                <tr>
                  <th className="p-2">Canal</th>
                  <th className="p-2">Fee</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Origen</th>
                </tr>
              </thead>
              <tbody>
                {reporte.movimientos.slice(0, 100).map((m) => (
                  <tr key={String(m.id)} className="border-t border-white/5">
                    <td className="p-2 text-gray-300">{String(m.canal)}</td>
                    <td className="p-2 tabular-nums text-white">
                      ${Number(m.monto_fee).toLocaleString("es-AR")}
                    </td>
                    <td className="p-2 text-gray-400">{String(m.estado)}</td>
                    <td className="p-2 text-gray-400">{String(m.origen_pago)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Landmark, Wallet, Info } from "lucide-react";
import { sileo } from "sileo";
import type { DatosCobroTienda, EntidadRef, Vendedor } from "@/utils/services/marketplace";
import { MarketplaceService } from "@/utils/services/marketplace";

interface Props {
  tienda: Vendedor;
  entidadRef: EntidadRef;
  onSaved: (tienda: Vendedor) => void;
}

export default function MarketplaceCobrosTab({
  tienda,
  entidadRef,
  onSaved,
}: Props) {
  const [form, setForm] = useState<DatosCobroTienda>({
    cbu: tienda.cbu || "",
    alias: tienda.alias || "",
    titular_cuenta: tienda.titular_cuenta || "",
    banco: tienda.banco || "",
    mp_collector_id: tienda.mp_collector_id || "",
    mp_notas: tienda.mp_notas || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      cbu: tienda.cbu || "",
      alias: tienda.alias || "",
      titular_cuenta: tienda.titular_cuenta || "",
      banco: tienda.banco || "",
      mp_collector_id: tienda.mp_collector_id || "",
      mp_notas: tienda.mp_notas || "",
    });
  }, [tienda]);

  const setField = (key: keyof DatosCobroTienda, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGuardar = async () => {
    const cbuDigits = String(form.cbu || "").replace(/\D/g, "");
    if (cbuDigits && cbuDigits.length !== 22) {
      sileo.error({
        title: "CBU inválido",
        description: "El CBU debe tener exactamente 22 dígitos.",
      });
      return;
    }

    setSaving(true);
    try {
      const actualizada = await MarketplaceService.crmActualizarTienda(entidadRef, {
        cbu: cbuDigits || null,
        alias: form.alias?.trim() || null,
        titular_cuenta: form.titular_cuenta?.trim() || null,
        banco: form.banco?.trim() || null,
        mp_collector_id: form.mp_collector_id?.trim() || null,
        mp_notas: form.mp_notas?.trim() || null,
      });
      onSaved(actualizada);
      sileo.success({
        title: "Datos de cobro guardados",
        description: "Ahí se acreditarán las ventas de la tienda.",
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      sileo.error({
        title: "Error",
        description: message || "No se pudieron guardar los datos de cobro.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-8 bg-brand-card border border-brand-white/5 rounded-3xl p-6 md:p-8 space-y-6">
        <div className="flex items-start gap-3">
          <div className="size-11 rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center shrink-0">
            <Landmark className="size-5 text-brand-chartreuse" />
          </div>
          <div>
            <h2 className="text-xl font-black">Destino de acreditación</h2>
            <p className="text-sm text-gray-400 mt-1">
              Configurá dónde se acreditan los cobros de las ventas de{" "}
              <span className="text-white font-semibold">{tienda.nombre_tienda}</span>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase">
              Titular de la cuenta
            </label>
            <input
              type="text"
              value={form.titular_cuenta || ""}
              onChange={(e) => setField("titular_cuenta", e.target.value)}
              placeholder="Nombre del titular"
              className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Banco</label>
            <input
              type="text"
              value={form.banco || ""}
              onChange={(e) => setField("banco", e.target.value)}
              placeholder="Ej: Banco Nación"
              className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Alias</label>
            <input
              type="text"
              value={form.alias || ""}
              onChange={(e) => setField("alias", e.target.value)}
              placeholder="mi.tienda.mp"
              className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase">CBU</label>
            <input
              type="text"
              inputMode="numeric"
              value={form.cbu || ""}
              onChange={(e) => setField("cbu", e.target.value.replace(/\D/g, "").slice(0, 22))}
              placeholder="22 dígitos"
              className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm font-mono focus:border-brand-chartreuse focus:outline-none"
            />
          </div>
        </div>

        <div className="border-t border-brand-white/5 pt-6 space-y-4">
          <div className="flex items-center gap-2 text-brand-chartreuse">
            <Wallet className="size-4" />
            <h3 className="text-sm font-black uppercase tracking-wider">Mercado Pago</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">
                Collector / cuenta MP
              </label>
              <input
                type="text"
                value={form.mp_collector_id || ""}
                onChange={(e) => setField("mp_collector_id", e.target.value)}
                placeholder="ID o email de cobro"
                className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Notas</label>
              <input
                type="text"
                value={form.mp_notas || ""}
                onChange={(e) => setField("mp_notas", e.target.value)}
                placeholder="Observaciones internas"
                className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleGuardar()}
          disabled={saving}
          className="bg-brand-chartreuse text-brand-black font-bold px-6 py-3 rounded-xl cursor-pointer hover:opacity-95 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar datos de cobro"}
        </button>
      </div>

      <div className="xl:col-span-4 space-y-4">
        <div className="rounded-3xl border border-brand-white/10 bg-brand-black/40 p-6 space-y-3">
          <div className="flex items-center gap-2 text-brand-chartreuse">
            <Info className="size-4" />
            <p className="text-xs font-black uppercase tracking-wider">Cómo se acredita</p>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Las ventas del marketplace se liquidan a la cuenta bancaria o collector de Mercado Pago
            configurado acá. Completá al menos CBU o alias para transferencias, y el collector si
            operás con Mercado Pago.
          </p>
          <ul className="text-xs text-gray-500 space-y-1.5 list-disc pl-4">
            <li>El split nativo de MP queda para una fase posterior.</li>
            <li>Estos datos son visibles solo para admins de la entidad.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

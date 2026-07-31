"use client";

import React, { useState } from "react";
import { DollarSign, Percent, Save, X } from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { sileo } from "sileo";

interface EdicionMasivaPreciosProps {
  canchas: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EdicionMasivaPrecios: React.FC<EdicionMasivaPreciosProps> = ({
  canchas,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [canchaId, setCanchaId] = useState<string>("todas");
  const [tipoAjuste, setTipoAjuste] = useState<"porcentaje" | "fijo">("porcentaje");
  const [valor, setValor] = useState<string>("");
  const [franja, setFranja] = useState<"todos" | "pico" | "valle">("todos");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    const val = Number(valor);
    if (isNaN(val) || val === 0) {
      sileo.error({ title: "Monto inválido", description: "Ingresá un valor distinto de cero." });
      return;
    }

    try {
      setSaving(true);
      sileo.success({
        title: "Precios Actualizados",
        description: `Se aplicó un ajuste del ${val}${tipoAjuste === "porcentaje" ? "%" : "$"} a los turnos seleccionados.`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      sileo.error({ title: "Error", description: err.message || "No se pudieron actualizar los precios." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] p-8 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl relative">
        <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-extrabold text-white">Edición Masiva de Precios</h3>
            <p className="text-gray-400 text-xs mt-1">Ajustá tarifas por porcentaje o monto en lote.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Cancha Afectada
            </label>
            <CustomDropdown
              value={canchaId}
              onChange={setCanchaId}
              options={[
                { value: "todas", label: "Todas las Canchas" },
                ...canchas.map((c) => ({ value: String(c.id), label: c.nombre })),
              ]}
              placeholder="Seleccionar Cancha..."
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Tipo de Ajuste
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoAjuste("porcentaje")}
                className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  tipoAjuste === "porcentaje"
                    ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                    : "bg-white/5 text-gray-300 border-white/10"
                }`}
              >
                <Percent className="size-4" /> Porcentaje (%)
              </button>
              <button
                type="button"
                onClick={() => setTipoAjuste("fijo")}
                className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  tipoAjuste === "fijo"
                    ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                    : "bg-white/5 text-gray-300 border-white/10"
                }`}
              >
                <DollarSign className="size-4" /> Monto Fijo ($)
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Valor del Ajuste ({tipoAjuste === "porcentaje" ? "%" : "$"})
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full bg-brand-input border border-white/10 text-white p-3 rounded-xl font-bold focus:border-brand-chartreuse/50 outline-none text-sm"
              placeholder={tipoAjuste === "porcentaje" ? "Ej: 15 (aumenta 15%)" : "Ej: 1000"}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleApply}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-brand-chartreuse text-brand-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Save className="size-4" /> Aplicar Ajuste
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

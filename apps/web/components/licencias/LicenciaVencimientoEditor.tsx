"use client";

import { useRef, useEffect } from "react";
import { Calendar, Check, X, Pencil } from "lucide-react";

interface LicenciaVencimientoEditorProps {
  fechaVencimiento?: string | null;
  editable: boolean;
  isEditing: boolean;
  editingValue: string;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}

function formatVencimiento(dateString?: string | null) {
  if (!dateString) return "Sin fecha";
  const parts = dateString.split("T")[0].split("-");
  if (parts.length < 3) return dateString;
  const [year, month, day] = parts;
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

export function LicenciaVencimientoEditor({
  fechaVencimiento,
  editable,
  isEditing,
  editingValue,
  onStartEdit,
  onChange,
  onSave,
  onCancel,
  saving = false,
}: LicenciaVencimientoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      try {
        inputRef.current.showPicker?.();
      } catch {
        /* noop */
      }
    }
  }, [isEditing]);

  if (!editable) {
    return (
      <div className="text-sm text-gray-500 italic">
        Se define al aprobar
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-chartreuse">
          Nuevo vencimiento
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="date"
            value={editingValue}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-black/60 text-white border-2 border-brand-chartreuse/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-chartreuse"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !editingValue}
            className="p-2.5 bg-brand-chartreuse text-brand-black rounded-xl hover:bg-[#b3e600] disabled:opacity-50 transition-colors"
            title="Guardar fecha"
          >
            <Check className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-2.5 bg-white/5 text-gray-400 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
            title="Cancelar"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onStartEdit}
      className="group/vence w-full text-left rounded-xl border-2 border-dashed border-white/10 hover:border-brand-chartreuse/50 bg-black/20 hover:bg-brand-chartreuse/5 px-3 py-2.5 transition-all focus:outline-none focus:border-brand-chartreuse focus:ring-2 focus:ring-brand-chartreuse/20"
      title="Clic para cambiar el vencimiento de este jugador"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-lg bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center shrink-0 group-hover/vence:bg-brand-chartreuse/20 transition-colors">
            <Calendar className="size-4 text-brand-chartreuse" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover/vence:text-brand-chartreuse/80 transition-colors">
              Vence
            </p>
            <p className="text-sm font-bold text-white truncate">
              {formatVencimiento(fechaVencimiento)}
            </p>
          </div>
        </div>
        <Pencil className="size-3.5 text-gray-600 group-hover/vence:text-brand-chartreuse shrink-0 transition-colors" />
      </div>
      <p className="text-[10px] text-gray-600 group-hover/vence:text-brand-chartreuse/70 mt-1.5 pl-10 transition-colors">
        Clic para editar vencimiento individual
      </p>
    </button>
  );
}

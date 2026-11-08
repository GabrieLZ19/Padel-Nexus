"use client";

import type { ComunicacionesEtiqueta } from "@/utils/types/comunicaciones.types";

const ETIQUETAS: { id: ComunicacionesEtiqueta; label: string }[] = [
  { id: "marketing", label: "Marketing" },
  { id: "institucional", label: "Institucional" },
];

interface ContactoEtiquetasEditorProps {
  valor: ComunicacionesEtiqueta[];
  disabled?: boolean;
  onChange: (etiquetas: ComunicacionesEtiqueta[]) => void;
}

export function ContactoEtiquetasEditor({
  valor,
  disabled,
  onChange,
}: ContactoEtiquetasEditorProps) {
  const toggle = (etiqueta: ComunicacionesEtiqueta) => {
    if (disabled) return;
    onChange(
      valor.includes(etiqueta)
        ? valor.filter((e) => e !== etiqueta)
        : [...valor, etiqueta],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ETIQUETAS.map((item) => {
        const activa = valor.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(item.id)}
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer disabled:opacity-50 ${
              activa
                ? "border-brand-chartreuse/40 bg-brand-chartreuse/15 text-brand-chartreuse"
                : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function ContactoEtiquetasBadges({
  etiquetas,
}: {
  etiquetas?: ComunicacionesEtiqueta[] | null;
}) {
  if (!etiquetas?.length) {
    return <span className="text-xs text-gray-500">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {etiquetas.map((e) => (
        <span
          key={e}
          className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-300"
        >
          {e === "marketing" ? "Marketing" : "Institucional"}
        </span>
      ))}
    </div>
  );
}

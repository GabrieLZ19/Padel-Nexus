"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export interface ItemMenuPuntos {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

export function MenuPuntos({
  etiqueta,
  items,
}: {
  etiqueta: string;
  items: ItemMenuPuntos[];
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-haspopup="menu"
        title={etiqueta}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setAbierto((valor) => !valor);
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {abierto ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-44 overflow-hidden rounded-xl border border-white/10 bg-[#161616] py-1 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setAbierto(false);
                item.onSelect();
              }}
              className={`block w-full px-3 py-2 text-left text-xs font-bold cursor-pointer hover:bg-white/5 ${
                item.danger ? "text-red-400" : "text-gray-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

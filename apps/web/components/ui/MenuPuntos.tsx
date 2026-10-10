"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [ancla, setAncla] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const ubicar = () => {
    const boton = ref.current?.querySelector("button");
    if (!boton) return;
    const rect = boton.getBoundingClientRect();
    const alto = 12 + items.length * 36;
    const abreArriba = window.innerHeight - rect.bottom < alto + 8;
    setAncla(
      abreArriba
        ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 4, right: window.innerWidth - rect.right },
    );
  };

  useEffect(() => {
    if (!abierto) return;
    ubicar();
    const cerrar = (event: MouseEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return;
      setAbierto(false);
    };
    const mover = () => ubicar();
    document.addEventListener("mousedown", cerrar);
    window.addEventListener("resize", mover);
    window.addEventListener("scroll", mover, true);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      window.removeEventListener("resize", mover);
      window.removeEventListener("scroll", mover, true);
    };
  }, [abierto, items.length]);

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
      {abierto && ancla
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "fixed",
                top: ancla.top,
                bottom: ancla.bottom,
                right: ancla.right,
                zIndex: 80,
              }}
              className="min-w-44 overflow-hidden rounded-xl border border-white/10 bg-[#161616] py-1 shadow-xl"
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

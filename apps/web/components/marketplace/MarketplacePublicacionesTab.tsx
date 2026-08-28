"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LayoutGrid,
  Package,
  Pencil,
  Plus,
  Eye,
  EyeOff,
  Tag,
} from "lucide-react";
import DescuentoBadge from "./DescuentoBadge";
import { calcPorcentajeDescuento } from "@/utils/marketplaceDescuento";
import type { Producto } from "@/utils/services/marketplace";

type FiltroPub = "todas" | "activas" | "inactivas" | "descuento";

interface Props {
  productos: Producto[];
  onCrear: () => void;
  onEditar: (p: Producto) => void;
  onDesactivar: (id: string) => void;
  onActivar: (id: string) => void;
  onQuitarDescuento: (p: Producto) => void;
}

function calcDescuento(p: Producto): number | null {
  return calcPorcentajeDescuento(p.precio, p.precio_anterior);
}

export default function MarketplacePublicacionesTab({
  productos,
  onCrear,
  onEditar,
  onDesactivar,
  onActivar,
  onQuitarDescuento,
}: Props) {
  const [filtro, setFiltro] = useState<FiltroPub>("todas");

  const filtradas = productos.filter((p) => {
    if (filtro === "activas") return p.activo;
    if (filtro === "inactivas") return !p.activo;
    if (filtro === "descuento") return calcDescuento(p) !== null;
    return true;
  });

  const filtros: { id: FiltroPub; label: string; count: number }[] = [
    { id: "todas", label: "Todas", count: productos.length },
    { id: "activas", label: "Activas", count: productos.filter((p) => p.activo).length },
    { id: "inactivas", label: "Inactivas", count: productos.filter((p) => !p.activo).length },
    {
      id: "descuento",
      label: "Con descuento",
      count: productos.filter((p) => calcDescuento(p) !== null).length,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-lg">Tus publicaciones</h3>
          <p className="text-xs text-gray-500">
            Gestioná precios, descuentos y visibilidad de cada producto o servicio.
          </p>
        </div>
        <button
          type="button"
          onClick={onCrear}
          className="inline-flex items-center justify-center gap-2 bg-brand-chartreuse text-brand-black font-black px-5 py-3 rounded-xl text-sm cursor-pointer"
        >
          <Plus className="size-4" />
          Crear publicación
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
              filtro === f.id
                ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                : "bg-brand-black/30 text-gray-400 border-brand-white/10 hover:text-brand-white"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-brand-white/10 py-16 text-center bg-brand-card/20">
          <LayoutGrid className="size-12 text-gray-600 mx-auto mb-4" />
          <p className="font-bold mb-1">
            {productos.length === 0 ? "Sin publicaciones aún" : "Nada en este filtro"}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {productos.length === 0
              ? "Subí fotos y publicá tu primer producto o servicio."
              : "Probá otro filtro o creá una nueva publicación."}
          </p>
          {productos.length === 0 && (
            <button
              type="button"
              onClick={onCrear}
              className="text-brand-chartreuse font-bold text-sm cursor-pointer"
            >
              + Crear publicación
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtradas.map((p) => {
            const desc = calcDescuento(p);
            return (
              <article
                key={p.id}
                className={`rounded-2xl border bg-brand-card overflow-hidden transition-all ${
                  p.activo
                    ? "border-brand-white/5 hover:border-brand-chartreuse/30"
                    : "border-brand-white/5 opacity-70"
                }`}
              >
                <div className="relative aspect-[4/3] bg-brand-black/50">
                  {(p.thumbnail_url || p.imagenes?.[0]) ? (
                    <Image
                      src={p.thumbnail_url || p.imagenes[0]}
                      alt={p.nombre}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="size-10 text-gray-700" />
                    </div>
                  )}
                  <span
                    className={`absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      p.activo
                        ? "bg-brand-chartreuse text-brand-black"
                        : "bg-gray-600 text-white"
                    }`}
                  >
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                  {desc !== null && (
                    <DescuentoBadge
                      precio={p.precio}
                      precioAnterior={p.precio_anterior}
                      variant="overlay"
                      className="top-2 right-2 left-auto"
                    />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">
                    {p.categoria?.nombre || "Sin categoría"}
                  </p>
                  <p className="font-bold truncate">{p.nombre}</p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="text-brand-chartreuse font-black">
                      ${p.precio.toLocaleString("es-AR")}
                    </p>
                    {p.precio_anterior && p.precio_anterior > p.precio && (
                      <p className="text-xs text-gray-500 line-through">
                        ${p.precio_anterior.toLocaleString("es-AR")}
                      </p>
                    )}
                  </div>
                  {p.tipo === "producto" && (
                    <p className="text-[11px] text-gray-500">Stock: {p.stock}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => onEditar(p)}
                      className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-brand-white/5 text-xs font-bold cursor-pointer hover:bg-brand-white/10"
                    >
                      <Pencil className="size-3" /> Editar
                    </button>
                    {p.activo ? (
                      <button
                        type="button"
                        onClick={() => onDesactivar(p.id)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-brand-white/5 text-xs font-bold text-amber-400 cursor-pointer hover:bg-amber-500/10"
                        title="Desactivar"
                      >
                        <EyeOff className="size-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onActivar(p.id)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-brand-chartreuse/10 text-xs font-bold text-brand-chartreuse cursor-pointer hover:bg-brand-chartreuse/20"
                        title="Activar"
                      >
                        <Eye className="size-3" />
                      </button>
                    )}
                    {desc !== null && (
                      <button
                        type="button"
                        onClick={() => onQuitarDescuento(p)}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-brand-white/5 text-xs font-bold text-gray-400 cursor-pointer hover:text-brand-white"
                        title="Quitar descuento"
                      >
                        <Tag className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
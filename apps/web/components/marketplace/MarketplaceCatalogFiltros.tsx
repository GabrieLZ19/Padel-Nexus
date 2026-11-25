"use client";

import { Search, X } from "lucide-react";
import type { Categoria } from "@/utils/services/marketplace";

export type MarketplaceCatalogFiltrosProps = {
  categorias: Categoria[];
  marcas: string[];
  busqueda: string;
  onBusquedaChange: (value: string) => void;
  categoriaSeleccionada: string;
  onCategoriaChange: (id: string) => void;
  verTodasCategorias: boolean;
  onToggleVerTodasCategorias: () => void;
  tipoSeleccionado: "producto" | "servicio" | "";
  onTipoChange: (tipo: "producto" | "servicio" | "") => void;
  marcaSeleccionada: string;
  onMarcaChange: (marca: string) => void;
  onCloseMobile?: () => void;
};

export default function MarketplaceCatalogFiltros({
  categorias,
  marcas,
  busqueda,
  onBusquedaChange,
  categoriaSeleccionada,
  onCategoriaChange,
  verTodasCategorias,
  onToggleVerTodasCategorias,
  tipoSeleccionado,
  onTipoChange,
  marcaSeleccionada,
  onMarcaChange,
  onCloseMobile,
}: MarketplaceCatalogFiltrosProps) {
  return (
  <div className="space-y-8">
      {onCloseMobile && (
        <div className="flex items-center justify-between lg:hidden">
          <h2 className="text-base font-black text-brand-white">Filtros</h2>
          <button
            type="button"
            onClick={onCloseMobile}
            className="size-10 rounded-xl border border-brand-white/10 flex items-center justify-center text-gray-400 hover:text-brand-white cursor-pointer"
            aria-label="Cerrar filtros"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar palas, ropa..."
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          className="w-full bg-brand-input border border-brand-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-all duration-200"
        />
        <Search className="absolute left-4 top-3.5 size-4.5 text-gray-400" />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">
          Categorías
        </h3>
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onCategoriaChange("")}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
              categoriaSeleccionada === ""
                ? "bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20"
                : "text-gray-400 hover:text-brand-white hover:bg-brand-white/5 border border-transparent"
            }`}
          >
            <span>Todas</span>
            <span className="text-xs bg-brand-white/5 px-2 py-0.5 rounded-full text-gray-400 font-bold border border-brand-white/5">
              {categorias.reduce(
                (sum, c) => sum + (c.total_productos || 0),
                0,
              )}
            </span>
          </button>

          {(verTodasCategorias ? categorias : categorias.slice(0, 4)).map(
            (cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoriaChange(cat.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                  categoriaSeleccionada === cat.id
                    ? "bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20"
                    : "text-gray-400 hover:text-brand-white hover:bg-brand-white/5 border border-transparent"
                }`}
              >
                <span>{cat.nombre}</span>
                <span className="text-xs bg-brand-white/5 px-2 py-0.5 rounded-full text-gray-400 font-bold border border-brand-white/5">
                  {cat.total_productos || 0}
                </span>
              </button>
            ),
          )}

          {categorias.length > 4 && (
            <button
              type="button"
              onClick={onToggleVerTodasCategorias}
              className="w-full text-left text-xs font-bold text-brand-chartreuse hover:underline pt-2 pl-4 cursor-pointer"
            >
              {verTodasCategorias ? "Ver menos -" : "Ver más +"}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">
          Tipo
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onTipoChange("")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer text-center ${
              tipoSeleccionado === ""
                ? "bg-brand-chartreuse/10 text-brand-chartreuse border-brand-chartreuse/30"
                : "bg-brand-input/40 border-brand-white/5 text-gray-400 hover:text-brand-white"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => onTipoChange("producto")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer text-center ${
              tipoSeleccionado === "producto"
                ? "bg-brand-chartreuse/10 text-brand-chartreuse border-brand-chartreuse/30"
                : "bg-brand-input/40 border-brand-white/5 text-gray-400 hover:text-brand-white"
            }`}
          >
            Productos
          </button>
          <button
            type="button"
            onClick={() => onTipoChange("servicio")}
            className={`col-span-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer text-center ${
              tipoSeleccionado === "servicio"
                ? "bg-brand-chartreuse/10 text-brand-chartreuse border-brand-chartreuse/30"
                : "bg-brand-input/40 border-brand-white/5 text-gray-400 hover:text-brand-white"
            }`}
          >
            Clases y Servicios
          </button>
        </div>
      </div>

      {marcas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">
            Marcas
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-400 hover:text-brand-white">
              <input
                type="radio"
                name={onCloseMobile ? "marca-mobile" : "marca-desktop"}
                checked={marcaSeleccionada === ""}
                onChange={() => onMarcaChange("")}
                className="accent-brand-chartreuse size-4"
              />
              <span>Todas las marcas</span>
            </label>
            {marcas.map((m) => (
              <label
                key={m}
                className="flex items-center gap-3 cursor-pointer text-sm text-gray-400 hover:text-brand-white"
              >
                <input
                  type="radio"
                  name={onCloseMobile ? "marca-mobile" : "marca-desktop"}
                  checked={marcaSeleccionada === m}
                  onChange={() => onMarcaChange(m)}
                  className="accent-brand-chartreuse size-4"
                />
                <span>{m}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="w-full py-3 rounded-xl bg-brand-chartreuse text-brand-black font-bold text-sm cursor-pointer lg:hidden"
        >
          Ver resultados
        </button>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect, useRef, useId } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  provincia?: string | null;
}

export interface ComunicacionesMultiSelectProps {
  label?: string;
  allOptionLabel: string;
  allOptionValue?: string;
  options: readonly MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
}

export default function ComunicacionesMultiSelect({
  label,
  allOptionLabel,
  allOptionValue = "todas",
  options,
  selectedValues,
  onChange,
  placeholder = "Seleccionar...",
  helperText,
  disabled = false,
}: ComunicacionesMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const isAllSelected =
    selectedValues.length === 0 ||
    selectedValues.includes(allOptionValue);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase().trim()),
  );

  const handleToggleAll = () => {
    onChange([allOptionValue]);
  };

  const handleToggleItem = (val: string) => {
    if (isAllSelected) {
      // Si estaba en "todas", pasar a solo este elemento
      onChange([val]);
      return;
    }

    if (selectedValues.includes(val)) {
      const next = selectedValues.filter((v) => v !== val);
      if (next.length === 0) {
        onChange([allOptionValue]);
      } else {
        onChange(next);
      }
    } else {
      const next = [...selectedValues, val];
      // Si seleccionó manualmente todas las opciones disponibles, volver a "todas"
      if (options.length > 0 && next.length === options.length) {
        onChange([allOptionValue]);
      } else {
        onChange(next);
      }
    }
  };

  const handleRemoveChip = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleItem(val);
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {(label || !isAllSelected) && (
        <div className="flex items-center justify-between">
          {label ? (
            <label className="text-xs font-bold text-gray-500 uppercase">
              {label}
            </label>
          ) : (
            <span />
          )}
          {!isAllSelected && (
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-[11px] font-semibold text-brand-chartreuse hover:underline cursor-pointer"
            >
              Seleccionar {allOptionValue === "todos" ? "todos" : "todas"}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[46px] bg-[#151515] border rounded-xl px-3.5 py-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
          disabled
            ? "opacity-50 cursor-not-allowed border-white/5"
            : isOpen
              ? "border-brand-chartreuse/50 ring-1 ring-brand-chartreuse/20"
              : "border-white/10 hover:border-white/20"
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {isAllSelected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {allOptionLabel}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-chartreuse/10 text-brand-chartreuse font-bold">
                {allOptionValue === "todos" ? "Todos" : "Todas"}
              </span>
            </div>
          ) : (
            selectedValues.map((val) => {
              const opt = options.find((o) => o.value === val);
              const labelText = opt?.label || val;
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 text-white text-xs font-semibold"
                >
                  <span className="truncate max-w-[150px]">{labelText}</span>
                  <span
                    onClick={(e) => handleRemoveChip(val, e)}
                    className="hover:text-rose-400 p-0.5 rounded cursor-pointer"
                    title="Quitar"
                  >
                    <X className="size-3" />
                  </span>
                </span>
              );
            })
          )}
        </div>

        <ChevronDown
          className={`size-4 text-gray-400 shrink-0 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {helperText && (
        <p className="text-[11px] text-gray-500">{helperText}</p>
      )}

      {/* Menú desplegable con checkboxes */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#1a1a1a] border border-white/10 rounded-2xl p-2.5 shadow-2xl space-y-2">
          {/* Buscador interno */}
          {options.length > 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/10 text-xs text-white pl-8 pr-3 py-2 rounded-xl outline-none focus:border-brand-chartreuse/50"
              />
            </div>
          )}

          {/* Opción Todas / Todos */}
          <div
            onClick={handleToggleAll}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
              isAllSelected
                ? "bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20"
                : "text-gray-300 hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                readOnly
                checked={isAllSelected}
                className="size-4 rounded accent-brand-chartreuse cursor-pointer"
              />
              <span>{allOptionLabel}</span>
            </div>
            {isAllSelected && <Check className="size-3.5 text-brand-chartreuse" />}
          </div>

          <div className="border-b border-white/5" />

          {/* Listado de elementos individuales */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-3">
                No se encontraron resultados
              </p>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked =
                  !isAllSelected && selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggleItem(opt.value)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        readOnly
                        checked={isChecked}
                        className="size-4 rounded accent-brand-chartreuse cursor-pointer"
                      />
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.provincia && (
                      <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                        {opt.provincia}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useId, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

export interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: readonly DropdownOption[];
  placeholder: string;
  disabled?: boolean;
  haciaArriba?: boolean; // ➡️ Prop opcional declarado correctamente para evitar ts(2322)
  hasError?: boolean;
  className?: string;
  /** Alto de barra (paginación, filtros). El resto de los formularios sigue en el tamaño de campo. */
  compacto?: boolean;
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  haciaArriba = false, // Por defecto se despliega hacia abajo
  hasError = false,
  className = "",
  compacto = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const selected = options.findIndex((opt) => opt.value === value);
    setActiveIndex(selected >= 0 ? selected : 0);
  }, [isOpen, options, value]);

  const elegir = (index: number) => {
    const opcion = options[index];
    if (!opcion) return;
    onChange(opcion.value);
    setIsOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((indice) => {
        if (options.length === 0) return 0;
        return event.key === "ArrowDown"
          ? Math.min(options.length - 1, indice + 1)
          : Math.max(0, indice - 1);
      });
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.length - 1));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) setIsOpen(true);
      else elegir(activeIndex);
      return;
    }
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BOTÓN PRINCIPAL */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={
          selectedOption
            ? `${placeholder}: ${selectedOption.label}`
            : placeholder
        }
        onKeyDown={onKeyDown}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-brand-input rounded-xl border flex justify-between items-center gap-2 transition-all duration-200 select-none min-w-0 ${
          compacto ? "px-3 py-2 text-xs" : "px-4 py-3.5 text-sm md:text-base"
        } ${
          isOpen
            ? "border-brand-chartreuse ring-1 ring-brand-chartreuse shadow-[0_0_15px_rgba(203,254,1,0.05)]"
            : hasError
              ? "border-red-500/50 hover:border-red-500/80"
              : "border-brand-white/5 hover:border-brand-white/10"
        } ${
          disabled
            ? "opacity-40 cursor-not-allowed text-brand-ayuda"
            : "cursor-pointer text-brand-white"
        } ${className}`}
      >
        <span
          className={
            selectedOption
              ? "text-brand-white font-medium truncate pr-2 min-w-0"
              : "text-brand-ayuda truncate pr-2"
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-brand-chartreuse" : "text-brand-ayuda"
          }`}
        />
      </button>

      {/* MENÚ DESPLEGABLE CON POSICIONAMIENTO CONTROLADO */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: haciaArriba ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: haciaArriba ? -4 : 4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`absolute left-0 right-0 bg-brand-card border border-brand-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-60 overflow-hidden max-h-52 overflow-y-auto 
            [&::-webkit-scrollbar]:w-1.5 
            [&::-webkit-scrollbar-track]:bg-transparent 
            [&::-webkit-scrollbar-thumb]:bg-brand-white/10 
            [&::-webkit-scrollbar-thumb]:rounded-full 
            hover:[&::-webkit-scrollbar-thumb]:bg-brand-white/20 
            ${haciaArriba ? "bottom-full mb-2" : "top-full mt-2"}`}
            id={listId}
            role="listbox"
            aria-label={placeholder}
          >
            {options.length === 0 ? (
              <div className="p-4 text-sm text-brand-ayuda text-center">
                No hay opciones disponibles
              </div>
            ) : (
              <div className="py-1">
                {options.map((opt, index) => {
                  const isSelected = value === opt.value;
                  const activo = index === activeIndex;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => elegir(index)}
                      className={`w-full cursor-pointer transition-colors text-left flex items-center ${
                        compacto ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm md:text-base"
                      } ${
                        isSelected || activo
                          ? "text-brand-chartreuse font-bold bg-brand-chartreuse/5 border-l-2 border-brand-chartreuse"
                          : "text-gray-300 border-l-2 border-transparent hover:bg-brand-white/5 hover:text-brand-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

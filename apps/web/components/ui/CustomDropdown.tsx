"use client";

import { useState, useEffect, useRef } from "react";
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
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  haciaArriba = false, // Por defecto se despliega hacia abajo
  hasError = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BOTÓN PRINCIPAL */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-brand-input px-4 py-3.5 rounded-xl border text-sm md:text-base flex justify-between items-center transition-all duration-200 select-none ${
          isOpen
            ? "border-brand-chartreuse ring-1 ring-brand-chartreuse shadow-[0_0_15px_rgba(203,254,1,0.05)]"
            : hasError
            ? "border-red-500/50 hover:border-red-500/80"
            : "border-brand-white/5 hover:border-brand-white/10"
        } ${
          disabled
            ? "opacity-40 cursor-not-allowed text-gray-500"
            : "cursor-pointer text-brand-white"
        }`}
      >
        <span
          className={
            selectedOption ? "text-brand-white font-medium" : "text-gray-500"
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-brand-chartreuse" : "text-gray-500"
          }`}
        />
      </div>

      {/* MENÚ DESPLEGABLE CON POSICIONAMIENTO CONTROLADO */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: haciaArriba ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: haciaArriba ? -4 : 4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={`absolute left-0 right-0 bg-brand-card border border-brand-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-500 overflow-hidden max-h-52 overflow-y-auto 
            [&::-webkit-scrollbar]:w-1.5 
            [&::-webkit-scrollbar-track]:bg-transparent 
            [&::-webkit-scrollbar-thumb]:bg-brand-white/10 
            [&::-webkit-scrollbar-thumb]:rounded-full 
            hover:[&::-webkit-scrollbar-thumb]:bg-brand-white/20 
            ${haciaArriba ? "bottom-full mb-2" : "top-full mt-2"}`}
          >
            {options.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                No hay opciones disponibles
              </div>
            ) : (
              <div className="py-1">
                {options.map((opt) => {
                  const isSelected = value === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`px-4 py-3 text-sm md:text-base cursor-pointer transition-colors text-left flex items-center ${
                        isSelected
                          ? "text-brand-chartreuse font-bold bg-brand-chartreuse/5 border-l-2 border-brand-chartreuse"
                          : "text-gray-300 border-l-2 border-transparent hover:bg-brand-white/5 hover:text-brand-white"
                      }`}
                    >
                      {opt.label}
                    </div>
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

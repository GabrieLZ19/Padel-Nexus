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
  options: DropdownOption[];
  placeholder: string;
  disabled?: boolean;
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic afuera
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
      {/* Botón Principal (Emula al Input) */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-padel-1 p-4 rounded-xl border ${
          isOpen ? "border-padel-4" : "border-white/5"
        } text-sm flex justify-between items-center transition-colors ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span
          className={
            selectedOption ? "text-white font-medium" : "text-gray-500"
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`size-4 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-padel-4" : "text-gray-500"
          }`}
        />
      </div>

      {/* Menú Desplegable Animado */}
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-2 bg-padel-1 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-60 overflow-hidden max-h-60 overflow-y-auto"
          >
            {options.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">
                No hay opciones
              </div>
            ) : (
              options.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`p-4 text-sm cursor-pointer transition-colors hover:bg-white/5 ${
                    value === opt.value
                      ? "text-padel-4 font-bold bg-white/5 border-l-2 border-padel-4"
                      : "text-gray-300 border-l-2 border-transparent"
                  }`}
                >
                  {opt.label}
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

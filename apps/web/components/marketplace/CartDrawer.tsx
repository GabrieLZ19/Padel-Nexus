"use client";

import { useCartStore } from "@/store/useCartStore";
import { X, Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, eliminarItem, actualizarCantidad, totalPrecio, totalItems } =
    useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Evitar problemas de hidratación con Zustand persist
  useEffect(() => {
    setMounted(true);
  }, []);

  // Manejar el cierre con animación
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 280); // Un poco menor que la duración del CSS para evitar parpadeos
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 overflow-hidden flex justify-end">
      {/* Animaciones CSS Directas */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(4px); }
        }
        @keyframes fadeOut {
          from { opacity: 1; backdrop-filter: blur(4px); }
          to { opacity: 0; backdrop-filter: blur(0px); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        .animate-fade-in { animation: fadeIn 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-out { animation: fadeOut 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-in { animation: slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-out { animation: slideOutRight 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 cursor-pointer ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
        onClick={handleClose}
      />

      <div className={`relative z-10 w-full max-w-md h-full bg-brand-card border-l border-brand-white/10 text-brand-white shadow-2xl flex flex-col justify-between ${isClosing ? "animate-slide-out" : "animate-slide-in"}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-white/5 px-6 py-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-brand-chartreuse" />
            <h2 className="text-lg font-bold">Carrito de Compras</h2>
            <span className="rounded-full bg-brand-chartreuse/10 px-2.5 py-0.5 text-xs font-bold text-brand-chartreuse">
              {totalItems()}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-brand-white/5 hover:text-brand-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="rounded-full bg-brand-white/5 p-6 mb-4">
                <ShoppingBag className="size-10 text-gray-500" />
              </div>
              <h3 className="font-bold text-lg mb-1">Tu carrito está vacío</h3>
              <p className="text-sm text-gray-400 max-w-xs mb-6">
                Explora el marketplace para encontrar las mejores palas,
                accesorios o clases particulares.
              </p>
              <button
                onClick={onClose}
                className="bg-brand-chartreuse text-brand-black px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all duration-200 cursor-pointer"
              >
                Ver Catálogo
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productoId}
                className="flex gap-4 rounded-2xl bg-brand-input/40 border border-brand-white/5 p-4 hover:border-brand-white/10 transition-all duration-200"
              >
                {/* Image */}
                <div className="relative size-20 rounded-xl overflow-hidden bg-brand-black/40 border border-brand-white/5 shrink-0">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt={item.nombre}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-white/5">
                      <ShoppingBag className="size-6 text-gray-500" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-brand-chartreuse uppercase tracking-wider">
                          {item.tipo === "servicio"
                            ? "Servicio"
                            : item.vendedorNombre}
                        </span>
                        <h4 className="text-sm font-bold text-brand-white truncate mb-0.5">
                          {item.nombre}
                        </h4>
                      </div>
                      <button
                        onClick={() => eliminarItem(item.productoId)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Selector Cantidad (Solo para productos físicos) */}
                    {item.tipo === "producto" ? (
                      <div className="flex items-center gap-1.5 bg-brand-black/60 rounded-lg p-1 border border-brand-white/5">
                        <button
                          onClick={() =>
                            actualizarCantidad(
                              item.productoId,
                              item.cantidad - 1,
                            )
                          }
                          disabled={item.cantidad <= 1}
                          className="p-1 rounded text-gray-400 hover:text-brand-white hover:bg-brand-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() =>
                            actualizarCantidad(
                              item.productoId,
                              item.cantidad + 1,
                            )
                          }
                          disabled={item.cantidad >= item.stock}
                          className="p-1 rounded text-gray-400 hover:text-brand-white hover:bg-brand-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 bg-brand-white/5 px-2 py-1 rounded-md">
                        Servicio (1)
                      </span>
                    )}

                    <span className="text-sm font-bold text-brand-chartreuse">
                      ${(item.precio * item.cantidad).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-brand-white/5 bg-brand-card px-6 py-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="font-bold text-brand-white text-base">
                ${totalPrecio().toLocaleString("es-AR")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Envío</span>
              <span className="text-brand-chartreuse font-bold">Gratis</span>
            </div>
            <div className="h-px bg-brand-white/5 my-2"></div>
            <div className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-brand-chartreuse text-lg">
                ${totalPrecio().toLocaleString("es-AR")}
              </span>
            </div>

            <Link
              href="/marketplace/checkout"
              onClick={onClose}
              className="w-full flex items-center justify-center bg-brand-chartreuse text-brand-black font-bold text-sm py-3.5 px-6 rounded-xl hover:opacity-95 transition-all duration-200 shadow-md shadow-brand-chartreuse/10 cursor-pointer"
            >
              Continuar al Pago
            </Link>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

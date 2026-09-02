import { create } from "zustand";

import type { ItemCarrito, ProductoMarketplace } from "@/src/types/marketplace.types";

interface CartState {
  items: ItemCarrito[];
  agregar: (producto: ProductoMarketplace, cantidad?: number) => void;
  quitar: (productoId: string) => void;
  setCantidad: (productoId: string, cantidad: number) => void;
  vaciar: () => void;
  totalItems: () => number;
  totalPrecio: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  agregar: (producto, cantidad = 1) => {
    set((state) => {
      const existente = state.items.find((i) => i.productoId === producto.id);
      if (existente) {
        return {
          items: state.items.map((i) =>
            i.productoId === producto.id
              ? { ...i, cantidad: i.cantidad + cantidad, producto }
              : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { productoId: producto.id, cantidad, producto },
        ],
      };
    });
  },

  quitar: (productoId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productoId !== productoId),
    }));
  },

  setCantidad: (productoId, cantidad) => {
    if (cantidad <= 0) {
      get().quitar(productoId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.productoId === productoId ? { ...i, cantidad } : i,
      ),
    }));
  },

  vaciar: () => set({ items: [] }),

  totalItems: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),

  totalPrecio: () =>
    get().items.reduce(
      (acc, i) => acc + (i.producto?.precio ?? 0) * i.cantidad,
      0,
    ),
}));

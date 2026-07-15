import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  thumbnailUrl: string;
  vendedorNombre: string;
  stock: number;
  tipo: "producto" | "servicio";
}

interface CartStore {
  items: CartItem[];
  agregarItem: (item: Omit<CartItem, "cantidad">) => void;
  eliminarItem: (productoId: string) => void;
  actualizarCantidad: (productoId: string, cantidad: number) => void;
  vaciarCarrito: () => void;
  totalItems: () => number;
  totalPrecio: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      agregarItem: (newItem) => {
        const items = get().items;
        const index = items.findIndex((i) => i.productoId === newItem.productoId);

        if (index > -1) {
          // Si es un servicio, la cantidad máxima suele ser 1
          if (newItem.tipo === "servicio") return;

          const updatedItems = [...items];
          const nuevaCantidad = updatedItems[index].cantidad + 1;
          
          if (newItem.stock >= nuevaCantidad) {
            updatedItems[index].cantidad = nuevaCantidad;
            set({ items: updatedItems });
          }
        } else {
          set({ items: [...items, { ...newItem, cantidad: 1 }] });
        }
      },

      eliminarItem: (productoId) => {
        set({ items: get().items.filter((i) => i.productoId !== productoId) });
      },

      actualizarCantidad: (productoId, cantidad) => {
        const items = get().items;
        const index = items.findIndex((i) => i.productoId === productoId);

        if (index > -1 && cantidad > 0) {
          const item = items[index];
          if (item.tipo === "servicio") return; // Cantidad fija para servicios

          if (item.stock >= cantidad) {
            const updatedItems = [...items];
            updatedItems[index].cantidad = cantidad;
            set({ items: updatedItems });
          }
        }
      },

      vaciarCarrito: () => set({ items: [] }),

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.cantidad, 0);
      },

      totalPrecio: () => {
        return get().items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
      },
    }),
    {
      name: "padelnexus_carrito",
    }
  )
);

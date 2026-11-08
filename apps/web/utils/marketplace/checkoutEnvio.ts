import type { CartItem } from "@/store/useCartStore";

/** Hay al menos un producto físico; servicios solos no requieren envío ni dirección. */
export function carritoRequiereEnvio(
  items: Pick<CartItem, "tipo">[],
): boolean {
  return items.some((item) => item.tipo === "producto");
}

import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type {
  CategoriaMarketplace,
  PaginatedProductos,
  ProductoMarketplace,
} from "@/src/types/marketplace.types";

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    return data?.error || data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export const MarketplaceService = {
  async getCategorias(): Promise<CategoriaMarketplace[]> {
    try {
      const response = await api.get<CategoriaMarketplace[]>(
        "/marketplace/categorias",
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudieron cargar las categorías."),
      );
    }
  },

  async getProductos(params?: {
    busqueda?: string;
    categoria_id?: string;
    pagina?: number;
    por_pagina?: number;
  }): Promise<PaginatedProductos> {
    try {
      const response = await api.get<PaginatedProductos>(
        "/marketplace/productos",
        {
          params: {
            orden: "destacados",
            pagina: params?.pagina ?? 1,
            por_pagina: params?.por_pagina ?? 20,
            busqueda: params?.busqueda,
            categoria_id: params?.categoria_id,
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudieron cargar los productos."),
      );
    }
  },

  async getProducto(id: string): Promise<ProductoMarketplace> {
    try {
      const response = await api.get<ProductoMarketplace>(
        `/marketplace/productos/${id}`,
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo cargar el producto."));
    }
  },
};

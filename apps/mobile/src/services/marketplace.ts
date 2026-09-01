import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type {
  CategoriaMarketplace,
  PaginatedProductos,
  ProductoMarketplace,
} from "@/src/types/marketplace.types";

interface ApiProductosResponse {
  productos?: ProductoMarketplace[];
  data?: ProductoMarketplace[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

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

function parseProductosPage(payload: ApiProductosResponse): PaginatedProductos {
  const items = payload.productos ?? payload.data ?? [];
  return {
    data: Array.isArray(items) ? items : [],
    total: payload.total ?? items.length,
    pagina: payload.pagina ?? 1,
    por_pagina: payload.por_pagina ?? items.length,
    total_paginas: payload.total_paginas ?? 1,
  };
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
      const response = await api.get<ApiProductosResponse>(
        "/marketplace/productos",
        {
          params: {
            orden: "destacados",
            pagina: params?.pagina ?? 1,
            por_pagina: params?.por_pagina ?? 24,
            busqueda: params?.busqueda,
            categoria_id: params?.categoria_id,
          },
        },
      );
      return parseProductosPage(response.data);
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudieron cargar los productos."),
      );
    }
  },
};

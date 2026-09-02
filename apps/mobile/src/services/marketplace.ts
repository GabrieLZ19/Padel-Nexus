import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { PreferenciaMercadoPago } from "@/src/services/pagos";
import type {
  CategoriaMarketplace,
  DatosEnvioOrden,
  OrdenMarketplace,
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

  async getProducto(id: string): Promise<ProductoMarketplace> {
    try {
      const response = await api.get<ProductoMarketplace>(
        `/marketplace/productos/${id}`,
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se encontró el producto."));
    }
  },

  async crearOrden(payload: {
    items: { productoId: string; cantidad: number }[];
    datos_envio?: DatosEnvioOrden;
  }): Promise<OrdenMarketplace> {
    try {
      const response = await api.post<OrdenMarketplace>(
        "/marketplace/ordenes",
        payload,
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo crear la orden."));
    }
  },

  async pagarOrden(ordenId: string): Promise<PreferenciaMercadoPago> {
    try {
      const response = await api.post<PreferenciaMercadoPago>(
        `/marketplace/ordenes/${ordenId}/pagar`,
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo iniciar el pago de la orden."),
      );
    }
  },

  async confirmarRetornoMp(
    ordenId: string,
    paymentId: string,
  ): Promise<OrdenMarketplace> {
    try {
      const response = await api.post<OrdenMarketplace>(
        `/marketplace/ordenes/${ordenId}/confirmar-retorno`,
        { payment_id: paymentId },
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo confirmar el pago de la orden."),
      );
    }
  },

  async getMisOrdenes(pagina = 1): Promise<{
    ordenes: OrdenMarketplace[];
    total: number;
  }> {
    try {
      const response = await api.get<{
        ordenes: OrdenMarketplace[];
        total: number;
      }>("/marketplace/mis-ordenes", { params: { pagina } });
      return {
        ordenes: Array.isArray(response.data.ordenes)
          ? response.data.ordenes
          : [],
        total: response.data.total ?? 0,
      };
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudieron cargar tus órdenes."));
    }
  },

  async getOrden(id: string): Promise<OrdenMarketplace> {
    try {
      const response = await api.get<OrdenMarketplace>(
        `/marketplace/mis-ordenes/${id}`,
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se encontró la orden."));
    }
  },

  async toggleFavorito(
    productoId: string,
  ): Promise<{ favorito: boolean }> {
    try {
      const response = await api.post<{ favorito: boolean }>(
        `/marketplace/favoritos/${productoId}`,
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo actualizar el favorito."),
      );
    }
  },

  async esFavorito(productoId: string): Promise<boolean> {
    try {
      const response = await api.get<{ es_favorito: boolean }>(
        `/marketplace/favoritos/${productoId}/check`,
      );
      return Boolean(response.data.es_favorito);
    } catch {
      return false;
    }
  },

  async getFavoritos(): Promise<ProductoMarketplace[]> {
    try {
      const response = await api.get<ProductoMarketplace[]>(
        "/marketplace/favoritos",
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudieron cargar tus favoritos."),
      );
    }
  },
};

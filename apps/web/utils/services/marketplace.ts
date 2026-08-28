import { api } from "../api";

export type EntidadMarketplaceTipo = "club" | "asociacion" | "federacion";

export type AudienciaPromocion =
  | "afiliados"
  | "plataforma"
  | "compradores_previos";

export interface Vendedor {
  id: string;
  usuario_id?: string | null;
  creado_por?: string | null;
  entidad_tipo?: EntidadMarketplaceTipo | null;
  entidad_id?: string | null;
  entidad_nombre?: string | null;
  nombre_tienda: string;
  tipo: EntidadMarketplaceTipo;
  descripcion?: string;
  logo_url?: string | null;
  provincia?: string;
  balance: number;
  estado: "activo" | "suspendido";
  valoracion_promedio: number;
  total_ventas: number;
}

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  icono?: string;
  tipo: "producto" | "servicio";
  orden: number;
  total_productos?: number;
}

export interface Producto {
  id: string;
  vendedor_id: string;
  categoria_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_anterior?: number;
  stock: number;
  marca?: string;
  imagenes: string[];
  thumbnail_url?: string;
  tipo: "producto" | "servicio";
  modalidad_servicio?: "presencial" | "online" | "ambas";
  ubicacion_servicio?: string;
  destacado: boolean;
  activo: boolean;
  created_at: string;
  promedio_valoraciones?: number;
  total_valoraciones?: number;
  vendedor: {
    id: string;
    usuario_id?: string;
    nombre_tienda: string;
    tipo: string;
    entidad_tipo?: EntidadMarketplaceTipo;
    entidad_id?: string;
    descripcion?: string;
    logo_url?: string;
    provincia?: string;
    valoracion_promedio: number;
    total_ventas?: number;
  };
  categoria: {
    id: string;
    nombre: string;
    slug: string;
  };
}

export interface EntidadesMarketplace {
  clubes: { id: string; nombre: string; provincia?: string }[];
  asociaciones: { id: string; nombre: string; sigla?: string; provincia?: string }[];
  federaciones: { id: string; nombre: string; sigla?: string }[];
}

export interface EntidadRef {
  entidad_tipo: EntidadMarketplaceTipo;
  entidad_id: string;
}

export interface TiendaPublica {
  id: string;
  nombre_tienda: string;
  tipo: EntidadMarketplaceTipo;
  descripcion?: string;
  logo_url?: string;
  provincia?: string;
  valoracion_promedio: number;
  total_ventas: number;
  entidad_tipo?: EntidadMarketplaceTipo | null;
  entidad_id?: string | null;
  entidad_nombre?: string | null;
  productos_activos: number;
  categorias: { id: string; nombre: string; slug: string; total: number }[];
  created_at?: string;
}

function entidadParams(ref: EntidadRef) {
  return { entidad_tipo: ref.entidad_tipo, entidad_id: ref.entidad_id };
}

export interface Valoracion {
  id: string;
  producto_id: string;
  comprador_id: string;
  orden_id: string;
  puntuacion: number;
  comentario?: string;
  created_at: string;
  comprador: {
    nombre: string;
    apellido: string;
    avatar_url?: string;
  };
}

export interface PaginatedResponse<T> {
  productos?: T[];
  ventas?: T[];
  ordenes?: T[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

export const MarketplaceService = {
  async getCategorias(): Promise<Categoria[]> {
    const response = await api.get<Categoria[]>("/marketplace/categorias");
    return response.data;
  },

  async getProductos(params: {
    categoria_id?: string;
    vendedor_id?: string;
    busqueda?: string;
    precio_min?: number;
    precio_max?: number;
    marca?: string;
    tipo?: "producto" | "servicio";
    orden?: string;
    pagina?: number;
    por_pagina?: number;
  }): Promise<PaginatedResponse<Producto>> {
    const response = await api.get<PaginatedResponse<Producto>>("/marketplace/productos", { params });
    return response.data;
  },

  async getProducto(id: string): Promise<Producto & { total_valoraciones: number; promedio_valoraciones: number }> {
    const response = await api.get<any>(`/marketplace/productos/${id}`);
    return response.data;
  },

  async getTiendaPublica(id: string): Promise<TiendaPublica> {
    const response = await api.get<TiendaPublica>(`/marketplace/tiendas/${id}`);
    return response.data;
  },

  async getMarcas(categoriaId?: string): Promise<string[]> {
    const response = await api.get<string[]>("/marketplace/marcas", {
      params: { categoria_id: categoriaId },
    });
    return response.data;
  },

  async getValoraciones(productoId: string, pagina = 1): Promise<{ valoraciones: Valoracion[]; total: number }> {
    const response = await api.get<any>(`/marketplace/productos/${productoId}/valoraciones`, {
      params: { pagina },
    });
    return response.data;
  },

  async crearOrden(ordenData: {
    items: { productoId: string; cantidad: number }[];
    datos_envio?: { nombre?: string; direccion?: string; telefono?: string; notas?: string };
  }): Promise<any> {
    const response = await api.post("/marketplace/ordenes", ordenData);
    return response.data;
  },

  async pagarOrden(ordenId: string): Promise<{ preferenceId: string; initPoint: string }> {
    const response = await api.post(`/marketplace/ordenes/${ordenId}/pagar`);
    return response.data;
  },

  async getMisOrdenes(pagina = 1): Promise<{ ordenes: any[]; total: number }> {
    const response = await api.get<any>("/marketplace/mis-ordenes", { params: { pagina } });
    return response.data;
  },

  async getOrden(id: string): Promise<any> {
    const response = await api.get<any>(`/marketplace/mis-ordenes/${id}`);
    return response.data;
  },

  async crearValoracion(valoracion: {
    producto_id: string;
    orden_id: string;
    puntuacion: number;
    comentario?: string;
  }): Promise<any> {
    const response = await api.post("/marketplace/valoraciones", valoracion);
    return response.data;
  },

  async toggleFavorito(productoId: string): Promise<{ favorito: boolean }> {
    const response = await api.post<{ favorito: boolean }>(`/marketplace/favoritos/${productoId}`);
    return response.data;
  },

  async getFavoritos(): Promise<any[]> {
    const response = await api.get<any[]>("/marketplace/favoritos");
    return response.data;
  },

  async checkFavorito(productoId: string): Promise<{ es_favorito: boolean }> {
    const response = await api.get<{ es_favorito: boolean }>(`/marketplace/favoritos/${productoId}/check`);
    return response.data;
  },

  // CRM — marketplace por entidad
  async crmGetEntidades(): Promise<EntidadesMarketplace> {
    const response = await api.get<EntidadesMarketplace>("/marketplace/crm/entidades");
    return response.data;
  },

  async crmGetTienda(ref: EntidadRef): Promise<Vendedor | null> {
    try {
      const response = await api.get<Vendedor>("/marketplace/crm/tienda", {
        params: entidadParams(ref),
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async crmRegistrarTienda(
    ref: EntidadRef,
    datos: {
      nombre_tienda?: string;
      descripcion?: string;
      provincia?: string;
      logo_base64?: string;
    },
  ): Promise<Vendedor> {
    const response = await api.post<Vendedor>("/marketplace/crm/tienda", {
      ...entidadParams(ref),
      ...datos,
    });
    return response.data;
  },

  async crmActualizarTienda(
    ref: EntidadRef,
    datos: Partial<Vendedor> & { logo_base64?: string; logo_url?: string | null },
  ): Promise<Vendedor> {
    const response = await api.put<Vendedor>("/marketplace/crm/tienda", {
      ...entidadParams(ref),
      ...datos,
    });
    return response.data;
  },

  async crmGetProductos(ref: EntidadRef, pagina = 1): Promise<{ productos: Producto[]; total: number }> {
    const response = await api.get<any>("/marketplace/crm/productos", {
      params: { ...entidadParams(ref), pagina },
    });
    return response.data;
  },

  async crmCrearProducto(
    ref: EntidadRef,
    producto: {
      categoria_id: string;
      nombre: string;
      descripcion?: string;
      precio: number;
      precio_anterior?: number | null;
      stock: number;
      marca?: string;
      tipo: "producto" | "servicio";
      modalidad_servicio?: string;
      ubicacion_servicio?: string;
      imagenes_base64?: string[];
    },
  ): Promise<Producto> {
    const response = await api.post<Producto>("/marketplace/crm/productos", {
      ...entidadParams(ref),
      ...producto,
    });
    return response.data;
  },

  async crmEditarProducto(
    ref: EntidadRef,
    id: string,
    producto: {
      categoria_id?: string;
      nombre?: string;
      descripcion?: string;
      precio?: number;
      precio_anterior?: number | null;
      stock?: number;
      marca?: string;
      tipo?: "producto" | "servicio";
      modalidad_servicio?: string;
      ubicacion_servicio?: string;
      imagenes_existentes?: string[];
      imagenes_nuevas_base64?: string[];
    },
  ): Promise<Producto> {
    const response = await api.put<Producto>(`/marketplace/crm/productos/${id}`, {
      ...entidadParams(ref),
      ...producto,
    });
    return response.data;
  },

  async crmDesactivarProducto(ref: EntidadRef, id: string): Promise<Producto> {
    const response = await api.delete<Producto>(`/marketplace/crm/productos/${id}`, {
      params: entidadParams(ref),
    });
    return response.data;
  },

  async crmActivarProducto(ref: EntidadRef, id: string): Promise<Producto> {
    const response = await api.patch<Producto>(`/marketplace/crm/productos/${id}/activar`, null, {
      params: entidadParams(ref),
    });
    return response.data;
  },

  async crmGetVentas(ref: EntidadRef, pagina = 1): Promise<{ ventas: any[]; total: number }> {
    const response = await api.get<any>("/marketplace/crm/ventas", {
      params: { ...entidadParams(ref), pagina },
    });
    return response.data;
  },

  async crmGetEstadisticas(ref: EntidadRef): Promise<{
    balance: number;
    total_ventas: number;
    valoracion_promedio: number;
    productos_activos: number;
    ingresos_mes: number;
  }> {
    const response = await api.get<any>("/marketplace/crm/estadisticas", {
      params: entidadParams(ref),
    });
    return response.data;
  },

  async crmEnviarPromocion(
    ref: EntidadRef,
    payload: {
      titulo: string;
      mensaje: string;
      audiencia: AudienciaPromocion;
      producto_id?: string;
      categoria_id?: string;
    },
  ): Promise<{ promocion: unknown; total_destinatarios: number }> {
    const response = await api.post("/marketplace/crm/promociones", {
      ...entidadParams(ref),
      ...payload,
    });
    return response.data;
  },

  // Admin moderación
  async adminGetVendedores(estado?: string): Promise<any[]> {
    const response = await api.get<any[]>("/marketplace/admin/vendedores", { params: { estado } });
    return response.data;
  },

  async adminSuspenderVendedor(id: string, motivo: string): Promise<any> {
    const response = await api.patch(`/marketplace/admin/vendedores/${id}/suspender`, { motivo });
    return response.data;
  },

  async adminReactivarVendedor(id: string): Promise<any> {
    const response = await api.patch(`/marketplace/admin/vendedores/${id}/reactivar`);
    return response.data;
  },
};

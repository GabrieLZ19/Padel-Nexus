import { api } from "../api";

export interface Vendedor {
  id: string;
  usuario_id: string;
  nombre_tienda: string;
  tipo: "jugador" | "club" | "entrenador" | "tienda";
  descripcion?: string;
  logo_url?: string;
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
  vendedor: {
    id: string;
    nombre_tienda: string;
    tipo: string;
    provincia?: string;
    valoracion_promedio: number;
  };
  categoria: {
    id: string;
    nombre: string;
    slug: string;
  };
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
  // Catálogo Público
  async getCategorias(): Promise<Categoria[]> {
    const response = await api.get<Categoria[]>("/marketplace/categorias");
    return response.data;
  },

  async getProductos(params: {
    categoria_id?: string;
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

  // Comprador
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

  // Favoritos
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

  // Vendedor
  async getPerfilVendedor(): Promise<Vendedor | null> {
    try {
      const response = await api.get<Vendedor>("/marketplace/vendedor/perfil");
      return response.data;
    } catch {
      return null;
    }
  },

  async registrarVendedor(datos: {
    nombre_tienda: string;
    tipo: "jugador" | "club" | "entrenador" | "tienda";
    descripcion?: string;
    provincia?: string;
  }): Promise<Vendedor> {
    const response = await api.post<Vendedor>("/marketplace/vendedor/registrar", datos);
    return response.data;
  },

  async actualizarPerfilVendedor(datos: Partial<Vendedor>): Promise<Vendedor> {
    const response = await api.put<Vendedor>("/marketplace/vendedor/perfil", datos);
    return response.data;
  },

  async getMisProductos(pagina = 1): Promise<{ productos: Producto[]; total: number }> {
    const response = await api.get<any>("/marketplace/vendedor/productos", { params: { pagina } });
    return response.data;
  },

  async crearProducto(producto: {
    categoria_id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    precio_anterior?: number;
    stock: number;
    marca?: string;
    tipo: "producto" | "servicio";
    modalidad_servicio?: string;
    ubicacion_servicio?: string;
    imagenes_base64?: string[];
  }): Promise<Producto> {
    const response = await api.post<Producto>("/marketplace/vendedor/productos", producto);
    return response.data;
  },

  async editarProducto(
    id: string,
    producto: {
      categoria_id?: string;
      nombre?: string;
      descripcion?: string;
      precio?: number;
      precio_anterior?: number;
      stock?: number;
      marca?: string;
      tipo?: "producto" | "servicio";
      modalidad_servicio?: string;
      ubicacion_servicio?: string;
      imagenes_existentes?: string[];
      imagenes_nuevas_base64?: string[];
    },
  ): Promise<Producto> {
    const response = await api.put<Producto>(`/marketplace/vendedor/productos/${id}`, producto);
    return response.data;
  },

  async desactivarProducto(id: string): Promise<Producto> {
    const response = await api.delete<Producto>(`/marketplace/vendedor/productos/${id}`);
    return response.data;
  },

  async getMisVentas(pagina = 1): Promise<{ ventas: any[]; total: number }> {
    const response = await api.get<any>("/marketplace/vendedor/ventas", { params: { pagina } });
    return response.data;
  },

  async getEstadisticasVendedor(): Promise<{
    balance: number;
    total_ventas: number;
    valoracion_promedio: number;
    productos_activos: number;
    ingresos_mes: number;
  }> {
    const response = await api.get<any>("/marketplace/vendedor/estadisticas");
    return response.data;
  },

  // Admin
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

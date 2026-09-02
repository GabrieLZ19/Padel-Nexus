export interface CategoriaMarketplace {
  id: string;
  nombre: string;
  slug: string;
  icono?: string;
  tipo: "producto" | "servicio";
}

export interface ProductoMarketplace {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_anterior?: number;
  stock?: number;
  marca?: string;
  thumbnail_url?: string;
  imagenes: string[];
  destacado: boolean;
  tipo: "producto" | "servicio";
  promedio_valoraciones?: number;
  total_valoraciones?: number;
  vendedor: {
    id?: string;
    nombre_tienda: string;
    valoracion_promedio?: number;
    total_ventas?: number;
  };
  categoria: {
    id?: string;
    nombre: string;
    slug?: string;
  };
}

export interface PaginatedProductos {
  data: ProductoMarketplace[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

export interface ItemCarrito {
  productoId: string;
  cantidad: number;
  producto?: ProductoMarketplace;
}

export interface DatosEnvioOrden {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  notas?: string;
}

export interface OrdenMarketplace {
  id: string;
  total: number;
  estado: string;
  created_at?: string;
  datos_envio?: DatosEnvioOrden | null;
  items?: {
    id: string;
    cantidad: number;
    precio_unitario: number;
    producto?: {
      id: string;
      nombre: string;
      thumbnail_url?: string | null;
      imagenes?: string[];
    } | null;
  }[];
}

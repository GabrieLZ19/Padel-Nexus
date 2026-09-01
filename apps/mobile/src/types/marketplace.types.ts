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
  precio: number;
  precio_anterior?: number;
  marca?: string;
  thumbnail_url?: string;
  imagenes: string[];
  destacado: boolean;
  tipo: "producto" | "servicio";
  vendedor: {
    nombre_tienda: string;
  };
  categoria: {
    nombre: string;
  };
}

export interface PaginatedProductos {
  data: ProductoMarketplace[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

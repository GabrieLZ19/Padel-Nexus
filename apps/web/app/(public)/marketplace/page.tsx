"use client";

import { useEffect, useState } from "react";
import {
  MarketplaceService,
  Producto,
  Categoria,
} from "@/utils/services/marketplace";
import { useCartStore } from "@/store/useCartStore";
import {
  ShoppingBag,
  Search,
  ChevronDown,
  Heart,
  Plus,
  Grid,
  SlidersHorizontal,
  Sparkles,
  Star,
  Check,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";

export default function MarketplacePage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favoritos, setFavoritos] = useState<string[]>([]);

  // Filtros
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState<string>("");
  const [verTodasCategorias, setVerTodasCategorias] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<
    "producto" | "servicio" | ""
  >("");
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<string>("");
  const [busqueda, setBusqueda] = useState<string>("");
  const [precioMin, setPrecioMin] = useState<number | undefined>(undefined);
  const [precioMax, setPrecioMax] = useState<number | undefined>(undefined);
  const [orden, setOrden] = useState<string>("destacados");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const { agregarItem } = useCartStore();

  useEffect(() => {
    // Cargar categorías y marcas iniciales
    MarketplaceService.getCategorias().then(setCategorias).catch(console.error);
    MarketplaceService.getMarcas().then(setMarcas).catch(console.error);

    // Cargar favoritos si el usuario está autenticado
    MarketplaceService.getFavoritos()
      .then((favs) => setFavoritos(favs.map((f) => f.producto.id)))
      .catch(() => {}); // Ignorar si no está autenticado
  }, []);

  useEffect(() => {
    setLoading(true);
    MarketplaceService.getProductos({
      categoria_id: categoriaSeleccionada || undefined,
      busqueda: busqueda || undefined,
      precio_min: precioMin,
      precio_max: precioMax,
      marca: marcaSeleccionada || undefined,
      tipo: tipoSeleccionado || undefined,
      orden,
      pagina,
      por_pagina: 12,
    })
      .then((res) => {
        setProductos(res.productos || []);
        setTotal(res.total);
        setTotalPaginas(res.total_paginas);
      })
      .catch((err) => {
        console.error(err);
        sileo.error({
          title: "Error",
          description: "Error al cargar productos.",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    categoriaSeleccionada,
    busqueda,
    precioMin,
    precioMax,
    marcaSeleccionada,
    tipoSeleccionado,
    orden,
    pagina,
  ]);

  const handleToggleFavorito = async (
    productoId: string,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await MarketplaceService.toggleFavorito(productoId);
      if (res.favorito) {
        setFavoritos([...favoritos, productoId]);
        sileo.success({
          title: "Favoritos",
          description: "Agregado a favoritos",
        });
      } else {
        setFavoritos(favoritos.filter((id) => id !== productoId));
        sileo.success({
          title: "Favoritos",
          description: "Eliminado de favoritos",
        });
      }
    } catch {
      sileo.error({
        title: "Error",
        description: "Inicia sesión para guardar favoritos.",
      });
    }
  };

  const handleAgregarAlCarrito = (producto: Producto, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    agregarItem({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      thumbnailUrl: producto.thumbnail_url || (producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes[0] : ""),
      vendedorNombre: producto.vendedor.nombre_tienda,
      stock: producto.stock,
      tipo: producto.tipo,
    });
    sileo.success({
      title: "Carrito",
      description: `${producto.nombre} agregado al carrito`,
    });
  };

  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <div className="max-w-full mx-auto px-6 md:px-12 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* SIDEBAR FILTROS */}
          <aside className="w-full lg:w-64 shrink-0 space-y-8">
            {/* Buscador */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar palas, ropa..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                className="w-full bg-brand-input border border-brand-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-all duration-200"
              />
              <Search className="absolute left-4 top-3.5 size-4.5 text-gray-400" />
            </div>

            {/* Categorías */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">
                Categorías
              </h3>
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    setCategoriaSeleccionada("");
                    setPagina(1);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                    categoriaSeleccionada === ""
                      ? "bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20"
                      : "text-gray-400 hover:text-brand-white hover:bg-brand-white/5 border border-transparent"
                  }`}
                >
                  <span>Todas</span>
                  <span className="text-xs bg-brand-white/5 px-2 py-0.5 rounded-full text-gray-400 font-bold border border-brand-white/5">
                    {categorias.reduce(
                      (sum, c) => sum + (c.total_productos || 0),
                      0,
                    )}
                  </span>
                </button>

                {(verTodasCategorias ? categorias : categorias.slice(0, 4)).map(
                  (cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setCategoriaSeleccionada(cat.id);
                        setPagina(1);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        categoriaSeleccionada === cat.id
                          ? "bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20"
                          : "text-gray-400 hover:text-brand-white hover:bg-brand-white/5 border border-transparent"
                      }`}
                    >
                      <span>{cat.nombre}</span>
                      <span className="text-xs bg-brand-white/5 px-2 py-0.5 rounded-full text-gray-400 font-bold border border-brand-white/5">
                        {cat.total_productos || 0}
                      </span>
                    </button>
                  ),
                )}

                {categorias.length > 4 && (
                  <button
                    onClick={() => setVerTodasCategorias(!verTodasCategorias)}
                    className="w-full text-left text-xs font-bold text-brand-chartreuse hover:underline pt-2 pl-4 cursor-pointer"
                  >
                    {verTodasCategorias ? "Ver menos -" : "Ver más +"}
                  </button>
                )}
              </div>
            </div>

            {/* Tipos */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">
                Tipo
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setTipoSeleccionado("");
                    setPagina(1);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer text-center ${
                    tipoSeleccionado === ""
                      ? "bg-brand-chartreuse/10 text-brand-chartreuse border-brand-chartreuse/30"
                      : "bg-brand-input/40 border-brand-white/5 text-gray-400 hover:text-brand-white"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => {
                    setTipoSeleccionado("producto");
                    setPagina(1);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer text-center ${
                    tipoSeleccionado === "producto"
                      ? "bg-brand-chartreuse/10 text-brand-chartreuse border-brand-chartreuse/30"
                      : "bg-brand-input/40 border-brand-white/5 text-gray-400 hover:text-brand-white"
                  }`}
                >
                  Productos
                </button>
                <button
                  onClick={() => {
                    setTipoSeleccionado("servicio");
                    setPagina(1);
                  }}
                  className={`col-span-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer text-center ${
                    tipoSeleccionado === "servicio"
                      ? "bg-brand-chartreuse/10 text-brand-chartreuse border-brand-chartreuse/30"
                      : "bg-brand-input/40 border-brand-white/5 text-gray-400 hover:text-brand-white"
                  }`}
                >
                  Clases y Servicios
                </button>
              </div>
            </div>

            {/* Marcas */}
            {marcas.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold tracking-wider text-gray-400 uppercase">
                  Marcas
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer text-sm text-gray-400 hover:text-brand-white">
                    <input
                      type="radio"
                      name="marca"
                      checked={marcaSeleccionada === ""}
                      onChange={() => {
                        setMarcaSeleccionada("");
                        setPagina(1);
                      }}
                      className="accent-brand-chartreuse size-4"
                    />
                    <span>Todas las marcas</span>
                  </label>
                  {marcas.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-3 cursor-pointer text-sm text-gray-400 hover:text-brand-white"
                    >
                      <input
                        type="radio"
                        name="marca"
                        checked={marcaSeleccionada === m}
                        onChange={() => {
                          setMarcaSeleccionada(m);
                          setPagina(1);
                        }}
                        className="accent-brand-chartreuse size-4"
                      />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* GRID DE PRODUCTOS */}
          <main className="flex-1 space-y-8">
            {/* Header de listado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-white/5 pb-5">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black">{total}</span>
                <span className="text-gray-400 text-sm">
                  productos y servicios encontrados
                </span>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto min-w-[180px]">
                <SlidersHorizontal className="size-4 text-gray-400" />
                <CustomDropdown
                  value={orden}
                  onChange={setOrden}
                  placeholder="Ordenar por"
                  className="py-1.5! px-10! text-xs font-bold"
                  options={[
                    { value: "destacados", label: "Destacados" },
                    { value: "recientes", label: "Más recientes" },
                    { value: "precio_asc", label: "Precio: Bajo a Alto" },
                    { value: "precio_desc", label: "Precio: Alto a Bajo" },
                  ]}
                />
              </div>
            </div>

            {/* Listado */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-brand-card/40 border border-brand-white/5 rounded-3xl h-[340px] animate-pulse"
                  />
                ))}
              </div>
            ) : productos.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 bg-brand-input/20 rounded-3xl border border-brand-white/5">
                <ShoppingBag className="size-12 text-gray-500 mb-4" />
                <h3 className="text-lg font-bold mb-1">
                  No se encontraron productos
                </h3>
                <p className="text-sm text-gray-400 max-w-sm">
                  Intenta cambiar tus filtros de búsqueda o categoría para
                  encontrar otros artículos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
                {productos.map((prod) => {
                  const imageUrl =
                    prod.thumbnail_url ||
                    (prod.imagenes && prod.imagenes.length > 0
                      ? prod.imagenes[0]
                      : null);
                  return (
                    <Link
                      key={prod.id}
                      href={`/marketplace/producto/${prod.id}`}
                      className="group bg-brand-card hover:bg-brand-card/85 border border-brand-white/5 hover:border-brand-chartreuse/25 rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 relative shadow-lg"
                    >
                      {/* Badge destacado */}
                      {prod.destacado && (
                        <span className="absolute top-4 left-4 bg-brand-chartreuse text-brand-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full z-10">
                          Destacado
                        </span>
                      )}

                      {/* Botón Favorito */}
                      <button
                        onClick={(e) => handleToggleFavorito(prod.id, e)}
                        className="absolute top-4 right-4 z-10 size-8 rounded-full bg-brand-black/60 border border-brand-white/10 flex items-center justify-center hover:bg-brand-black transition-colors cursor-pointer"
                      >
                        <Heart
                          className={`size-4 ${
                            favoritos.includes(prod.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-400 group-hover:text-brand-white"
                          }`}
                        />
                      </button>

                      {/* Imagen del producto */}
                      <div className="relative aspect-square w-full bg-brand-black/35 overflow-hidden border-b border-brand-white/5">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={prod.nombre}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="size-12 text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Contenido / Info */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                            <span>{prod.marca || "Padel Nexus"}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-brand-white/5 text-gray-400">
                              {prod.tipo === "servicio"
                                ? "Clase / Servicio"
                                : prod.categoria.nombre}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-brand-white group-hover:text-brand-chartreuse transition-colors line-clamp-1 mb-2">
                            {prod.nombre}
                          </h3>

                          {prod.tipo === "servicio" && (
                            <div className="text-xs text-gray-400 flex items-center gap-1.5 mb-3 bg-brand-white/5 p-2 rounded-xl border border-brand-white/5">
                              <span className="font-bold text-brand-chartreuse capitalize">
                                {prod.modalidad_servicio}
                              </span>
                              <span className="text-gray-600">•</span>
                              <span className="truncate">
                                {prod.ubicacion_servicio ||
                                  "Consultar ubicación"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-white/5">
                          <div className="flex flex-col">
                            {prod.precio_anterior && (
                              <span className="text-[11px] text-gray-500 line-through">
                                ${prod.precio_anterior.toLocaleString("es-AR")}
                              </span>
                            )}
                            <span className="text-lg font-black text-brand-chartreuse">
                              ${prod.precio.toLocaleString("es-AR")}
                            </span>
                          </div>

                          {/* Botón Carrito */}
                          <button
                            onClick={(e) => handleAgregarAlCarrito(prod, e)}
                            disabled={
                              prod.tipo === "producto" && prod.stock <= 0
                            }
                            className="bg-brand-chartreuse disabled:bg-gray-700 text-brand-black size-10 rounded-xl flex items-center justify-center hover:opacity-90 transition-all duration-200 shadow-md shadow-brand-chartreuse/10 cursor-pointer"
                          >
                            <Plus className="size-5" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                {[...Array(totalPaginas)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPagina(i + 1)}
                    className={`size-9 rounded-xl font-bold text-xs flex items-center justify-center transition-colors cursor-pointer border ${
                      pagina === i + 1
                        ? "bg-brand-chartreuse border-brand-chartreuse text-brand-black"
                        : "bg-brand-input border-brand-white/5 text-gray-400 hover:text-brand-white"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

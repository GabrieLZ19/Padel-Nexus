"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Heart,
  MapPin,
  Plus,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import { sileo } from "sileo";
import {
  MarketplaceService,
  type Producto,
  type TiendaPublica,
} from "@/utils/services/marketplace";
import { useCartStore } from "@/store/useCartStore";
import DescuentoBadge from "@/components/marketplace/DescuentoBadge";
import { tieneDescuento } from "@/utils/marketplaceDescuento";

function TiendaContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tiendaId = params.id;

  const [tienda, setTienda] = useState<TiendaPublica | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaId, setCategoriaId] = useState("");
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const { agregarItem } = useCartStore();

  useEffect(() => {
    const catParam = searchParams.get("categoria_id");
    if (catParam) setCategoriaId(catParam);
  }, [searchParams]);

  useEffect(() => {
    if (!tiendaId) return;
    setLoading(true);
    Promise.all([
      MarketplaceService.getTiendaPublica(tiendaId),
      MarketplaceService.getProductos({
        vendedor_id: tiendaId,
        categoria_id: categoriaId || undefined,
        por_pagina: 48,
      }),
      MarketplaceService.getFavoritos()
        .then((favs) => favs.map((f) => f.producto.id))
        .catch(() => [] as string[]),
    ])
      .then(([tiendaData, productosData, favIds]) => {
        setTienda(tiendaData);
        setProductos(productosData.productos || []);
        setFavoritos(favIds);
      })
      .catch((err) => {
        console.error(err);
        sileo.error({
          title: "Tienda no disponible",
          description: "No encontramos esta tienda en el marketplace.",
        });
        router.push("/marketplace");
      })
      .finally(() => setLoading(false));
  }, [tiendaId, categoriaId, router]);

  const handleCategoria = (id: string) => {
    setCategoriaId(id);
    const qs = id ? `?categoria_id=${id}` : "";
    router.replace(`/marketplace/tienda/${tiendaId}${qs}`, { scroll: false });
  };

  const handleToggleFavorito = async (productoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await MarketplaceService.toggleFavorito(productoId);
      if (res.favorito) {
        setFavoritos((prev) => [...prev, productoId]);
      } else {
        setFavoritos((prev) => prev.filter((id) => id !== productoId));
      }
    } catch {
      sileo.error({
        title: "Favoritos",
        description: "Iniciá sesión para guardar favoritos.",
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
      thumbnailUrl:
        producto.thumbnail_url ||
        (producto.imagenes?.[0] ?? ""),
      vendedorNombre: producto.vendedor.nombre_tienda,
      stock: producto.stock,
      tipo: producto.tipo,
    });
    sileo.success({
      title: "Carrito",
      description: `${producto.nombre} agregado al carrito`,
    });
  };

  if (loading || !tienda) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center">
        <div className="size-10 border-4 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10 space-y-8">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand-chartreuse transition-colors"
        >
          <ArrowLeft className="size-4" />
          Volver al marketplace
        </Link>

        {/* Cabecera tienda */}
        <section className="rounded-3xl border border-brand-white/10 bg-gradient-to-br from-brand-card to-brand-black p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              {tienda.logo_url ? (
                <div className="relative size-20 md:size-24 rounded-2xl overflow-hidden bg-brand-black/40 border border-brand-white/10 shrink-0">
                  <Image
                    src={tienda.logo_url}
                    alt={tienda.nombre_tienda}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="size-20 md:size-24 rounded-2xl bg-brand-chartreuse/15 flex items-center justify-center shrink-0">
                  <Store className="size-10 text-brand-chartreuse" />
                </div>
              )}
              <div className="space-y-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-chartreuse bg-brand-chartreuse/10 px-2.5 py-1 rounded-full">
                  <BadgeCheck className="size-3" />
                  Entidad verificada
                </span>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  {tienda.nombre_tienda}
                </h1>
                <p className="text-sm text-gray-400 capitalize">
                  {tienda.tipo}
                  {tienda.entidad_nombre ? ` · ${tienda.entidad_nombre}` : ""}
                </p>
                {tienda.provincia && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {tienda.provincia}
                  </p>
                )}
                {tienda.descripcion && (
                  <p className="text-sm text-gray-300 leading-relaxed max-w-2xl pt-1">
                    {tienda.descripcion}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 lg:gap-6 shrink-0">
              <div className="text-center px-4 py-3 rounded-2xl bg-brand-black/40 border border-brand-white/5">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                  <Star className="size-4 fill-amber-400" />
                  <span className="font-black text-lg text-brand-white">
                    {tienda.valoracion_promedio || "—"}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Reputación</p>
              </div>
              <div className="text-center px-4 py-3 rounded-2xl bg-brand-black/40 border border-brand-white/5">
                <p className="font-black text-lg">{tienda.total_ventas}</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Ventas</p>
              </div>
              <div className="text-center px-4 py-3 rounded-2xl bg-brand-black/40 border border-brand-white/5">
                <p className="font-black text-lg text-brand-chartreuse">
                  {tienda.productos_activos}
                </p>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Publicaciones</p>
              </div>
            </div>
          </div>
        </section>

        {/* Filtros por categoría de la tienda */}
        {tienda.categorias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoria("")}
              className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                !categoriaId
                  ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                  : "bg-brand-black/40 text-gray-400 border-brand-white/10 hover:text-brand-white"
              }`}
            >
              Todas ({tienda.productos_activos})
            </button>
            {tienda.categorias.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoria(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                  categoriaId === cat.id
                    ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                    : "bg-brand-black/40 text-gray-400 border-brand-white/10 hover:text-brand-white"
                }`}
              >
                {cat.nombre} ({cat.total})
              </button>
            ))}
          </div>
        )}

        {/* Productos */}
        <section className="space-y-5">
          <h2 className="text-lg font-black">
            {productos.length} publicación{productos.length !== 1 ? "es" : ""}
            {categoriaId
              ? ` en ${tienda.categorias.find((c) => c.id === categoriaId)?.nombre || "categoría"}`
              : ""}
          </h2>

          {productos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-white/10 py-16 text-center">
              <ShoppingBag className="size-12 text-gray-600 mx-auto mb-3" />
              <p className="font-bold text-gray-400">Sin publicaciones en esta categoría</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productos.map((prod) => {
                const imageUrl =
                  prod.thumbnail_url || (prod.imagenes?.[0] ?? null);
                return (
                  <Link
                    key={prod.id}
                    href={`/marketplace/producto/${prod.id}`}
                    className="group bg-brand-card border border-brand-white/5 hover:border-brand-chartreuse/25 rounded-3xl overflow-hidden flex flex-col transition-all relative"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorito(prod.id, e)}
                      className="absolute top-3 right-3 z-10 size-8 rounded-full bg-brand-black/60 border border-brand-white/10 flex items-center justify-center cursor-pointer"
                    >
                      <Heart
                        className={`size-4 ${
                          favoritos.includes(prod.id)
                            ? "fill-red-500 text-red-500"
                            : "text-gray-400"
                        }`}
                      />
                    </button>
                    <div className="relative aspect-square bg-brand-black/35">
                      <DescuentoBadge
                        precio={prod.precio}
                        precioAnterior={prod.precio_anterior}
                      />
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={prod.nombre}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ShoppingBag className="size-10 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                      <p className="text-[10px] font-bold text-gray-500 uppercase">
                        {prod.categoria?.nombre}
                      </p>
                      <h3 className="font-bold line-clamp-2">{prod.nombre}</h3>
                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="flex flex-col">
                          {tieneDescuento(prod.precio, prod.precio_anterior) && (
                            <span className="text-[10px] text-gray-500 line-through">
                              ${prod.precio_anterior!.toLocaleString("es-AR")}
                            </span>
                          )}
                          <p className="text-brand-chartreuse font-black">
                            ${prod.precio.toLocaleString("es-AR")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleAgregarAlCarrito(prod, e)}
                          className="size-9 rounded-full bg-brand-chartreuse text-brand-black flex items-center justify-center cursor-pointer hover:opacity-90"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function TiendaPublicaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-black flex items-center justify-center">
          <div className="size-10 border-4 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TiendaContent />
    </Suspense>
  );
}

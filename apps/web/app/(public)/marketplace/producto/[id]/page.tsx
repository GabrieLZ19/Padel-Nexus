"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MarketplaceService,
  Producto,
  Valoracion,
} from "@/utils/services/marketplace";
import { ChatService } from "@/utils/services/chat";
import { useCartStore } from "@/store/useCartStore";
import { useProfileStore } from "@/store/useProfileStore";
import {
  ShoppingBag,
  Heart,
  Plus,
  Minus,
  MapPin,
  Calendar,
  Star,
  Check,
  ArrowLeft,
  Store,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { sileo } from "sileo";
import DescuentoBadge from "@/components/marketplace/DescuentoBadge";
import { tieneDescuento } from "@/utils/marketplaceDescuento";

export default function ProductoDetallePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([]);
  const [relacionados, setRelacionados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagenActiva, setImagenActiva] = useState<string>("");
  const [cantidad, setCantidad] = useState(1);
  const [favorito, setFavorito] = useState(false);
  const [paginaVal, setPaginaVal] = useState(1);
  const [totalVal, setTotalVal] = useState(0);
  const [contactando, setContactando] = useState(false);

  const { agregarItem } = useCartStore();
  const { profile } = useProfileStore();

  const esDueno = false;

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Cargar producto principal
    MarketplaceService.getProducto(id)
      .then((res) => {
        setProducto(res);
        setImagenActiva(res.imagenes?.[0] || res.thumbnail_url || "");

        // Cargar productos relacionados (misma categoría)
        MarketplaceService.getProductos({
          categoria_id: res.categoria_id,
          por_pagina: 4,
        })
          .then((relRes) => {
            setRelacionados(
              (relRes.productos || []).filter((p) => p.id !== res.id),
            );
          })
          .catch(console.error);
      })
      .catch((err) => {
        console.error(err);
        sileo.error({ title: "Error", description: "Producto no encontrado." });
        router.push("/marketplace");
      })
      .finally(() => {
        setLoading(false);
      });

    // Cargar valoraciones
    MarketplaceService.getValoraciones(id)
      .then((res) => {
        setValoraciones(res.valoraciones || []);
        setTotalVal(res.total);
      })
      .catch(console.error);

    // Verificar si es favorito
    MarketplaceService.checkFavorito(id)
      .then((res) => setFavorito(res.es_favorito))
      .catch(() => {});
  }, [id, router]);

  const handleToggleFavorito = async () => {
    try {
      const res = await MarketplaceService.toggleFavorito(id);
      setFavorito(res.favorito);
      sileo.success({
        title: "Favoritos",
        description: res.favorito
          ? "Agregado a favoritos"
          : "Eliminado de favoritos",
      });
    } catch {
      sileo.error({
        title: "Error",
        description: "Inicia sesión para guardar favoritos.",
      });
    }
  };

  const handleAgregarAlCarrito = () => {
    if (!producto) return;
    agregarItem({
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      thumbnailUrl:
        producto.thumbnail_url ||
        (producto.imagenes && producto.imagenes.length > 0
          ? producto.imagenes[0]
          : ""),
      vendedorNombre: producto.vendedor.nombre_tienda,
      stock: producto.stock,
      tipo: producto.tipo,
    });
    sileo.success({
      title: "Carrito",
      description: "Producto agregado al carrito",
    });
  };

  const handlePreguntarVendedor = async () => {
    if (!producto) return;

    if (!profile?.id) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/marketplace/producto/${producto.id}`)}`,
      );
      return;
    }

    if (esDueno) {
      sileo.error({
        title: "No disponible",
        description: "No podés chatear sobre tu propio producto.",
      });
      return;
    }

    setContactando(true);
    try {
      const conv = await ChatService.iniciarChatProducto(producto.id);
      router.push(`/mensajes?c=${conv.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "No se pudo iniciar el chat con el vendedor.";
      sileo.error({ title: "Error", description: message });
    } finally {
      setContactando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black text-brand-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 border-4 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-bold">
            Cargando producto...
          </p>
        </div>
      </div>
    );
  }

  if (!producto) return null;

  const imagenes: string[] =
    producto.imagenes?.length > 0
      ? producto.imagenes
      : ([producto.thumbnail_url].filter(Boolean) as string[]);

  const promedioValoraciones = producto.promedio_valoraciones ?? 0;
  const totalValoraciones = producto.total_valoraciones ?? 0;

  return (
    <div className="min-h-screen bg-brand-black text-brand-white pb-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        {/* Botón Volver */}
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-chartreuse transition-colors mb-8 font-bold text-sm"
        >
          <ArrowLeft className="size-4" />
          <span>Volver al Catálogo</span>
        </Link>

        {/* FICHA PRINCIPAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* GALERÍA DE IMÁGENES (45% ancho) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-brand-input/40 border border-brand-white/5 shadow-2xl">
              {imagenActiva ? (
                <Image
                  src={imagenActiva}
                  alt={producto.nombre}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="size-16 text-gray-600" />
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {imagenes.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {imagenes.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setImagenActiva(img)}
                    className={`relative size-20 rounded-2xl overflow-hidden bg-brand-input/40 border transition-all duration-200 cursor-pointer shrink-0 ${
                      imagenActiva === img
                        ? "border-brand-chartreuse"
                        : "border-brand-white/5 hover:border-brand-white/20"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Imagen ${i + 1}`}
                      fill
                      className="object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETALLES Y COMPRA (55% ancho) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              {/* Categoría / Marca */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold bg-brand-white/5 border border-brand-white/5 text-gray-400 px-3 py-1 rounded-full uppercase tracking-wider">
                  {producto.marca || "Padel Nexus"}
                </span>
                <span className="text-xs font-bold bg-brand-chartreuse/10 border border-brand-chartreuse/25 text-brand-chartreuse px-3 py-1 rounded-full uppercase tracking-wider">
                  {producto.categoria.nombre}
                </span>
              </div>

              {/* Título y precio */}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                  {producto.nombre}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-baseline gap-4">
                    <span className="text-2xl md:text-3xl font-black text-brand-chartreuse">
                      ${producto.precio.toLocaleString("es-AR")}
                    </span>
                    {tieneDescuento(producto.precio, producto.precio_anterior) && (
                      <span className="text-sm text-gray-500 line-through">
                        ${producto.precio_anterior!.toLocaleString("es-AR")}
                      </span>
                    )}
                  </div>
                  <DescuentoBadge
                    precio={producto.precio}
                    precioAnterior={producto.precio_anterior}
                    variant="large"
                  />
                </div>
              </div>

              {/* Rating Mini */}
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`size-4 ${
                        i < Math.round(promedioValoraciones)
                          ? "fill-amber-400"
                          : "text-gray-600"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-brand-white">
                  {promedioValoraciones}
                </span>
                <span>({totalValoraciones} valoraciones)</span>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold tracking-wider uppercase text-gray-400">
                  Descripción
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {producto.descripcion ||
                    "Sin descripción disponible para este producto."}
                </p>
              </div>

              {/* Detalle si es servicio */}
              {producto.tipo === "servicio" && (
                <div className="bg-brand-input/40 border border-brand-white/5 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-brand-chartreuse uppercase tracking-wider">
                    Detalles del Servicio
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4.5 text-gray-500" />
                      <span>
                        Clases:{" "}
                        <span className="font-bold capitalize">
                          {producto.modalidad_servicio}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="size-4.5 text-gray-500" />
                      <span className="truncate">
                        {producto.ubicacion_servicio || "Consultar ubicación"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACCIONES DE COMPRA */}
            <div className="border-t border-brand-white/5 pt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Selector de cantidad (solo productos físicos) */}
                {producto.tipo === "producto" && (
                  <div className="flex items-center bg-brand-input border border-brand-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                      disabled={cantidad <= 1}
                      className="p-2 text-gray-400 hover:text-brand-white disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm">
                      {cantidad}
                    </span>
                    <button
                      onClick={() =>
                        setCantidad(Math.min(producto.stock, cantidad + 1))
                      }
                      disabled={cantidad >= producto.stock}
                      className="p-2 text-gray-400 hover:text-brand-white disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                )}

                {/* Stock Indicator */}
                {producto.tipo === "producto" && (
                  <span className="text-xs text-gray-400">
                    {producto.stock > 0 ? (
                      <span>
                        Disponibles:{" "}
                        <span className="font-bold text-brand-white">
                          {producto.stock} unidades
                        </span>
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold">Sin Stock</span>
                    )}
                  </span>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleAgregarAlCarrito}
                  disabled={producto.tipo === "producto" && producto.stock <= 0}
                  className="flex-1 bg-brand-chartreuse disabled:bg-gray-700 text-brand-black font-bold text-sm py-4 px-6 rounded-2xl hover:opacity-90 transition-all duration-200 shadow-lg shadow-brand-chartreuse/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="size-4.5" />
                  <span>Añadir al Carrito</span>
                </button>

                {!esDueno && (
                  <button
                    onClick={handlePreguntarVendedor}
                    disabled={contactando}
                    className="flex-1 border border-brand-chartreuse/40 text-brand-chartreuse font-bold text-sm py-4 px-6 rounded-2xl hover:bg-brand-chartreuse/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <MessageSquare className="size-4.5" />
                    <span>
                      {contactando ? "Abriendo..." : "Preguntar al vendedor"}
                    </span>
                  </button>
                )}

                <button
                  onClick={handleToggleFavorito}
                  className="size-13 rounded-2xl border border-brand-white/10 hover:border-brand-white/20 flex items-center justify-center text-gray-400 hover:text-brand-white transition-colors cursor-pointer"
                >
                  <Heart
                    className={`size-5 ${favorito ? "fill-red-500 text-red-500" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PERFIL DEL VENDEDOR */}
        <div className="mt-16 bg-brand-card border border-brand-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {producto.vendedor.logo_url ? (
              <div className="relative size-16 rounded-full overflow-hidden bg-brand-black/40 border border-brand-white/10">
                <Image
                  src={producto.vendedor.logo_url}
                  alt={producto.vendedor.nombre_tienda}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="size-16 rounded-full bg-brand-chartreuse text-brand-black flex items-center justify-center text-xl font-bold">
                {producto.vendedor.nombre_tienda.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold text-brand-chartreuse uppercase tracking-wider">
                Vendedor {producto.vendedor.tipo}
              </span>
              <h3 className="text-lg font-bold text-brand-white">
                {producto.vendedor.nombre_tienda}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5 max-w-md line-clamp-2">
                {producto.vendedor.descripcion ||
                  "Vendedor verificado en la plataforma Padel Nexus."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6">
            <div className="flex gap-8 border-t md:border-t-0 border-brand-white/5 pt-4 md:pt-0">
              <div className="text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Valoración
                </span>
                <div className="flex items-center gap-1 mt-1 justify-center">
                  <Star className="size-4 text-amber-400 fill-amber-400" />
                  <span className="font-black text-sm">
                    {producto.vendedor.valoracion_promedio}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Ventas
                </span>
                <span className="font-black text-sm block mt-1">
                  {producto.vendedor.total_ventas}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Provincia
                </span>
                <span className="font-bold text-sm block mt-1 text-gray-300">
                  {producto.vendedor.provincia || "No especificada"}
                </span>
              </div>
            </div>

            {!esDueno && (
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Link
                  href={`/marketplace/tienda/${producto.vendedor.id}`}
                  className="inline-flex items-center justify-center gap-2 bg-brand-white/5 hover:bg-brand-white/10 text-brand-white border border-brand-white/10 font-bold text-sm py-3 px-5 rounded-2xl transition-all"
                >
                  <Store className="size-4" />
                  Ver tienda
                </Link>
                <button
                  onClick={handlePreguntarVendedor}
                  disabled={contactando}
                  className="bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/30 font-bold text-sm py-3 px-5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <MessageSquare className="size-4" />
                  {contactando ? "Abriendo..." : "Contactar"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* VALORACIONES / REVIEWS */}
        <div className="mt-16 space-y-6">
          <h3 className="text-xl font-black flex items-center gap-2">
            <MessageSquare className="size-5 text-brand-chartreuse" />
            <span>Valoraciones ({totalVal})</span>
          </h3>

          {valoraciones.length === 0 ? (
            <div className="bg-brand-input/20 border border-brand-white/5 rounded-3xl p-8 text-center text-gray-400 text-sm">
              Este producto aún no cuenta con valoraciones.
            </div>
          ) : (
            <div className="space-y-4">
              {valoraciones.map((val) => (
                <div
                  key={val.id}
                  className="bg-brand-card/45 border border-brand-white/5 rounded-3xl p-6 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {val.comprador.avatar_url ? (
                        <div className="relative size-8 rounded-full overflow-hidden bg-brand-black/40 border border-brand-white/10">
                          <Image
                            src={val.comprador.avatar_url}
                            alt={val.comprador.nombre}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <div className="size-8 rounded-full bg-brand-white/5 text-gray-400 flex items-center justify-center text-xs font-bold">
                          {val.comprador.nombre[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-brand-white">
                          {val.comprador.nombre} {val.comprador.apellido}
                        </h4>
                        <span className="text-[10px] text-gray-500">
                          {new Date(val.created_at).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    </div>

                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${
                            i < val.puntuacion
                              ? "fill-amber-400"
                              : "text-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {val.comentario && (
                    <p className="text-gray-300 text-sm pl-11">
                      {val.comentario}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RELACIONADOS */}
        {relacionados.length > 0 && (
          <div className="mt-20 space-y-6">
            <h3 className="text-xl font-black">Productos Relacionados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relacionados.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/marketplace/producto/${rel.id}`}
                  className="group bg-brand-card hover:bg-brand-card/80 border border-brand-white/5 hover:border-brand-chartreuse/25 rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300"
                >
                  <div className="relative aspect-square w-full bg-brand-black/35 overflow-hidden">
                    {rel.thumbnail_url ? (
                      <Image
                        src={rel.thumbnail_url}
                        alt={rel.nombre}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="size-10 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      {rel.marca || "Padel Nexus"}
                    </span>
                    <h4 className="font-bold text-sm text-brand-white group-hover:text-brand-chartreuse transition-colors line-clamp-1">
                      {rel.nombre}
                    </h4>
                    <span className="text-sm font-black text-brand-chartreuse block">
                      ${rel.precio.toLocaleString("es-AR")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

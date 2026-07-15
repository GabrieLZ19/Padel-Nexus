"use client";

import { useEffect, useState } from "react";
import { MarketplaceService, Producto } from "@/utils/services/marketplace";
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  ShoppingBag,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { sileo } from "sileo";

export default function MisProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarProductos();
  }, [pagina]);

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const vendedor = await MarketplaceService.getPerfilVendedor();
      if (vendedor) {
        const res = await MarketplaceService.getMisProductos(pagina);
        setProductos(res.productos || []);
        setTotal(res.total);
      }
    } catch (err) {
      console.error(err);
      sileo.error({ title: "Error", description: "Error al cargar productos." });
    } finally {
      setLoading(false);
    }
  };

  const handleDesactivar = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que quieres ocultar el producto "${nombre}"?`)) return;
    try {
      await MarketplaceService.desactivarProducto(id);
      sileo.success({ title: "Publicación Ocultada", description: "Producto ocultado del catálogo" });
      cargarProductos();
    } catch (err) {
      console.error(err);
      sileo.error({ title: "Error", description: "Error al ocultar producto." });
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-10 max-w-7xl mx-auto text-brand-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-white/5 pb-6">
        <div className="space-y-1">
          <Link
            href="/mi-perfil/vendedor"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-chartreuse transition-colors font-bold uppercase"
          >
            <ArrowLeft className="size-3" />
            <span>Volver a Mi Perfil Vendedor</span>
          </Link>
          <h1 className="text-3xl font-black tracking-tight">Mis Publicaciones</h1>
          <p className="text-gray-400 text-sm">Gestiona el catálogo de productos y servicios que ofreces.</p>
        </div>

        <Link
          href="/mi-perfil/vendedor/productos/nuevo"
          className="bg-brand-chartreuse text-brand-black px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-95 transition-all shadow-md shadow-brand-chartreuse/10 flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Publicar Producto / Servicio</span>
        </Link>
      </div>

      {/* Listado */}
      <div className="bg-brand-card border border-brand-white/5 rounded-3xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-8 border-3 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center">
            <Package className="size-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-bold mb-1">No tienes publicaciones</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-6">
              Comienza publicando tu primer pala, accesorio deportivo o contrata tus clases.
            </p>
            <Link
              href="/mi-perfil/vendedor/productos/nuevo"
              className="bg-brand-chartreuse text-brand-black px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-95 transition-all"
            >
              Publicar Ahora
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-brand-white/5 text-gray-500 text-xs font-bold uppercase bg-brand-black/25">
                  <th className="py-4 px-6 w-20">Miniatura</th>
                  <th className="py-4 px-6">Producto</th>
                  <th className="py-4 px-6">Categoría</th>
                  <th className="py-4 px-6">Precio</th>
                  <th className="py-4 px-6">Stock / Cupos</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-white/5">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-brand-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="relative size-12 rounded-lg overflow-hidden bg-brand-black/40 border border-brand-white/5">
                        {prod.thumbnail_url ? (
                          <Image src={prod.thumbnail_url} alt={prod.nombre} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="size-5 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-brand-white">{prod.nombre}</div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">{prod.marca || "Padel Nexus"}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {prod.categoria?.nombre || "General"}
                    </td>
                    <td className="py-4 px-6 font-bold text-brand-chartreuse">
                      ${prod.precio.toLocaleString("es-AR")}
                    </td>
                    <td className="py-4 px-6 text-gray-300 font-bold">
                      {prod.tipo === "servicio" ? "Ilimitado" : prod.stock}
                    </td>
                    <td className="py-4 px-6">
                      {prod.activo ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2 py-0.5 rounded-full">
                          <Eye className="size-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          <EyeOff className="size-3" /> Oculto
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/mi-perfil/vendedor/productos/nuevo?edit_id=${prod.id}`}
                          className="p-2 rounded-lg bg-brand-white/5 border border-brand-white/5 text-gray-400 hover:text-brand-white hover:bg-brand-white/10 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="size-4" />
                        </Link>
                        {prod.activo && (
                          <button
                            onClick={() => handleDesactivar(prod.id, prod.nombre)}
                            className="p-2 rounded-lg bg-brand-white/5 border border-brand-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Ocultar del catálogo"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { MarketplaceService } from "@/utils/services/marketplace";
import {
  ShieldAlert,
  Users,
  CheckCircle,
  Ban,
  Star,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { sileo } from "sileo";

export default function AdminMarketplacePage() {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [motivoSuspension, setMotivoSuspension] = useState("");
  const [vendedorASuspender, setVendedorASuspender] = useState<string | null>(
    null,
  );

  useEffect(() => {
    cargarVendedores();
  }, []);

  const cargarVendedores = async () => {
    setLoading(true);
    try {
      const res = await MarketplaceService.adminGetVendedores();
      setVendedores(res || []);
    } catch (err) {
      console.error(err);
      sileo.error({
        title: "Error",
        description: "Error al cargar vendedores del CRM.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuspender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendedorASuspender || !motivoSuspension) return;

    try {
      await MarketplaceService.adminSuspenderVendedor(
        vendedorASuspender,
        motivoSuspension,
      );
      sileo.success({
        title: "Cuenta Suspendida",
        description: "Vendedor suspendido exitosamente.",
      });
      setVendedorASuspender(null);
      setMotivoSuspension("");
      cargarVendedores();
    } catch (err: any) {
      sileo.error({
        title: "Error",
        description:
          err.response?.data?.message || "Error al suspender vendedor.",
      });
    }
  };

  const handleReactivar = async (id: string) => {
    if (!confirm("¿Deseas reactivar esta cuenta de vendedor?")) return;
    try {
      await MarketplaceService.adminReactivarVendedor(id);
      sileo.success({
        title: "Cuenta Reactivada",
        description: "Vendedor reactivado exitosamente.",
      });
      cargarVendedores();
    } catch (err: any) {
      sileo.error({
        title: "Error",
        description:
          err.response?.data?.message || "Error al reactivar vendedor.",
      });
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-10 max-w-full mx-auto text-brand-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-white/5 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <ShieldAlert className="size-8 text-brand-chartreuse" />
            <span>Moderación del Marketplace</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Supervisión, auditoría y control de vendedores registrados.
          </p>
        </div>
      </div>

      {/* METRICAS GLOBALES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 space-y-2">
          <div className="size-10 rounded-2xl bg-brand-chartreuse/10 text-brand-chartreuse flex items-center justify-center">
            <Users className="size-5" />
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Vendedores Totales
          </p>
          <h3 className="text-2xl font-black text-brand-white">
            {vendedores.length}
          </h3>
        </div>

        <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 space-y-2">
          <div className="size-10 rounded-2xl bg-brand-chartreuse/10 text-brand-chartreuse flex items-center justify-center">
            <CheckCircle className="size-5" />
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Vendedores Activos
          </p>
          <h3 className="text-2xl font-black text-brand-chartreuse">
            {vendedores.filter((v) => v.estado === "activo").length}
          </h3>
        </div>

        <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 space-y-2">
          <div className="size-10 rounded-2xl bg-brand-chartreuse/10 text-brand-chartreuse flex items-center justify-center">
            <Ban className="size-5" />
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Vendedores Suspendidos
          </p>
          <h3 className="text-2xl font-black text-red-400">
            {vendedores.filter((v) => v.estado === "suspendido").length}
          </h3>
        </div>
      </div>

      {/* TABLA DE VENDEDORES */}
      <div className="bg-brand-card border border-brand-white/5 rounded-3xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-8 border-3 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vendedores.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No hay vendedores registrados en la plataforma.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-brand-white/5 text-gray-500 text-xs font-bold uppercase bg-brand-black/25">
                  <th className="py-4 px-6">Vendedor / Tienda</th>
                  <th className="py-4 px-6">Usuario Propietario</th>
                  <th className="py-4 px-6">Tipo</th>
                  <th className="py-4 px-6">Ubicación</th>
                  <th className="py-4 px-6">Reputación</th>
                  <th className="py-4 px-6">Ventas</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-white/5">
                {vendedores.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-brand-white/5 transition-colors"
                  >
                    <td className="py-4 px-6 font-bold text-brand-white">
                      {v.nombre_tienda}
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      <div>
                        {v.usuario?.nombre} {v.usuario?.apellido}
                      </div>
                      <span className="text-xs text-gray-500">
                        {v.usuario?.email}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400 capitalize">
                      {v.tipo}
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {v.provincia || "No especificada"}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 font-bold text-amber-400">
                        <Star className="size-3.5 fill-amber-400" />
                        <span>{v.valoracion_promedio}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-300">
                      {v.total_ventas}
                    </td>
                    <td className="py-4 px-6">
                      {v.estado === "activo" ? (
                        <span className="text-[10px] font-bold text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2 py-0.5 rounded-full">
                          Activo
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          Suspendido
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {v.estado === "activo" ? (
                        <button
                          onClick={() => setVendedorASuspender(v.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Suspender
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivar(v.id)}
                          className="px-3 py-1.5 rounded-lg bg-brand-chartreuse/10 hover:bg-brand-chartreuse/25 border border-brand-chartreuse/20 text-brand-chartreuse hover:text-brand-chartreuse transition-colors font-bold text-xs cursor-pointer"
                        >
                          Reactivar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL SUSPENSIÓN */}
      {vendedorASuspender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setVendedorASuspender(null)}
          />
          <div className="relative bg-brand-card border border-brand-white/10 rounded-3xl p-6 w-full max-w-md text-brand-white space-y-4">
            <h3 className="text-lg font-bold text-brand-white flex items-center gap-2">
              <Ban className="size-5 text-red-400" />
              <span>Suspender Cuenta de Vendedor</span>
            </h3>
            <p className="text-xs text-gray-400">
              La suspensión ocultará los productos del vendedor del catálogo
              público inmediatamente.
            </p>

            <form onSubmit={handleSuspender} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Motivo de la Suspensión *
                </label>
                <textarea
                  required
                  placeholder="Ej: Publicación de productos prohibidos, fraude o reclamos reiterados de clientes..."
                  rows={3}
                  value={motivoSuspension}
                  onChange={(e) => setMotivoSuspension(e.target.value)}
                  className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setVendedorASuspender(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-brand-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Confirmar Suspensión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

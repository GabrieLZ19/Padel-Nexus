"use client";

import { useEffect, useState } from "react";
import { MarketplaceService, Vendedor } from "@/utils/services/marketplace";
import { useProfileStore } from "@/store/useProfileStore";
import {
  Store,
  TrendingUp,
  ShoppingBag,
  Star,
  DollarSign,
  ClipboardList,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { sileo } from "sileo";

export default function VendedorPerfilPage() {
  const { profile } = useProfileStore();
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [ventas, setVentas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registroLoading, setRegistroLoading] = useState(false);

  // Campos formulario registro vendedor
  const [nombreTienda, setNombreTienda] = useState("");
  const [tipoVendedor, setTipoVendedor] = useState<
    "jugador" | "club" | "entrenador" | "tienda"
  >("jugador");
  const [descripcion, setDescripcion] = useState("");
  const [provincia, setProvincia] = useState("La Rioja");

  useEffect(() => {
    cargarDatosVendedor();
  }, []);

  const cargarDatosVendedor = async () => {
    setLoading(true);
    try {
      const perfilVendedor = await MarketplaceService.getPerfilVendedor();
      if (perfilVendedor) {
        setVendedor(perfilVendedor);
        const [statsData, ventasData] = await Promise.all([
          MarketplaceService.getEstadisticasVendedor(),
          MarketplaceService.getMisVentas(1),
        ]);
        setStats(statsData);
        setVentas(ventasData.ventas?.slice(0, 5) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreTienda) {
      sileo.error({
        title: "Error",
        description:
          "Por favor ingresa el nombre de tu tienda o perfil vendedor.",
      });
      return;
    }

    setRegistroLoading(true);
    try {
      const nuevoVendedor = await MarketplaceService.registrarVendedor({
        nombre_tienda: nombreTienda,
        tipo: tipoVendedor,
        descripcion,
        provincia,
      });
      setVendedor(nuevoVendedor);
      sileo.success({
        title: "Vendedor Activado",
        description: "¡Tu cuenta de vendedor ha sido activada!",
      });
      cargarDatosVendedor();
    } catch (err: any) {
      sileo.error({
        title: "Error",
        description: err.response?.data?.message || "Error al registrarse.",
      });
    } finally {
      setRegistroLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="size-8 border-3 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!vendedor) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6">
        <Link
          href="/mi-perfil"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-chartreuse transition-colors font-bold uppercase mb-6"
        >
          <ArrowLeft className="size-3" />
          <span>Volver a Mi Perfil</span>
        </Link>

        <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex size-14 items-center justify-center rounded-full bg-brand-chartreuse/10 text-brand-chartreuse mb-2">
              <Store className="size-7" />
            </div>
            <h1 className="text-2xl font-black text-brand-white">
              Conviértete en Vendedor
            </h1>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              Publica y vende tus palas usadas, equipación, indumentaria o
              contrata tus clases y entrenamientos.
            </p>
          </div>

          <form onSubmit={handleRegistrarVendedor} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Nombre del Perfil o Tienda *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Tienda de Juan, Profesor Gómez, Club Padel Center"
                value={nombreTienda}
                onChange={(e) => setNombreTienda(e.target.value)}
                className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Tipo de Vendedor *
              </label>
              <select
                value={tipoVendedor}
                onChange={(e: any) => setTipoVendedor(e.target.value)}
                className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
              >
                <option value="jugador">
                  Jugador Particular (Venta de equipamiento usado/nuevo)
                </option>
                <option value="club">
                  Club Deportivo (Servicios, canchas, insumos)
                </option>
                <option value="entrenador">
                  Profesor / Entrenador (Clases, academias)
                </option>
                <option value="tienda">Tienda Comercial / Marca</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Provincia *
              </label>
              <input
                type="text"
                required
                placeholder="La Rioja, Córdoba, Buenos Aires..."
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">
                Biografía o Descripción
              </label>
              <textarea
                placeholder="Cuéntale a tus compradores qué ofreces o tu experiencia en el pádel..."
                rows={3}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={registroLoading}
              className="w-full bg-brand-chartreuse disabled:bg-gray-700 text-brand-black font-bold text-sm py-3.5 rounded-xl hover:opacity-95 transition-all cursor-pointer mt-6 shadow-md shadow-brand-chartreuse/10"
            >
              {registroLoading
                ? "Registrando..."
                : "Activar mi Perfil Vendedor"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 md:p-10 max-w-7xl mx-auto text-brand-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-white/5 pb-6">
        <div>
          <Link
            href="/mi-perfil"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-chartreuse transition-colors font-bold uppercase mb-2"
          >
            <ArrowLeft className="size-3" />
            <span>Volver a Mi Perfil</span>
          </Link>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-brand-chartreuse/10 border border-brand-chartreuse/25 text-brand-chartreuse px-2.5 py-0.5 rounded-full">
              Perfil Vendedor ({vendedor.tipo})
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            {vendedor.nombre_tienda}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {vendedor.descripcion || "Administra tus ventas y publicaciones."}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/mi-perfil/vendedor/productos"
            className="border border-brand-white/10 hover:border-brand-white/20 text-brand-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            Mis Productos
          </Link>
          <Link
            href="/mi-perfil/vendedor/productos/nuevo"
            className="bg-brand-chartreuse text-brand-black px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-95 transition-all shadow-md shadow-brand-chartreuse/10"
          >
            Publicar Producto
          </Link>
        </div>
      </div>

      {/* Métricas */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 space-y-2 relative overflow-hidden">
            <div className="size-10 rounded-2xl bg-brand-chartreuse/10 text-brand-chartreuse flex items-center justify-center">
              <DollarSign className="size-5" />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Balance Disponible
            </p>
            <h3 className="text-2xl font-black text-brand-chartreuse">
              ${stats.balance.toLocaleString("es-AR")}
            </h3>
          </div>

          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 space-y-2">
            <div className="size-10 rounded-2xl bg-brand-chartreuse/10 text-brand-chartreuse flex items-center justify-center">
              <TrendingUp className="size-5" />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Ingresos del Mes
            </p>
            <h3 className="text-2xl font-black text-brand-white">
              ${stats.ingresos_mes.toLocaleString("es-AR")}
            </h3>
          </div>

          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 space-y-2">
            <div className="size-10 rounded-2xl bg-brand-chartreuse/10 text-brand-chartreuse flex items-center justify-center">
              <ShoppingBag className="size-5" />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Productos Activos
            </p>
            <h3 className="text-2xl font-black text-brand-white">
              {stats.productos_activos}
            </h3>
          </div>

          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 space-y-2">
            <div className="size-10 rounded-2xl bg-brand-chartreuse/10 text-brand-chartreuse flex items-center justify-center">
              <Star className="size-5" />
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              Valoración Promedio
            </p>
            <h3 className="text-2xl font-black text-brand-white flex items-center gap-1.5">
              <span>{stats.valoracion_promedio}</span>
              <Star className="size-4 text-amber-400 fill-amber-400" />
            </h3>
          </div>
        </div>
      )}

      {/* Ventas Recientes */}
      <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 md:p-8 space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList className="size-5 text-brand-chartreuse" />
          <span>Ventas Recientes</span>
        </h2>

        {ventas.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            Aún no has registrado ninguna venta en la plataforma.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-brand-white/5 text-gray-500 text-xs font-bold uppercase">
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Comprador</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Cantidad</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-white/5">
                {ventas.map((v: any) => (
                  <tr
                    key={v.id}
                    className="hover:bg-brand-white/5 transition-colors"
                  >
                    <td className="py-4 px-4 font-bold text-brand-white">
                      {v.producto?.nombre}
                    </td>
                    <td className="py-4 px-4 text-gray-400">
                      {v.orden?.comprador?.nombre}{" "}
                      {v.orden?.comprador?.apellido}
                    </td>
                    <td className="py-4 px-4 text-gray-400 text-xs">
                      {new Date(v.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-4 px-4 text-gray-300 font-bold">
                      {v.cantidad}
                    </td>
                    <td className="py-4 px-4 text-right text-brand-chartreuse font-black">
                      $
                      {(v.precio_unitario * v.cantidad).toLocaleString("es-AR")}
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

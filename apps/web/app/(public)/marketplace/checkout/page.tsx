"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { MarketplaceService } from "@/utils/services/marketplace";
import {
  ShoppingBag,
  MapPin,
  Phone,
  User,
  FileText,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { sileo } from "sileo";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const ordenIdParams = searchParams.get("orden_id");

  const { items, totalPrecio, vaciarCarrito } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Formulario Datos de Envío
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    setMounted(true);
    // Si el pago es exitoso, vaciar el carrito local
    if (paymentStatus === "success") {
      vaciarCarrito();
    }
  }, [paymentStatus, vaciarCarrito]);

  const handleProcederAlPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      sileo.error({ title: "Error", description: "Tu carrito está vacío." });
      return;
    }

    if (!nombre || !direccion || !telefono) {
      sileo.error({
        title: "Error",
        description: "Por favor completa los campos requeridos.",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Crear orden
      const ordenItems = items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
      }));

      const orden = await MarketplaceService.crearOrden({
        items: ordenItems,
        datos_envio: { nombre, direccion, telefono, notas },
      });

      // 2. Generar preferencia de MercadoPago
      const pref = await MarketplaceService.pagarOrden(orden.id);

      // 3. Redirigir a MercadoPago
      if (pref.initPoint) {
        window.location.href = pref.initPoint;
      } else {
        throw new Error("No se pudo iniciar el checkout.");
      }
    } catch (err: any) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Error al procesar la compra.";
      sileo.error({ title: "Error al pagar", description: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PANTALLAS DE RESULTADO POST-PAGO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (paymentStatus === "success") {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6 space-y-6">
        <div className="inline-flex size-20 items-center justify-center rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/25 text-brand-chartreuse mb-2">
          <CheckCircle className="size-10" />
        </div>
        <h1 className="text-3xl font-black text-brand-white">
          ¡Gracias por tu compra!
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Tu pago ha sido acreditado exitosamente. En breve recibirás una
          notificación de los vendedores para coordinar la entrega o inicio del
          servicio.
        </p>
        {ordenIdParams && (
          <div className="bg-brand-input/40 border border-brand-white/5 rounded-2xl p-4 text-xs text-gray-500 font-bold">
            Orden ID: {ordenIdParams}
          </div>
        )}
        <div className="pt-6 flex flex-col gap-3">
          <Link
            href="/mi-perfil/reservas" // O compras cuando tengamos la pestaña
            className="w-full bg-brand-chartreuse text-brand-black py-3 rounded-xl font-bold text-sm hover:opacity-95 transition-all text-center block"
          >
            Ver mis Compras
          </Link>
          <Link
            href="/marketplace"
            className="w-full border border-brand-white/10 hover:border-brand-white/20 text-brand-white py-3 rounded-xl font-bold text-sm transition-all text-center block"
          >
            Volver al Catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (paymentStatus === "failure") {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6 space-y-6">
        <div className="inline-flex size-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/25 text-red-400 mb-2">
          <XCircle className="size-10" />
        </div>
        <h1 className="text-3xl font-black text-brand-white">Pago Rechazado</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Hubo un problema al procesar la transacción a través de MercadoPago.
          Ningún cargo ha sido efectuado.
        </p>
        <div className="pt-6 flex flex-col gap-3">
          <Link
            href="/marketplace/checkout"
            className="w-full bg-brand-chartreuse text-brand-black py-3 rounded-xl font-bold text-sm hover:opacity-95 transition-all text-center block"
          >
            Reintentar Checkout
          </Link>
          <Link
            href="/marketplace"
            className="w-full border border-brand-white/10 hover:border-brand-white/20 text-brand-white py-3 rounded-xl font-bold text-sm transition-all text-center block"
          >
            Volver al Catálogo
          </Link>
        </div>
      </div>
    );
  }

  if (paymentStatus === "pending") {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-6 space-y-6">
        <div className="inline-flex size-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 mb-2">
          <AlertCircle className="size-10" />
        </div>
        <h1 className="text-3xl font-black text-brand-white">Pago Pendiente</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          El pago se encuentra pendiente de acreditación (ej: pago en efectivo
          Rapipago/PagoFácil). Apenas se confirme, tu orden será procesada
          automáticamente.
        </p>
        <div className="pt-6 flex flex-col gap-3">
          <Link
            href="/marketplace"
            className="w-full bg-brand-chartreuse text-brand-black py-3 rounded-xl font-bold text-sm hover:opacity-95 transition-all text-center block"
          >
            Volver al Catálogo
          </Link>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FORMULARIO Y RESUMEN DE CHECKOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="max-w-full mx-auto px-6 md:px-12 py-10">
      <h1 className="text-3xl font-black tracking-tight mb-8">
        Completar Compra
      </h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-brand-card rounded-3xl border border-brand-white/5">
          <ShoppingBag className="size-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-bold mb-1">No hay items en el carrito</h3>
          <p className="text-sm text-gray-400 max-w-sm mb-6">
            Agrega productos o servicios del catálogo antes de proceder al pago.
          </p>
          <Link
            href="/marketplace"
            className="bg-brand-chartreuse text-brand-black px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all duration-200"
          >
            Ver Catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Formulario de Envío (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 md:p-8 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-brand-white/5 pb-4">
                <MapPin className="size-5 text-brand-chartreuse" />
                <span>Datos del Destinatario y Envío</span>
              </h2>

              <form onSubmit={handleProcederAlPago} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Juan Pérez"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-brand-input border border-brand-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors"
                    />
                    <User className="absolute left-4 top-3.5 size-4 text-gray-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Dirección de Entrega *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Av. Rivadavia 1234, 4to B"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        className="w-full bg-brand-input border border-brand-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors"
                      />
                      <MapPin className="absolute left-4 top-3.5 size-4 text-gray-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Teléfono de Contacto *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="11 2345-6789"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full bg-brand-input border border-brand-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors"
                      />
                      <Phone className="absolute left-4 top-3.5 size-4 text-gray-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">
                    Notas Adicionales (Opcional)
                  </label>
                  <div className="relative">
                    <textarea
                      placeholder="Indicaciones para el repartidor o detalles de reserva de clases..."
                      rows={3}
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      className="w-full bg-brand-input border border-brand-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors resize-none"
                    />
                    <FileText className="absolute left-4 top-3.5 size-4 text-gray-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-chartreuse disabled:bg-gray-700 text-brand-black font-bold text-sm py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer mt-6 shadow-lg shadow-brand-chartreuse/10"
                >
                  <CreditCard className="size-4.5" />
                  <span>
                    {loading ? "Generando pago..." : "Pagar con MercadoPago"}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Resumen de Compra (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 md:p-8 space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-brand-white/5 pb-4">
                <ShoppingBag className="size-5 text-brand-chartreuse" />
                <span>Resumen de Orden</span>
              </h2>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div
                    key={item.productoId}
                    className="flex gap-3 justify-between items-center text-sm"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="relative size-12 rounded-xl overflow-hidden bg-brand-black/35 shrink-0">
                        {item.thumbnailUrl && (
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.nombre}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-brand-white truncate text-xs">
                          {item.nombre}
                        </h4>
                        <span className="text-[10px] text-gray-500 block">
                          Cant: {item.cantidad} x $
                          {item.precio.toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-brand-chartreuse text-xs">
                      ${(item.precio * item.cantidad).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-brand-white/5" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-bold text-brand-white">
                    ${totalPrecio().toLocaleString("es-AR")}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Envío</span>
                  <span className="text-brand-chartreuse font-bold">
                    Gratis
                  </span>
                </div>
                <div className="h-px bg-brand-white/5 my-2" />
                <div className="flex justify-between text-base font-black">
                  <span>Total</span>
                  <span className="text-brand-chartreuse text-lg">
                    ${totalPrecio().toLocaleString("es-AR")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <Suspense
        fallback={
          <div className="min-h-screen bg-brand-black text-brand-white flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="size-10 border-4 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400 font-bold">Cargando...</p>
            </div>
          </div>
        }
      >
        <CheckoutContent />
      </Suspense>
    </div>
  );
}

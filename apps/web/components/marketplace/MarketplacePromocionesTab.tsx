"use client";

import Image from "next/image";
import { Megaphone, Users, Globe, History, Send, ExternalLink } from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import type { AudienciaPromocion, Categoria, Producto } from "@/utils/services/marketplace";

type DestinoPromo = "tienda" | "categoria" | "producto";

interface Props {
  titulo: string;
  mensaje: string;
  audiencia: AudienciaPromocion;
  destino: DestinoPromo;
  categoriaId: string;
  productoId: string;
  categorias: Categoria[];
  productos: Producto[];
  enviando: boolean;
  nombreTienda?: string;
  logoTienda?: string;
  onChangeTitulo: (v: string) => void;
  onChangeMensaje: (v: string) => void;
  onChangeAudiencia: (v: AudienciaPromocion) => void;
  onChangeDestino: (v: DestinoPromo) => void;
  onChangeCategoriaId: (v: string) => void;
  onChangeProductoId: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const audiencias: {
  id: AudienciaPromocion;
  icon: typeof Users;
  title: string;
  desc: string;
}[] = [
  {
    id: "afiliados",
    icon: Users,
    title: "Afiliados de la entidad",
    desc: "Socios y jugadores afiliados a tu club o asociación.",
  },
  {
    id: "plataforma",
    icon: Globe,
    title: "Toda la plataforma",
    desc: "Todos los usuarios registrados en Padel Nexus.",
  },
  {
    id: "compradores_previos",
    icon: History,
    title: "Compradores previos",
    desc: "Quienes ya compraron en tu tienda.",
  },
];

const destinos: { id: DestinoPromo; label: string }[] = [
  { id: "tienda", label: "Toda mi tienda" },
  { id: "categoria", label: "Una categoría (ej. paletas)" },
  { id: "producto", label: "Un producto específico" },
];

export default function MarketplacePromocionesTab({
  titulo,
  mensaje,
  audiencia,
  destino,
  categoriaId,
  productoId,
  categorias,
  productos,
  enviando,
  nombreTienda,
  logoTienda,
  onChangeTitulo,
  onChangeMensaje,
  onChangeAudiencia,
  onChangeDestino,
  onChangeCategoriaId,
  onChangeProductoId,
  onSubmit,
}: Props) {
  const productosActivos = productos.filter((p) => p.activo);
  const categoriaPreview =
    categorias.find((c) => c.id === categoriaId)?.nombre || "categoría seleccionada";
  const productoPreview =
    productosActivos.find((p) => p.id === productoId)?.nombre || "producto seleccionado";

  const destinoPreview =
    destino === "producto"
      ? `Abrirá ${productoPreview}`
      : destino === "categoria"
        ? `Abrirá ${categoriaPreview} en ${nombreTienda || "tu tienda"}`
        : `Abrirá la tienda de ${nombreTienda || "tu entidad"}`;

  const tituloPreview = titulo || "Título de tu promoción";
  const mensajePreview =
    mensaje || "El mensaje aparecerá aquí como lo verán los destinatarios.";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
      <form onSubmit={onSubmit} className="xl:col-span-8 space-y-6">
        <div className="rounded-3xl border border-brand-white/5 bg-gradient-to-br from-brand-card to-brand-black p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-brand-chartreuse/15 flex items-center justify-center">
              <Megaphone className="size-6 text-brand-chartreuse" />
            </div>
            <div>
              <h3 className="font-black text-lg">Campaña promocional</h3>
              <p className="text-xs text-gray-500">
                Enviá una notificación push a tu audiencia seleccionada.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">¿A quién enviamos?</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {audiencias.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onChangeAudiencia(a.id)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    audiencia === a.id
                      ? "border-brand-chartreuse bg-brand-chartreuse/10 ring-1 ring-brand-chartreuse/30"
                      : "border-brand-white/10 bg-brand-black/30 hover:border-brand-white/20"
                  }`}
                >
                  <a.icon
                    className={`size-5 mb-2 ${
                      audiencia === a.id ? "text-brand-chartreuse" : "text-gray-500"
                    }`}
                  />
                  <p className="text-sm font-bold">{a.title}</p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Título</label>
            <input
              required
              value={titulo}
              onChange={(e) => onChangeTitulo(e.target.value)}
              placeholder="Ej: 20% off en paletas esta semana"
              className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Mensaje</label>
            <textarea
              required
              value={mensaje}
              onChange={(e) => onChangeMensaje(e.target.value)}
              placeholder="Escribí el detalle de la promo, vigencia y cómo aprovecharla..."
              rows={5}
              className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm resize-none focus:border-brand-chartreuse focus:outline-none"
            />
          </div>

          <div className="space-y-3 p-4 rounded-2xl border border-brand-white/5 bg-brand-black/30">
            <label className="text-xs font-bold text-gray-500 uppercase">
              ¿A dónde lleva la notificación?
            </label>
            <CustomDropdown
              value={destino}
              onChange={(v) => onChangeDestino(v as DestinoPromo)}
              placeholder="Destino al tocar"
              options={destinos.map((d) => ({ value: d.id, label: d.label }))}
            />
            {destino === "categoria" && (
              <CustomDropdown
                value={categoriaId}
                onChange={onChangeCategoriaId}
                placeholder="Elegí categoría"
                options={categorias.map((c) => ({ value: c.id, label: c.nombre }))}
              />
            )}
            {destino === "producto" && (
              <CustomDropdown
                value={productoId}
                onChange={onChangeProductoId}
                placeholder="Elegí publicación"
                options={productosActivos.map((p) => ({
                  value: p.id,
                  label: p.nombre,
                }))}
              />
            )}
            <p className="text-[11px] text-gray-600">{destinoPreview}</p>
          </div>

          <button
            type="submit"
            disabled={
              enviando ||
              (destino === "categoria" && !categoriaId) ||
              (destino === "producto" && !productoId)
            }
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-chartreuse disabled:opacity-50 text-brand-black font-black px-8 py-4 rounded-xl cursor-pointer shadow-lg shadow-brand-chartreuse/10"
          >
            {enviando ? (
              <>Enviando...</>
            ) : (
              <>
                <Send className="size-4" />
                Enviar campaña
              </>
            )}
          </button>
        </div>
      </form>

      <div className="xl:col-span-4 space-y-4">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
          Vista previa de notificación
        </p>

        {/* Réplica del ítem en NotificationCenter (promo marketplace) */}
        <div className="rounded-2xl border border-brand-white/10 bg-brand-black/96 overflow-hidden shadow-2xl">
          <div className="px-3 py-2 border-b border-brand-white/5 flex items-center gap-2">
            <Megaphone className="size-3.5 text-brand-chartreuse" />
            <span className="text-[11px] font-bold text-gray-400">Centro de notificaciones</span>
          </div>
          <div className="relative flex gap-3 px-4 py-3.5 bg-brand-chartreuse/5">
            <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r bg-brand-chartreuse" />
            <div className="mt-0.5 shrink-0">
              <Megaphone className="size-4 text-brand-chartreuse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <span className="text-[13px] font-semibold text-brand-white leading-snug">
                  {tituloPreview}
                </span>
                <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">Ahora</span>
              </div>
              <p className="text-[12px] text-gray-400 leading-relaxed whitespace-pre-line">
                {mensajePreview}
              </p>
              {nombreTienda && (
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Enviado desde ·{" "}
                  <span className="text-brand-chartreuse/90 font-medium inline-flex items-center gap-1">
                    {logoTienda && (
                      <span className="relative inline-block size-3.5 rounded overflow-hidden align-middle">
                        <Image
                          src={logoTienda}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized={logoTienda.startsWith("data:")}
                        />
                      </span>
                    )}
                    {nombreTienda}
                  </span>
                </p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide bg-brand-chartreuse/20 text-brand-chartreuse">
                  Promo
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-chartreuse">
                  <ExternalLink className="size-3" />
                  Abrir
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-600 px-1">
          Al tocar → {destinoPreview}
        </p>

        <div className="rounded-2xl border border-brand-white/5 bg-brand-card/50 p-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Tip: si la promo es de paletas, elegí la categoría correspondiente para que al
            tocar la notificación el usuario vea directamente esos productos de tu tienda.
          </p>
        </div>
      </div>
    </div>
  );
}

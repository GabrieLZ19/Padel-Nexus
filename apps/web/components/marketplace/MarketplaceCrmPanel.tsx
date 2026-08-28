"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  TrendingUp,
  Megaphone,
  Star,
  DollarSign,
  Store,
  Package,
  LayoutGrid,
} from "lucide-react";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal from "@/components/ui/FeedbackModal";
import MarketplaceTiendaTab from "./MarketplaceTiendaTab";
import MarketplaceProductoForm from "./MarketplaceProductoForm";
import MarketplaceVentasTab from "./MarketplaceVentasTab";
import MarketplacePublicacionesTab from "./MarketplacePublicacionesTab";
import MarketplacePromocionesTab from "./MarketplacePromocionesTab";
import {
  MarketplaceService,
  type AudienciaPromocion,
  type EntidadMarketplaceTipo,
  type EntidadRef,
  type Producto,
  type Vendedor,
} from "@/utils/services/marketplace";

type TabId = "tienda" | "productos" | "ventas" | "promociones";

type FeedbackState = {
  isOpen: boolean;
  title: string;
  description: string;
  type?: "success" | "danger" | "warning" | "info" | "error";
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm?: () => void | Promise<void>;
};

interface MarketplaceCrmPanelProps {
  modoClub?: boolean;
  mostrarModeracion?: boolean;
}

const TAB_CONFIG: { id: TabId; label: string; icon: typeof Store }[] = [
  { id: "tienda", label: "Mi tienda", icon: Store },
  { id: "productos", label: "Publicaciones", icon: LayoutGrid },
  { id: "ventas", label: "Ventas", icon: TrendingUp },
  { id: "promociones", label: "Promociones", icon: Megaphone },
];

export default function MarketplaceCrmPanel({
  modoClub = false,
  mostrarModeracion = false,
}: MarketplaceCrmPanelProps) {
  const [tab, setTab] = useState<TabId>("tienda");
  const [loading, setLoading] = useState(true);
  const [entidades, setEntidades] = useState<{
    clubes: { id: string; nombre: string; provincia?: string }[];
    asociaciones: { id: string; nombre: string; sigla?: string }[];
    federaciones: { id: string; nombre: string; sigla?: string }[];
  }>({ clubes: [], asociaciones: [], federaciones: [] });

  const [entidadTipo, setEntidadTipo] = useState<EntidadMarketplaceTipo>("club");
  const [entidadId, setEntidadId] = useState("");
  const [tienda, setTienda] = useState<Vendedor | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  const [nombreTienda, setNombreTienda] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [provincia, setProvincia] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoEliminado, setLogoEliminado] = useState(false);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Producto | null>(null);

  const [promoTitulo, setPromoTitulo] = useState("");
  const [promoMensaje, setPromoMensaje] = useState("");
  const [promoAudiencia, setPromoAudiencia] = useState<AudienciaPromocion>("afiliados");
  const [promoDestino, setPromoDestino] = useState<"tienda" | "categoria" | "producto">("categoria");
  const [promoCategoriaId, setPromoCategoriaId] = useState("");
  const [promoProductoId, setPromoProductoId] = useState("");
  const [promoEnviando, setPromoEnviando] = useState(false);

  const [vendedoresMod, setVendedoresMod] = useState<any[]>([]);
  const [vistaModeracion, setVistaModeracion] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackState>({
    isOpen: false,
    title: "",
    description: "",
    type: "warning",
  });

  const cerrarFeedback = () =>
    setFeedbackModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));

  const entidadRef: EntidadRef | null = useMemo(() => {
    if (!entidadId) return null;
    return { entidad_tipo: entidadTipo, entidad_id: entidadId };
  }, [entidadTipo, entidadId]);

  const nombreEntidadSeleccionada = useMemo(() => {
    if (entidadTipo === "club") {
      return entidades.clubes.find((c) => c.id === entidadId)?.nombre;
    }
    if (entidadTipo === "asociacion") {
      return entidades.asociaciones.find((a) => a.id === entidadId)?.nombre;
    }
    return entidades.federaciones.find((f) => f.id === entidadId)?.nombre;
  }, [entidadTipo, entidadId, entidades]);

  const opcionesEntidad = useMemo(() => {
    if (entidadTipo === "club") {
      return entidades.clubes.map((c) => ({ value: c.id, label: c.nombre }));
    }
    if (entidadTipo === "asociacion") {
      return entidades.asociaciones.map((a) => ({
        value: a.id,
        label: a.sigla ? `${a.nombre} (${a.sigla})` : a.nombre,
      }));
    }
    return entidades.federaciones.map((f) => ({
      value: f.id,
      label: f.sigla ? `${f.nombre} (${f.sigla})` : f.nombre,
    }));
  }, [entidadTipo, entidades]);

  const cargarEntidades = useCallback(async () => {
    const data = await MarketplaceService.crmGetEntidades();
    setEntidades(data);
    if (modoClub && data.clubes.length === 1) {
      setEntidadTipo("club");
      setEntidadId(data.clubes[0].id);
    } else if (!entidadId && data.clubes.length > 0) {
      setEntidadTipo("club");
      setEntidadId(data.clubes[0].id);
    }
  }, [modoClub, entidadId]);

  const cargarTienda = useCallback(async (ref: EntidadRef) => {
    const tiendaData = await MarketplaceService.crmGetTienda(ref);
    setTienda(tiendaData);
    if (tiendaData) {
      setNombreTienda(tiendaData.nombre_tienda);
      setDescripcion(tiendaData.descripcion || "");
      setProvincia(tiendaData.provincia || "");
      setLogoPreview(null);
      setLogoEliminado(false);
      const [statsData, prods, ventasData] = await Promise.all([
        MarketplaceService.crmGetEstadisticas(ref),
        MarketplaceService.crmGetProductos(ref),
        MarketplaceService.crmGetVentas(ref),
      ]);
      setStats(statsData);
      setProductos(prods.productos || []);
      setVentas(ventasData.ventas || []);
    } else {
      setStats(null);
      setProductos([]);
      setVentas([]);
      setNombreTienda(nombreEntidadSeleccionada || "");
    }
  }, [nombreEntidadSeleccionada]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      cargarEntidades(),
      MarketplaceService.getCategorias().then(setCategorias),
      mostrarModeracion
        ? MarketplaceService.adminGetVendedores().then(setVendedoresMod)
        : Promise.resolve(),
    ])
      .catch(() => {
        sileo.error({ title: "Error", description: "No se pudo cargar el módulo marketplace." });
      })
      .finally(() => setLoading(false));
  }, [cargarEntidades, mostrarModeracion]);

  useEffect(() => {
    if (!entidadRef) return;
    cargarTienda(entidadRef).catch(console.error);
  }, [entidadRef, cargarTienda]);

  useEffect(() => {
    if (!tienda && nombreEntidadSeleccionada) {
      setNombreTienda(nombreEntidadSeleccionada);
    }
  }, [tienda, nombreEntidadSeleccionada]);

  const handleChangeLogo = (base64: string | null) => {
    if (base64) {
      setLogoPreview(base64);
      setLogoEliminado(false);
    } else {
      setLogoPreview(null);
      setLogoEliminado(true);
    }
  };

  const logoPayload = () => {
    if (logoPreview) return { logo_base64: logoPreview };
    if (logoEliminado) return { logo_url: null };
    return {};
  };

  const handleRegistrarTienda = async () => {
    if (!entidadRef) return;
    try {
      await MarketplaceService.crmRegistrarTienda(entidadRef, {
        nombre_tienda: nombreTienda || nombreEntidadSeleccionada || "Mi tienda",
        descripcion,
        provincia,
        ...logoPayload(),
      });
      sileo.success({
        title: "Tienda publicada",
        description: "Tu tienda ya está visible en el marketplace.",
      });
      await cargarTienda(entidadRef);
      setTab("productos");
    } catch (err: any) {
      sileo.error({
        title: "Error",
        description: err.response?.data?.message || "No se pudo publicar la tienda.",
      });
    }
  };

  const handleGuardarTienda = async () => {
    if (!entidadRef || !tienda) return;
    try {
      await MarketplaceService.crmActualizarTienda(entidadRef, {
        nombre_tienda: nombreTienda,
        descripcion,
        provincia,
        ...logoPayload(),
      });
      sileo.success({ title: "Guardado", description: "Tienda actualizada." });
      await cargarTienda(entidadRef);
    } catch (err: any) {
      sileo.error({ title: "Error", description: err.response?.data?.message || "Error al actualizar." });
    }
  };

  const handleSaveProducto = async (payload: Parameters<
    typeof MarketplaceService.crmCrearProducto
  >[1] & { imagenes_existentes?: string[]; imagenes_nuevas_base64?: string[] }) => {
    if (!entidadRef) return;
    try {
      if (editProduct) {
        await MarketplaceService.crmEditarProducto(entidadRef, editProduct.id, payload);
        sileo.success({ title: "Actualizado", description: "Publicación actualizada." });
      } else {
        await MarketplaceService.crmCrearProducto(entidadRef, payload);
        sileo.success({ title: "Publicado", description: "Ya está en el marketplace." });
      }
      setShowProductForm(false);
      setEditProduct(null);
      await cargarTienda(entidadRef);
    } catch (err: any) {
      sileo.error({
        title: "Error al guardar",
        description: err.response?.data?.message || "No se pudo guardar la publicación.",
      });
    }
  };

  const handleDesactivarProducto = (id: string) => {
    if (!entidadRef) return;
    setFeedbackModal({
      isOpen: true,
      type: "warning",
      title: "¿Ocultar publicación?",
      description:
        "Dejará de mostrarse en el catálogo público. Podés reactivarla cuando quieras.",
      confirmText: "Ocultar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        setFeedbackModal((p) => ({ ...p, isLoading: true }));
        try {
          await MarketplaceService.crmDesactivarProducto(entidadRef, id);
          sileo.success({ title: "Oculto", description: "Publicación desactivada." });
          await cargarTienda(entidadRef);
          cerrarFeedback();
        } catch (err: any) {
          sileo.error({ title: "Error", description: err.response?.data?.message });
          setFeedbackModal((p) => ({ ...p, isLoading: false }));
        }
      },
    });
  };

  const handleActivarProducto = async (id: string) => {
    if (!entidadRef) return;
    try {
      await MarketplaceService.crmActivarProducto(entidadRef, id);
      sileo.success({ title: "Activado", description: "Publicación visible en el catálogo." });
      await cargarTienda(entidadRef);
    } catch (err: any) {
      sileo.error({ title: "Error", description: err.response?.data?.message });
    }
  };

  const handleQuitarDescuento = (p: Producto) => {
    if (!entidadRef) return;
    setFeedbackModal({
      isOpen: true,
      type: "warning",
      title: "¿Quitar descuento?",
      description: `Se eliminará el precio tachado de "${p.nombre}". El precio de venta se mantiene.`,
      confirmText: "Quitar descuento",
      cancelText: "Cancelar",
      onConfirm: async () => {
        setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await MarketplaceService.crmEditarProducto(entidadRef, p.id, {
            precio_anterior: null,
          });
          sileo.success({
            title: "Descuento quitado",
            description: "Se eliminó el precio tachado.",
          });
          await cargarTienda(entidadRef);
          cerrarFeedback();
        } catch (err: any) {
          sileo.error({ title: "Error", description: err.response?.data?.message });
          setFeedbackModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleEnviarPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadRef || !tienda) return;
    if (promoDestino === "categoria" && !promoCategoriaId) {
      sileo.error({ title: "Categoría requerida", description: "Elegí a qué categoría debe llevar la promo." });
      return;
    }
    if (promoDestino === "producto" && !promoProductoId) {
      sileo.error({ title: "Producto requerido", description: "Elegí qué publicación debe abrir la notificación." });
      return;
    }
    setPromoEnviando(true);
    try {
      const res = await MarketplaceService.crmEnviarPromocion(entidadRef, {
        titulo: promoTitulo,
        mensaje: promoMensaje,
        audiencia: promoAudiencia,
        categoria_id: promoDestino === "categoria" ? promoCategoriaId : undefined,
        producto_id: promoDestino === "producto" ? promoProductoId : undefined,
      });
      sileo.success({
        title: "Campaña enviada",
        description: `${res.total_destinatarios} personas notificadas.`,
      });
      setPromoTitulo("");
      setPromoMensaje("");
      setPromoCategoriaId("");
      setPromoProductoId("");
    } catch (err: any) {
      sileo.error({ title: "Error", description: err.response?.data?.message });
    } finally {
      setPromoEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="size-10 border-4 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-brand-white w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-brand-white/5 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <ShoppingBag className="size-8 text-brand-chartreuse" />
            Marketplace
          </h1>
          <p className="text-gray-400 text-sm max-w-xl">
            Gestioná la tienda oficial de tu entidad: publicaciones, ventas y campañas promocionales.
          </p>
        </div>
        {mostrarModeracion && (
          <button
            type="button"
            onClick={() => setVistaModeracion((v) => !v)}
            className="px-4 py-2 rounded-xl border border-brand-white/10 text-xs font-bold text-gray-400 hover:text-brand-white cursor-pointer"
          >
            {vistaModeracion ? "Volver a gestión" : "Moderación global"}
          </button>
        )}
      </div>

      {vistaModeracion ? (
        <ModeracionTabla
          vendedores={vendedoresMod}
          onRefresh={() => MarketplaceService.adminGetVendedores().then(setVendedoresMod)}
        />
      ) : (
        <>
          {!modoClub && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-brand-card border border-brand-white/5 rounded-2xl p-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                <CustomDropdown
                  value={entidadTipo}
                  onChange={(v) => {
                    setEntidadTipo(v as EntidadMarketplaceTipo);
                    setEntidadId("");
                  }}
                  placeholder="Tipo de entidad"
                  options={[
                    { value: "club", label: "Club" },
                    { value: "asociacion", label: "Asociación" },
                    { value: "federacion", label: "Federación" },
                  ]}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Entidad</label>
                <CustomDropdown
                  value={entidadId}
                  onChange={setEntidadId}
                  placeholder="Seleccioná la entidad"
                  options={opcionesEntidad}
                />
              </div>
            </div>
          )}

          {entidadRef && (
            <>
              {/* Tabs */}
              <div className="flex flex-wrap gap-2 p-1.5 bg-brand-black/40 border border-brand-white/5 rounded-2xl w-full sm:w-fit">
                {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      tab === id
                        ? "bg-brand-chartreuse text-brand-black shadow-md shadow-brand-chartreuse/20"
                        : "text-gray-400 hover:text-brand-white hover:bg-brand-white/5"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Stats — full width */}
              {stats && tienda && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Balance", value: `$${Number(stats.balance).toLocaleString("es-AR")}`, icon: DollarSign },
                    { label: "Ventas", value: stats.total_ventas, icon: TrendingUp },
                    { label: "Publicaciones activas", value: stats.productos_activos, icon: Package },
                    { label: "Reputación", value: stats.valoracion_promedio || "—", icon: Star },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center gap-4 bg-brand-card border border-brand-white/5 rounded-2xl p-4"
                    >
                      <div className="size-10 rounded-xl bg-brand-chartreuse/10 flex items-center justify-center shrink-0">
                        <m.icon className="size-4 text-brand-chartreuse" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold">{m.label}</p>
                        <p className="text-xl font-black">{m.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "tienda" && (
                <MarketplaceTiendaTab
                  tienda={tienda}
                  nombreEntidad={nombreEntidadSeleccionada}
                  nombreTienda={nombreTienda}
                  descripcion={descripcion}
                  provincia={provincia}
                  logoUrl={logoEliminado ? undefined : (tienda?.logo_url ?? undefined)}
                  logoPreview={logoPreview || undefined}
                  onChangeNombre={setNombreTienda}
                  onChangeDescripcion={setDescripcion}
                  onChangeProvincia={setProvincia}
                  onChangeLogo={handleChangeLogo}
                  onPublicar={handleRegistrarTienda}
                  onGuardar={handleGuardarTienda}
                />
              )}

              {tab === "productos" && (
                <div className="space-y-5">
                  {!tienda ? (
                    <div className="rounded-2xl border border-dashed border-brand-white/10 p-10 text-center">
                      <p className="text-gray-500 text-sm">
                        Primero publicá tu tienda en la pestaña{" "}
                        <button type="button" onClick={() => setTab("tienda")} className="text-brand-chartreuse font-bold cursor-pointer">
                          Mi tienda
                        </button>
                        .
                      </p>
                    </div>
                  ) : (
                    <MarketplacePublicacionesTab
                      productos={productos}
                      onCrear={() => {
                        setEditProduct(null);
                        setShowProductForm(true);
                      }}
                      onEditar={(p) => {
                        setEditProduct(p);
                        setShowProductForm(true);
                      }}
                      onDesactivar={handleDesactivarProducto}
                      onActivar={handleActivarProducto}
                      onQuitarDescuento={handleQuitarDescuento}
                    />
                  )}
                </div>
              )}

              {tab === "ventas" && (
                !tienda ? (
                  <p className="text-gray-500 text-sm">Publicá tu tienda para registrar ventas.</p>
                ) : (
                  <MarketplaceVentasTab ventas={ventas} stats={stats} />
                )
              )}

              {tab === "promociones" && (
                !tienda ? (
                  <p className="text-gray-500 text-sm">Publicá tu tienda para enviar promociones.</p>
                ) : (
                  <MarketplacePromocionesTab
                    titulo={promoTitulo}
                    mensaje={promoMensaje}
                    audiencia={promoAudiencia}
                    destino={promoDestino}
                    categoriaId={promoCategoriaId}
                    productoId={promoProductoId}
                    categorias={categorias}
                    productos={productos}
                    enviando={promoEnviando}
                    nombreTienda={tienda.nombre_tienda}
                    logoTienda={logoPreview || tienda.logo_url || undefined}
                    onChangeTitulo={setPromoTitulo}
                    onChangeMensaje={setPromoMensaje}
                    onChangeAudiencia={setPromoAudiencia}
                    onChangeDestino={setPromoDestino}
                    onChangeCategoriaId={setPromoCategoriaId}
                    onChangeProductoId={setPromoProductoId}
                    onSubmit={handleEnviarPromo}
                  />
                )
              )}
            </>
          )}
        </>
      )}

      {showProductForm && entidadRef && (
        <MarketplaceProductoForm
          categorias={categorias}
          editId={editProduct?.id}
          initial={
            editProduct
              ? {
                  nombre: editProduct.nombre,
                  descripcion: editProduct.descripcion,
                  precio: editProduct.precio,
                  precio_anterior: editProduct.precio_anterior,
                  stock: editProduct.stock,
                  marca: editProduct.marca,
                  categoria_id: editProduct.categoria_id,
                  tipo: editProduct.tipo,
                  modalidad_servicio: editProduct.modalidad_servicio,
                  ubicacion_servicio: editProduct.ubicacion_servicio,
                  imagenes: editProduct.imagenes,
                }
              : undefined
          }
          onCancel={() => {
            setShowProductForm(false);
            setEditProduct(null);
          }}
          onSave={handleSaveProducto}
        />
      )}

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={cerrarFeedback}
        title={feedbackModal.title}
        description={feedbackModal.description}
        type={feedbackModal.type}
        confirmText={feedbackModal.confirmText}
        cancelText={feedbackModal.cancelText}
        isLoading={feedbackModal.isLoading}
        onConfirm={
          feedbackModal.onConfirm
            ? () => {
                void feedbackModal.onConfirm?.();
              }
            : undefined
        }
      />
    </div>
  );
}

function ModeracionTabla({
  vendedores,
  onRefresh,
}: {
  vendedores: any[];
  onRefresh: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [suspendId, setSuspendId] = useState<string | null>(null);

  const handleSuspender = async () => {
    if (!suspendId || !motivo) return;
    try {
      await MarketplaceService.adminSuspenderVendedor(suspendId, motivo);
      sileo.success({ title: "Suspendido", description: "Tienda suspendida." });
      setSuspendId(null);
      setMotivo("");
      onRefresh();
    } catch (err: any) {
      sileo.error({ title: "Error", description: err.response?.data?.message });
    }
  };

  return (
    <div className="bg-brand-card border border-brand-white/5 rounded-3xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-white/5 text-gray-500 text-xs uppercase">
            <th className="py-3 px-4 text-left">Tienda</th>
            <th className="py-3 px-4 text-left">Entidad</th>
            <th className="py-3 px-4 text-left">Estado</th>
            <th className="py-3 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {vendedores.map((v) => (
            <tr key={v.id} className="border-b border-brand-white/5">
              <td className="py-3 px-4 font-bold">{v.nombre_tienda}</td>
              <td className="py-3 px-4 text-gray-400 capitalize">
                {v.entidad_nombre || v.entidad_tipo || "—"}
              </td>
              <td className="py-3 px-4 capitalize">{v.estado}</td>
              <td className="py-3 px-4 text-right">
                {v.estado === "activo" ? (
                  <button type="button" onClick={() => setSuspendId(v.id)} className="text-red-400 text-xs font-bold cursor-pointer">
                    Suspender
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => MarketplaceService.adminReactivarVendedor(v.id).then(onRefresh)}
                    className="text-brand-chartreuse text-xs font-bold cursor-pointer"
                  >
                    Reactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {suspendId && (
        <div className="p-4 border-t border-brand-white/5 space-y-3">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo de suspensión"
            rows={2}
            className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleSuspender} className="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
              Confirmar
            </button>
            <button type="button" onClick={() => setSuspendId(null)} className="text-gray-400 text-xs cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

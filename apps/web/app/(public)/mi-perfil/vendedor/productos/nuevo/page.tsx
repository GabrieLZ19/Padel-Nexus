"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MarketplaceService, Categoria } from "@/utils/services/marketplace";
import { 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Eye, 
  FileText, 
  Sparkles,
  ShoppingBag
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { sileo } from "sileo";

function FormularioProductoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit_id");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [datosCargados, setDatosCargados] = useState(false);

  // Formulario
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState(0);
  const [precioAnterior, setPrecioAnterior] = useState<number | undefined>(undefined);
  const [stock, setStock] = useState(0);
  const [marca, setMarca] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [tipo, setTipo] = useState<"producto" | "servicio">("producto");
  const [modalidadServicio, setModalidadServicio] = useState<"presencial" | "online" | "ambas">("presencial");
  const [ubicacionServicio, setUbicacionServicio] = useState("");

  // Carga de imágenes
  const [imagenesExistentes, setImagenesExistentes] = useState<string[]>([]);
  const [imagenesNuevasBase64, setImagenesNuevasBase64] = useState<string[]>([]);
  const [previewsNuevas, setPreviewsNuevas] = useState<string[]>([]);

  useEffect(() => {
    MarketplaceService.getCategorias()
      .then(setCategorias)
      .catch(console.error);

    if (editId) {
      setLoading(true);
      MarketplaceService.getProducto(editId)
        .then((prod) => {
          setNombre(prod.nombre);
          setDescripcion(prod.descripcion || "");
          setPrecio(prod.precio);
          setPrecioAnterior(prod.precio_anterior || undefined);
          setStock(prod.stock);
          setMarca(prod.marca || "");
          setCategoriaId(prod.categoria_id);
          setTipo(prod.tipo);
          setModalidadServicio(prod.modalidad_servicio || "presencial");
          setUbicacionServicio(prod.ubicacion_servicio || "");
          setImagenesExistentes(prod.imagenes || []);
          setDatosCargados(true);
        })
        .catch((err) => {
          console.error(err);
          sileo.error({ title: "Error", description: "Error al cargar producto para editar." });
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDatosCargados(true);
    }
  }, [editId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const espacioDisponible = 5 - (imagenesExistentes.length + imagenesNuevasBase64.length);
    if (files.length > espacioDisponible) {
      sileo.error({ title: "Límite Excedido", description: `Solo puedes subir hasta 5 imágenes en total. Espacio disponible: ${espacioDisponible}` });
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        sileo.error({ title: "Formato inválido", description: "Por favor selecciona solo imágenes." });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        sileo.error({ title: "Archivo Grande", description: "La imagen excede el límite de 5MB." });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagenesNuevasBase64((prev) => [...prev, base64String]);
        setPreviewsNuevas((prev) => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImagenExistente = (index: number) => {
    setImagenesExistentes(imagenesExistentes.filter((_, i) => i !== index));
  };

  const removeImagenNueva = (index: number) => {
    setImagenesNuevasBase64(imagenesNuevasBase64.filter((_, i) => i !== index));
    setPreviewsNuevas(previewsNuevas.filter((_, i) => i !== index));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaId) {
      sileo.error({ title: "Categoría requerida", description: "Por favor selecciona una categoría." });
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        await MarketplaceService.editarProducto(editId, {
          categoria_id: categoriaId,
          nombre,
          descripcion,
          precio,
          precio_anterior: precioAnterior || undefined,
          stock: tipo === "servicio" ? 0 : stock,
          marca,
          tipo,
          modalidad_servicio: tipo === "servicio" ? modalidadServicio : undefined,
          ubicacion_servicio: tipo === "servicio" ? ubicacionServicio : undefined,
          imagenes_existentes: imagenesExistentes,
          imagenes_nuevas_base64: imagenesNuevasBase64
        });
        sileo.success({ title: "Guardado", description: "¡Publicación actualizada con éxito!" });
      } else {
        const vendedor = await MarketplaceService.getPerfilVendedor();
        if (!vendedor) throw new Error("No estás registrado como vendedor.");

        await MarketplaceService.crearProducto({
          categoria_id: categoriaId,
          nombre,
          descripcion,
          precio,
          precio_anterior: precioAnterior || undefined,
          stock: tipo === "servicio" ? 0 : stock,
          marca,
          tipo,
          modalidad_servicio: tipo === "servicio" ? modalidadServicio : undefined,
          ubicacion_servicio: tipo === "servicio" ? ubicacionServicio : undefined,
          imagenes_base64: imagenesNuevasBase64
        });
        sileo.success({ title: "Publicado", description: "¡Producto publicado con éxito!" });
      }
      router.push("/mi-perfil/vendedor/productos");
    } catch (err: any) {
      console.error(err);
      sileo.error({ title: "Error", description: err.response?.data?.message || "Error al guardar el producto." });
    } finally {
      setLoading(false);
    }
  };

  const previewImg = previewsNuevas[0] || imagenesExistentes[0] || "";

  return (
    <div className="space-y-8 p-6 md:p-10 max-w-7xl mx-auto text-brand-white">
      {/* Header */}
      <div className="border-b border-brand-white/5 pb-6 space-y-1">
        <Link
          href="/mi-perfil/vendedor/productos"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-chartreuse transition-colors font-bold uppercase"
        >
          <ArrowLeft className="size-3" />
          <span>Volver a Mis Publicaciones</span>
        </Link>
        <h1 className="text-3xl font-black tracking-tight">
          {editId ? "Editar Publicación" : "Nueva Publicación"}
        </h1>
        <p className="text-gray-400 text-sm">Crea un artículo o servicio deportivo optimizado para el marketplace.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Formulario */}
        <form onSubmit={handleGuardar} className="lg:col-span-8 space-y-6">
          <div className="bg-brand-card border border-brand-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Oferta</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTipo("producto"); setStock(1); }}
                    className={`py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      tipo === "producto"
                        ? "bg-brand-chartreuse/10 border-brand-chartreuse/35 text-brand-chartreuse"
                        : "bg-brand-input border-brand-white/5 text-gray-400"
                    }`}
                  >
                    Artículo Físico
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTipo("servicio"); setStock(0); }}
                    className={`py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      tipo === "servicio"
                        ? "bg-brand-chartreuse/10 border-brand-chartreuse/35 text-brand-chartreuse"
                        : "bg-brand-input border-brand-white/5 text-gray-400"
                    }`}
                  >
                    Clase / Servicio
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Categoría</label>
                <select
                  required
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
                >
                  <option value="">Selecciona categoría</option>
                  {categorias
                    .filter((c) => c.tipo === tipo)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Nombre del Producto / Clase *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pala Vertex 04 Control, Clase Particular 1 Hora"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Marca (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Bullpadel, Head, Wilson"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Descripción Detallada</label>
              <textarea
                placeholder="Describe los detalles, condiciones, talle, estado del producto o temario de la academia..."
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Precio ($ ARS) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={precio || ""}
                  onChange={(e) => setPrecio(Number(e.target.value))}
                  className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Precio Anterior (Descuento)</label>
                <input
                  type="number"
                  placeholder="Ej: 215000"
                  value={precioAnterior || ""}
                  onChange={(e) => setPrecioAnterior(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
                />
              </div>

              {tipo === "producto" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Stock *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={stock || ""}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
                  />
                </div>
              )}
            </div>

            {tipo === "servicio" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-brand-black/25 p-5 rounded-2xl border border-brand-white/5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-chartreuse uppercase">Modalidad del Servicio *</label>
                  <select
                    value={modalidadServicio}
                    onChange={(e: any) => setModalidadServicio(e.target.value)}
                    className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="online">Online / Remoto</option>
                    <option value="ambas">Ambas modalidades</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-chartreuse uppercase">Lugar de Prestación *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Club Padel Nexus Cancha 3, Centro Deportivo"
                    value={ubicacionServicio}
                    onChange={(e) => setUbicacionServicio(e.target.value)}
                    className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm focus:border-brand-chartreuse focus:outline-none transition-colors text-brand-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-400 uppercase block">Galería del Producto (Máximo 5 fotos)</label>
              
              <div className="flex flex-wrap gap-4">
                {(imagenesExistentes.length + imagenesNuevasBase64.length) < 5 && (
                  <label className="size-24 rounded-2xl border-2 border-dashed border-brand-white/10 hover:border-brand-chartreuse/40 flex flex-col items-center justify-center text-gray-500 hover:text-brand-chartreuse transition-colors cursor-pointer bg-brand-input/30">
                    <Upload className="size-5 mb-1" />
                    <span className="text-[10px] font-bold">Subir</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}

                {imagenesExistentes.map((img, i) => (
                  <div key={`ext-${i}`} className="relative size-24 rounded-2xl overflow-hidden border border-brand-white/5 group">
                    <Image src={img} alt="existente" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImagenExistente(i)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black border border-brand-white/10 size-6 rounded-full flex items-center justify-center text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}

                {previewsNuevas.map((img, i) => (
                  <div key={`new-${i}`} className="relative size-24 rounded-2xl overflow-hidden border border-brand-white/5 group">
                    <Image src={img} alt="nueva" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImagenNueva(i)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black border border-brand-white/10 size-6 rounded-full flex items-center justify-center text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-chartreuse disabled:bg-gray-700 text-brand-black font-bold text-sm py-4 rounded-xl hover:opacity-95 transition-all cursor-pointer shadow-lg shadow-brand-chartreuse/10 flex items-center justify-center gap-2"
          >
            <Sparkles className="size-4" />
            <span>{editId ? "Guardar Cambios" : "Publicar Ahora"}</span>
          </button>
        </form>

        {/* PREVIEW EN TIEMPO REAL */}
        <aside className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 pl-2">
            <Eye className="size-4" />
            <span>Vista Previa Card</span>
          </h3>

          <div className="bg-brand-card border border-brand-white/5 rounded-3xl overflow-hidden shadow-lg select-none pointer-events-none">
            <div className="relative aspect-square w-full bg-brand-black/35 flex items-center justify-center">
              {previewImg ? (
                <Image src={previewImg} alt="preview" fill className="object-cover" />
              ) : (
                <ShoppingBag className="size-16 text-gray-700" />
              )}
            </div>
            
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <span>{marca || "Marca"}</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-brand-white/5 text-gray-400 capitalize">
                  {tipo}
                </span>
              </div>
              <h3 className="font-bold text-base text-brand-white truncate">
                {nombre || "Título del producto"}
              </h3>
              
              <div className="flex items-baseline gap-2 pt-2 border-t border-brand-white/5">
                <span className="text-lg font-black text-brand-chartreuse">
                  ${precio.toLocaleString("es-AR")}
                </span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

export default function FormularioProductoPage() {
  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <Suspense fallback={
        <div className="min-h-screen bg-brand-black text-brand-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="size-10 border-4 border-brand-chartreuse border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-bold">Cargando...</p>
          </div>
        </div>
      }>
        <FormularioProductoContent />
      </Suspense>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Upload,
  Trash2,
  ImageIcon,
  Sparkles,
  X,
  Package,
  Wrench,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { sileo } from "sileo";
import CustomDropdown from "@/components/ui/CustomDropdown";
import type { Categoria } from "@/utils/services/marketplace";

interface ProductoFormProps {
  categorias: Categoria[];
  editId?: string | null;
  initial?: {
    nombre?: string;
    descripcion?: string;
    precio?: number;
    precio_anterior?: number;
    stock?: number;
    marca?: string;
    categoria_id?: string;
    tipo?: "producto" | "servicio";
    modalidad_servicio?: string;
    ubicacion_servicio?: string;
    imagenes?: string[];
  };
  onCancel: () => void;
  onSave: (payload: {
    categoria_id: string;
    nombre: string;
    descripcion?: string;
    precio: number;
    precio_anterior?: number | null;
    stock: number;
    marca?: string;
    tipo: "producto" | "servicio";
    modalidad_servicio?: string;
    ubicacion_servicio?: string;
    imagenes_base64?: string[];
    imagenes_existentes?: string[];
    imagenes_nuevas_base64?: string[];
  }) => Promise<void>;
}

const MAX_IMAGENES = 5;

type RotacionPortada = 0 | 90 | 180 | 270;
type TipoDescuento = "porcentaje" | "monto";

function inferirDescuentoInicial(precioFinal: number, precioAnterior?: number) {
  if (!precioAnterior || precioAnterior <= precioFinal || precioFinal <= 0) {
    return {
      activo: false,
      precioBase: precioFinal || 0,
      tipo: "porcentaje" as TipoDescuento,
      valor: "" as number | "",
    };
  }
  const pct = Math.round((1 - precioFinal / precioAnterior) * 100);
  return {
    activo: true,
    precioBase: precioAnterior,
    tipo: "porcentaje" as TipoDescuento,
    valor: pct > 0 ? pct : ("" as number | ""),
  };
}

/** Aplica el descuento sobre el precio ingresado y devuelve el precio final de venta. */
function calcularPrecioFinal(
  precioBase: number,
  activo: boolean,
  tipo: TipoDescuento,
  valor: number | "",
): number | null {
  if (!precioBase) return null;
  if (!activo) return precioBase;
  if (typeof valor !== "number" || valor <= 0) return null;
  if (tipo === "porcentaje") {
    if (valor >= 100) return null;
    return Math.round(precioBase * (1 - valor / 100));
  }
  const final = precioBase - valor;
  return final > 0 ? final : null;
}

/** Persiste la rotación de la portada al guardar. */
async function aplicarRotacionPortada(
  src: string,
  grados: RotacionPortada,
): Promise<string> {
  if (grados === 0) return src;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas no disponible"));
        return;
      }

      if (grados === 90 || grados === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((grados * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL("image/webp", 0.92));
    };
    img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
    img.src = src;
  });
}

function PreviewImage({
  src,
  rotacion = 0,
  className = "",
}: {
  src: string;
  rotacion?: RotacionPortada;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      className={`object-contain ${className}`}
      style={{
        transform: rotacion ? `rotate(${rotacion}deg)` : undefined,
        transformOrigin: "center",
      }}
      unoptimized={src.startsWith("data:")}
      draggable={false}
    />
  );
}

export default function MarketplaceProductoForm({
  categorias,
  editId,
  initial,
  onCancel,
  onSave,
}: ProductoFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState<"producto" | "servicio">(initial?.tipo || "producto");
  const [categoriaId, setCategoriaId] = useState(initial?.categoria_id || "");
  const [nombre, setNombre] = useState(initial?.nombre || "");
  const [descripcion, setDescripcion] = useState(initial?.descripcion || "");
  const descuentoInicial = inferirDescuentoInicial(
    initial?.precio || 0,
    initial?.precio_anterior,
  );
  const [precioBase, setPrecioBase] = useState(descuentoInicial.precioBase);
  const [descuentoActivo, setDescuentoActivo] = useState(descuentoInicial.activo);
  const [tipoDescuento, setTipoDescuento] = useState<TipoDescuento>(descuentoInicial.tipo);
  const [valorDescuento, setValorDescuento] = useState<number | "">(descuentoInicial.valor);
  const [stock, setStock] = useState(initial?.stock ?? 1);
  const [marca, setMarca] = useState(initial?.marca || "");
  const [modalidadServicio, setModalidadServicio] = useState<
    "presencial" | "online" | "ambas"
  >((initial?.modalidad_servicio as "presencial" | "online" | "ambas") || "presencial");
  const [ubicacionServicio, setUbicacionServicio] = useState(
    initial?.ubicacion_servicio || "",
  );

  const [imagenesExistentes, setImagenesExistentes] = useState<string[]>(
    initial?.imagenes || [],
  );
  const [imagenesNuevas, setImagenesNuevas] = useState<string[]>([]);
  const [previewsNuevas, setPreviewsNuevas] = useState<string[]>([]);
  const [portadaRotacion, setPortadaRotacion] = useState<RotacionPortada>(0);

  const totalImagenes = imagenesExistentes.length + imagenesNuevas.length;
  const previewPrincipal =
    previewsNuevas[0] || imagenesExistentes[0] || "";

  const precioFinal = calcularPrecioFinal(
    precioBase,
    descuentoActivo,
    tipoDescuento,
    valorDescuento,
  );
  const porcentajeVisible =
    descuentoActivo && precioFinal && precioBase > precioFinal
      ? Math.round((1 - precioFinal / precioBase) * 100)
      : null;

  const resetPortadaAjuste = () => setPortadaRotacion(0);

  const rotarPortada = (sentido: "izq" | "der") => {
    setPortadaRotacion((prev) => {
      const delta = sentido === "der" ? 90 : -90;
      return ((prev + delta + 360) % 360) as RotacionPortada;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const espacio = MAX_IMAGENES - totalImagenes;
    if (files.length > espacio) {
      sileo.error({
        title: "Límite de fotos",
        description: `Podés subir hasta ${MAX_IMAGENES} imágenes. Espacio disponible: ${espacio}.`,
      });
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) {
        sileo.error({ title: "Archivo grande", description: "Máximo 5MB por imagen." });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setImagenesNuevas((p) => [...p, b64]);
        setPreviewsNuevas((p) => [...p, b64]);
        if (totalImagenes === 0) resetPortadaAjuste();
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const prepararImagenesParaGuardar = async (): Promise<{
    nuevas: string[];
    existentes: string[];
  }> => {
    let nuevas = [...imagenesNuevas];
    let existentes = [...imagenesExistentes];
    if (portadaRotacion === 0) {
      return { nuevas, existentes };
    }

    try {
      if (nuevas.length > 0) {
        nuevas[0] = await aplicarRotacionPortada(nuevas[0], portadaRotacion);
      } else if (existentes.length > 0) {
        const reprocesada = await aplicarRotacionPortada(
          existentes[0],
          portadaRotacion,
        );
        nuevas = [reprocesada, ...nuevas];
        existentes = existentes.slice(1);
      }
    } catch {
      sileo.warning({
        title: "Rotación",
        description: "No se pudo rotar la imagen; se guardará la original.",
      });
    }

    return { nuevas, existentes };
  };

  const handleSubmit = async () => {
    if (!categoriaId || !nombre.trim() || !precioBase) {
      sileo.error({
        title: "Faltan datos",
        description: "Completá categoría, título y precio.",
      });
      return;
    }
    if (tipo === "servicio" && !ubicacionServicio.trim()) {
      sileo.error({
        title: "Ubicación requerida",
        description: "Indicá dónde se presta el servicio.",
      });
      return;
    }
    if (descuentoActivo && !precioFinal) {
      sileo.error({
        title: "Descuento inválido",
        description:
          tipoDescuento === "porcentaje"
            ? "Ingresá un porcentaje entre 1 y 99."
            : "El monto de descuento debe ser menor al precio ingresado.",
      });
      return;
    }

    setLoading(true);
    try {
      const { nuevas, existentes } = await prepararImagenesParaGuardar();
      const precioGuardar = precioFinal ?? precioBase;

      await onSave({
        categoria_id: categoriaId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        precio: precioGuardar,
        precio_anterior: descuentoActivo && precioFinal ? precioBase : null,
        stock: tipo === "servicio" ? 0 : stock,
        marca: marca.trim() || undefined,
        tipo,
        modalidad_servicio: tipo === "servicio" ? modalidadServicio : undefined,
        ubicacion_servicio: tipo === "servicio" ? ubicacionServicio : undefined,
        ...(editId
          ? {
              imagenes_existentes: existentes,
              imagenes_nuevas_base64: nuevas,
            }
          : { imagenes_base64: nuevas }),
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { n: 1, label: "Fotos" },
    { n: 2, label: "Detalles" },
    { n: 3, label: "Publicar" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div className="relative w-full max-w-[min(92vw,960px)] max-h-[90vh] overflow-y-auto bg-[#111] border border-brand-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-brand-white/5 bg-[#111]/95 backdrop-blur-md">
          <div>
            <h2 className="text-lg font-black text-brand-white">
              {editId ? "Editar publicación" : "Nueva publicación"}
            </h2>
            <p className="text-xs text-gray-500">
              Subí fotos, completá los datos y publicá en el catálogo oficial.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-brand-white/5 text-gray-400 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex gap-2 px-6 py-4 border-b border-brand-white/5">
          {steps.map(({ n, label }) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                step === n
                  ? "bg-brand-chartreuse text-brand-black"
                  : step > n
                    ? "bg-brand-chartreuse/15 text-brand-chartreuse"
                    : "bg-brand-white/5 text-gray-500"
              }`}
            >
              {n}. {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 sm:p-6">
          <div className="space-y-5 pb-4 min-w-0">
            {step === 1 && (
              <div className="space-y-5">
                <p className="text-sm text-gray-400">
                  Las publicaciones con fotos reciben más consultas. La primera imagen será la portada.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {totalImagenes < MAX_IMAGENES && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="aspect-square rounded-2xl border-2 border-dashed border-brand-white/15 hover:border-brand-chartreuse/50 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-brand-chartreuse transition-colors cursor-pointer bg-brand-black/40"
                    >
                      <Upload className="size-6" />
                      <span className="text-[10px] font-bold">Agregar</span>
                    </button>
                  )}
                  {imagenesExistentes.map((img, i) => (
                    <div
                      key={`e-${i}`}
                      className="relative aspect-square rounded-2xl overflow-hidden group ring-1 ring-brand-white/10 bg-brand-black/50"
                    >
                      <PreviewImage
                        src={img}
                        rotacion={
                          i === 0 && imagenesNuevas.length === 0 ? portadaRotacion : 0
                        }
                      />
                      {i === 0 && imagenesNuevas.length === 0 && (
                        <span className="absolute bottom-1 left-1 text-[8px] font-black bg-brand-chartreuse text-brand-black px-1.5 py-0.5 rounded z-10">
                          PORTADA
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setImagenesExistentes((p) => p.filter((_, j) => j !== i));
                          if (i === 0) resetPortadaAjuste();
                        }}
                        className="absolute top-1 right-1 size-7 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      >
                        <Trash2 className="size-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                  {previewsNuevas.map((img, i) => (
                    <div
                      key={`n-${i}`}
                      className="relative aspect-square rounded-2xl overflow-hidden group ring-1 ring-brand-white/10 bg-brand-black/50"
                    >
                      <PreviewImage
                        src={img}
                        rotacion={i === 0 ? portadaRotacion : 0}
                      />
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[8px] font-black bg-brand-chartreuse text-brand-black px-1.5 py-0.5 rounded z-10">
                          PORTADA
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setImagenesNuevas((p) => p.filter((_, j) => j !== i));
                          setPreviewsNuevas((p) => p.filter((_, j) => j !== i));
                          if (i === 0) resetPortadaAjuste();
                        }}
                        className="absolute top-1 right-1 size-7 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                      >
                        <Trash2 className="size-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
                <p className="text-[11px] text-gray-600">
                  {totalImagenes}/{MAX_IMAGENES} fotos · JPG o PNG, máx. 5MB c/u
                </p>

                {previewPrincipal && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => rotarPortada("izq")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-white/10 text-xs font-bold text-gray-300 hover:border-brand-chartreuse/40 hover:text-brand-chartreuse cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" />
                      Girar izq.
                    </button>
                    <button
                      type="button"
                      onClick={() => rotarPortada("der")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-white/10 text-xs font-bold text-gray-300 hover:border-brand-chartreuse/40 hover:text-brand-chartreuse cursor-pointer"
                    >
                      <RotateCw className="size-3.5" />
                      Girar der.
                    </button>
                    {portadaRotacion !== 0 && (
                      <button
                        type="button"
                        onClick={resetPortadaAjuste}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-brand-white cursor-pointer"
                      >
                        Restablecer
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipo("producto")}
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      tipo === "producto"
                        ? "border-brand-chartreuse bg-brand-chartreuse/10"
                        : "border-brand-white/10 bg-brand-black/30"
                    }`}
                  >
                    <Package className="size-5 text-brand-chartreuse" />
                    <div className="text-left">
                      <p className="text-sm font-bold">Producto</p>
                      <p className="text-[10px] text-gray-500">Artículo físico</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("servicio")}
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      tipo === "servicio"
                        ? "border-brand-chartreuse bg-brand-chartreuse/10"
                        : "border-brand-white/10 bg-brand-black/30"
                    }`}
                  >
                    <Wrench className="size-5 text-brand-chartreuse" />
                    <div className="text-left">
                      <p className="text-sm font-bold">Servicio</p>
                      <p className="text-[10px] text-gray-500">Clase, alquiler, etc.</p>
                    </div>
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Título *</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Paleta Bullpadel Vertex 04"
                    className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Precio (ARS) *</label>
                  <input
                    type="number"
                    min={1}
                    value={precioBase || ""}
                    onChange={(e) => setPrecioBase(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-600">
                    {descuentoActivo
                      ? "El descuento se aplica sobre este precio."
                      : "Precio final que verán los compradores."}
                  </p>
                </div>

                <div className="rounded-2xl border border-brand-white/10 bg-brand-black/30 p-4 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={descuentoActivo}
                      onChange={(e) => {
                        setDescuentoActivo(e.target.checked);
                        if (!e.target.checked) setValorDescuento("");
                      }}
                      className="size-4 rounded border-brand-white/20 accent-brand-chartreuse"
                    />
                    <span className="text-sm font-bold text-brand-white">Mostrar descuento</span>
                  </label>

                  {descuentoActivo && (
                    <>
                      <div className="flex gap-2">
                        {(["porcentaje", "monto"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTipoDescuento(t)}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                              tipoDescuento === t
                                ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
                                : "bg-brand-black/40 text-gray-400 border-brand-white/10 hover:text-brand-white"
                            }`}
                          >
                            {t === "porcentaje" ? "Porcentaje (%)" : "Monto fijo ($)"}
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        {tipoDescuento === "porcentaje" ? (
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={valorDescuento}
                            onChange={(e) =>
                              setValorDescuento(e.target.value ? Number(e.target.value) : "")
                            }
                            placeholder="Ej: 20"
                            className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 pr-10 text-sm focus:border-brand-chartreuse focus:outline-none"
                          />
                        ) : (
                          <input
                            type="number"
                            min={1}
                            value={valorDescuento}
                            onChange={(e) =>
                              setValorDescuento(e.target.value ? Number(e.target.value) : "")
                            }
                            placeholder="Ej: 15000"
                            className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 pl-8 text-sm focus:border-brand-chartreuse focus:outline-none"
                          />
                        )}
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                          {tipoDescuento === "porcentaje" ? "%" : ""}
                        </span>
                        {tipoDescuento === "monto" && (
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                            $
                          </span>
                        )}
                      </div>

                      {precioFinal && porcentajeVisible !== null && precioBase > 0 && (
                        <p className="text-xs text-brand-chartreuse font-bold leading-relaxed">
                          Antes ${precioBase.toLocaleString("es-AR")} → Ahora $
                          {precioFinal.toLocaleString("es-AR")} (−{porcentajeVisible}%)
                        </p>
                      )}
                      {descuentoActivo && valorDescuento !== "" && !precioFinal && (
                        <p className="text-xs text-amber-400">
                          {tipoDescuento === "monto"
                            ? "El descuento en pesos debe ser menor al precio ingresado."
                            : "Revisá el porcentaje y el precio ingresado."}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {tipo === "producto" && (
                  <div className="space-y-2 max-w-[50%]">
                    <label className="text-xs font-bold text-gray-500 uppercase">Stock *</label>
                    <input
                      type="number"
                      min={1}
                      value={stock || ""}
                      onChange={(e) => setStock(Number(e.target.value))}
                      className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Categoría *</label>
                  <CustomDropdown
                    value={categoriaId}
                    onChange={setCategoriaId}
                    placeholder="Elegí una categoría"
                    options={categorias
                      .filter((c) => c.tipo === tipo)
                      .map((c) => ({ value: c.id, label: c.nombre }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Marca</label>
                  <input
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-brand-chartreuse focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Contá estado, talles, condiciones de entrega o detalle del servicio..."
                    rows={5}
                    className="w-full bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3.5 text-sm resize-y min-h-[120px] focus:border-brand-chartreuse focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-600">
                    Podés usar Enter para saltos de línea. Se respetarán en la publicación.
                  </p>
                </div>

                {tipo === "servicio" && (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-brand-black/30 border border-brand-white/5">
                    <CustomDropdown
                      value={modalidadServicio}
                      onChange={(v) =>
                        setModalidadServicio(v as "presencial" | "online" | "ambas")
                      }
                      placeholder="Modalidad"
                      options={[
                        { value: "presencial", label: "Presencial" },
                        { value: "online", label: "Online" },
                        { value: "ambas", label: "Ambas" },
                      ]}
                    />
                    <input
                      value={ubicacionServicio}
                      onChange={(e) => setUbicacionServicio(e.target.value)}
                      placeholder="Lugar de prestación *"
                      className="bg-brand-input border border-brand-white/10 rounded-xl px-4 py-3 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-brand-chartreuse/25 bg-brand-chartreuse/5 p-6 space-y-3">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Sparkles className="size-5 text-brand-chartreuse" />
                    Listo para publicar
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Tu {tipo} aparecerá en el marketplace oficial de Padel Nexus vinculado a tu
                    entidad. Los jugadores podrán comprar, consultar y chatear con vos.
                  </p>
                </div>

                <div className="rounded-2xl border border-brand-white/10 bg-brand-black/30 p-5 space-y-3 text-sm">
                  <p className="text-xs font-bold text-gray-500 uppercase">Resumen</p>
                  <div className="grid grid-cols-2 gap-3 text-gray-400">
                    <span>Título</span>
                    <span className="text-brand-white font-medium text-right truncate">
                      {nombre || "—"}
                    </span>
                    <span>Precio final</span>
                    <span className="text-brand-chartreuse font-bold text-right">
                      {(precioFinal ?? precioBase)
                        ? `$${(precioFinal ?? precioBase).toLocaleString("es-AR")}`
                        : "—"}
                      {descuentoActivo && precioFinal && precioBase > precioFinal && (
                        <span className="text-gray-500 line-through font-normal ml-2 text-xs block sm:inline">
                          ${precioBase.toLocaleString("es-AR")}
                        </span>
                      )}
                    </span>
                    {porcentajeVisible !== null && descuentoActivo && (
                      <>
                        <span>Descuento</span>
                        <span className="text-brand-chartreuse font-bold text-right">
                          −{porcentajeVisible}%
                        </span>
                      </>
                    )}
                    <span>Fotos</span>
                    <span className="text-brand-white text-right">{totalImagenes}</span>
                    <span>Categoría</span>
                    <span className="text-brand-white text-right truncate">
                      {categorias.find((c) => c.id === categoriaId)?.nombre || "—"}
                    </span>
                  </div>
                  {descripcion && (
                    <div className="pt-3 border-t border-brand-white/5">
                      <p className="text-xs text-gray-500 mb-1">Descripción</p>
                      <p className="text-sm text-gray-300 whitespace-pre-line">{descripcion}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="px-5 py-3 rounded-xl border border-brand-white/10 text-sm font-bold text-gray-400 cursor-pointer"
                >
                  Atrás
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  className="flex-1 py-3 rounded-xl bg-brand-white/10 hover:bg-brand-white/15 text-sm font-bold cursor-pointer"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="flex-1 py-3 rounded-xl bg-brand-chartreuse text-brand-black font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="size-4" />
                  {loading ? "Publicando..." : editId ? "Guardar cambios" : "Publicar en marketplace"}
                </button>
              )}
            </div>
          </div>

          <aside className="min-w-0">
            <div className="lg:sticky lg:top-20 space-y-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Vista previa
              </p>
              <div className="rounded-2xl overflow-hidden border border-brand-white/10 bg-brand-card shadow-xl max-w-sm mx-auto lg:max-w-none">
                <div className="relative aspect-[4/5] bg-brand-black/50">
                  {previewPrincipal ? (
                    <PreviewImage
                      src={previewPrincipal}
                      rotacion={portadaRotacion}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-2">
                      <ImageIcon className="size-12 opacity-40" />
                      <span className="text-xs">Agregá fotos</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2">
                  {descuentoActivo && precioFinal && precioBase > precioFinal ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-2xl font-black text-brand-chartreuse">
                          ${precioFinal.toLocaleString("es-AR")}
                        </p>
                        {porcentajeVisible !== null && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500 text-white">
                            −{porcentajeVisible}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-through">
                        ${precioBase.toLocaleString("es-AR")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-2xl font-black text-brand-chartreuse">
                      {precioBase ? `$${precioBase.toLocaleString("es-AR")}` : "$ —"}
                    </p>
                  )}
                  <h3 className="font-bold text-brand-white text-lg line-clamp-2">
                    {nombre || "Título de la publicación"}
                  </h3>
                  {marca && (
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{marca}</p>
                  )}
                  <p className="text-sm text-gray-400 whitespace-pre-line min-h-[3rem]">
                    {descripcion || "La descripción aparecerá aquí."}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

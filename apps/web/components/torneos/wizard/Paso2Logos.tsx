import React, { useState } from "react";
import { Upload, Info } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo } from "@/utils/types";

const MAX_BYTES = 5 * 1024 * 1024;
const RECOMENDADO_PX = 512;
/** Tolerancia de ratio 1:1 (±20%) — aviso suave, no bloquea. */
const RATIO_TOLERANCIA = 0.2;

interface Paso2LogosProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  readOnly?: boolean;
}

function leerDimensiones(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

function ratioFueraDeCuadrado(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  const ratio = width / height;
  return Math.abs(ratio - 1) > RATIO_TOLERANCIA;
}

export const Paso2Logos = ({
  torneo,
  torneoId,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  readOnly = false,
}: Paso2LogosProps) => {
  const [subiendoBanner, setSubiendoBanner] = useState(false);
  const [avisoRatio, setAvisoRatio] = useState<string | null>(null);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_BYTES) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "warning",
        title: "Archivo demasiado grande",
        description: "La imagen excede el límite de 5 MB. Comprimila e intentá de nuevo.",
      }));
      return;
    }

    setAvisoRatio(null);
    try {
      const { width, height } = await leerDimensiones(file);
      if (ratioFueraDeCuadrado(width, height)) {
        setAvisoRatio(
          `La imagen mide ${width}×${height}px (ratio ${ (width / height).toFixed(2) }). Se recomienda cuadrado 1:1 (ej. ${RECOMENDADO_PX}×${RECOMENDADO_PX}). Se subirá igual.`,
        );
      }
    } catch {
      // Sin dimensiones no bloqueamos el upload
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        setSubiendoBanner(true);
        await TorneosService.subirBanner(torneoId, base64);
        triggerRefresh();
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          type: "success",
          title: "Publicidad cargada",
          description:
            "La marca patrocinadora se ha cargado correctamente en WebP comprimido.",
        }));
      } catch (err: any) {
        setFeedbackModal((prev: any) => ({
          ...prev,
          isOpen: true,
          type: "error",
          title: "Error al subir",
          description: err.message || "Error desconocido",
        }));
      } finally {
        setSubiendoBanner(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerDelete = async (bannerUrl: string) => {
    try {
      setSubiendoBanner(true);
      await TorneosService.eliminarBanner(torneoId, bannerUrl);
      triggerRefresh();
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "success",
        title: "Publicidad eliminada",
        description:
          "El banner ha sido removido del torneo y del almacenamiento.",
      }));
    } catch (err: any) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "error",
        title: "Error al eliminar",
        description: err.message || "Error desconocido",
      }));
    } finally {
      setSubiendoBanner(false);
    }
  };

  return (
    <div className={`bg-[#111111] border border-white/5 rounded-3xl p-6 space-y-6 ${readOnly ? "pointer-events-none opacity-60 select-none" : ""}`}>
      <h3 className="text-lg font-bold text-white uppercase tracking-wider">
        Paso 2: Logos y Sponsoreo
      </h3>
      <p className="text-sm text-gray-400">
        Personalizá las marcas de los patrocinadores oficiales que se verán en
        las llaves y transmisiones en vivo. Subí múltiples banners publicitarios
        optimizados.
      </p>

      <div className="flex gap-3 rounded-2xl border border-brand-chartreuse/20 bg-brand-chartreuse/5 p-4 text-left">
        <Info className="size-5 text-brand-chartreuse shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-white uppercase tracking-wider">
            Recomendaciones de imagen
          </p>
          <ul className="text-xs text-gray-400 space-y-0.5 list-disc list-inside">
            <li>
              Formato cuadrado <span className="text-gray-300 font-semibold">1:1</span>{" "}
              (ideal {RECOMENDADO_PX}×{RECOMENDADO_PX} px)
            </li>
            <li>PNG o WebP con fondo transparente si aplica</li>
            <li>Peso máximo 5 MB (se comprime a WebP al subir)</li>
          </ul>
        </div>
      </div>

      {avisoRatio && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200/90 font-medium">
          {avisoRatio}
        </div>
      )}

      {Array.isArray(torneo?.banners) && torneo.banners.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {torneo.banners.map((bannerUrl, idx) => (
            <div
              key={idx}
              className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-between gap-3 group relative"
            >
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 shadow bg-black/50 flex items-center justify-center">
                <img
                  src={bannerUrl}
                  alt={`Patrocinador ${idx + 1}`}
                  className="max-h-full max-w-full object-contain p-2"
                />
              </div>
              <button
                onClick={() => handleBannerDelete(bannerUrl)}
                className="text-red-500 hover:text-red-400 border border-red-500/20 hover:bg-red-500/5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer w-full"
              >
                Eliminar Marca
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
          <Upload className="size-6 text-gray-400" />
        </div>
        <div>
          <p className="text-white text-sm font-bold">
            Subir nuevo banner publicitario
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Preferí cuadrado 1:1 · PNG/WebP · máx. 5 MB
          </p>
        </div>
        <label
          htmlFor="logo-file-input"
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all mt-2 cursor-pointer inline-block"
        >
          {subiendoBanner ? "Subiendo..." : "Seleccionar Archivo"}
        </label>
      </div>

      <input
        type="file"
        accept="image/png,image/webp,image/jpeg,image/*"
        className="hidden"
        id="logo-file-input"
        disabled={subiendoBanner}
        onChange={handleBannerUpload}
      />

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button
          onClick={() => setActiveTab("edit")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className="bg-brand-chartreuse text-brand-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
        >
          Siguiente Paso: Categorías
        </button>
      </div>
    </div>
  );
};

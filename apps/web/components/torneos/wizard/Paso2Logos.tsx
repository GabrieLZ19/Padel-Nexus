import React, { useState } from "react";
import { Upload } from "lucide-react";
import { TorneosService } from "@/utils/services/torneos";
import { Torneo } from "@/utils/types";

interface Paso2LogosProps {
  torneo: Torneo;
  torneoId: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void;
  triggerRefresh: () => void;
}

export const Paso2Logos = ({
  torneo,
  torneoId,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
}: Paso2LogosProps) => {
  const [subiendoBanner, setSubiendoBanner] = useState(false);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen excede el límite de 5MB.");
      return;
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
        alert("Error al subir banner: " + (err.message || "Error desconocido"));
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
      alert("Error al eliminar: " + (err.message || "Error desconocido"));
    } finally {
      setSubiendoBanner(false);
    }
  };

  return (
    <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 space-y-6">
      <h3 className="text-lg font-bold text-white uppercase tracking-wider">
        Paso 2: Logos y Sponsoreo
      </h3>
      <p className="text-sm text-gray-400">
        Personalizá las marcas de los patrocinadores oficiales que se verán en
        las llaves y transmisiones en vivo. Subí múltiples banners publicitarios
        optimizados.
      </p>

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
            Se optimizará a WebP de bajo peso. Soporta hasta 5MB.
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
        accept="image/*"
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import {
  TorneosService,
  type CategoriasEventoResponse,
} from "@/utils/services/torneos";

interface SelectorCategoriaEventoProps {
  torneoId: string;
  pasoWizard?: "draws" | "matches";
  className?: string;
  modoPublico?: boolean;
}

export function SelectorCategoriaEvento({
  torneoId,
  pasoWizard,
  className = "",
  modoPublico = false,
}: SelectorCategoriaEventoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CategoriasEventoResponse | null>(null);

  useEffect(() => {
    let activo = true;
    TorneosService.getCategoriasEvento(torneoId)
      .then((respuesta: CategoriasEventoResponse) => {
        if (activo) setData(respuesta);
      })
      .catch(() => {
        if (activo) setData(null);
      });
    return () => {
      activo = false;
    };
  }, [torneoId]);

  const opciones = useMemo(() => {
    if (!data?.categorias?.length) return [];
    return data.categorias.map((categoria) => ({
      value: categoria.id,
      label: categoria.etiqueta,
    }));
  }, [data]);

  if (!data || data.categorias.length <= 1) return null;

  const cambiarCategoria = (nuevoId: string) => {
    if (nuevoId === torneoId) return;

    if (modoPublico) {
      const vista = searchParams.get("vista");
      const qs = vista ? `?vista=${encodeURIComponent(vista)}` : "";
      router.push(`/torneos/${nuevoId}${qs}`);
      return;
    }

    const base = pathname.includes("/club/torneos/")
      ? `/club/torneos/${nuevoId}`
      : `/dashboard/torneos/${nuevoId}`;
    const step =
      pasoWizard || searchParams.get("step") || "draws";
    router.push(`${base}?step=${encodeURIComponent(step)}`);
  };

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 ${
        modoPublico ? "relative z-20" : ""
      } ${className}`}
    >
      {data.evento_nombre ? (
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 truncate">
          Evento: {data.evento_nombre}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Layers className="size-4 shrink-0 text-gray-500" aria-hidden />
        <div className="min-w-0 flex-1 max-w-md">
          <CustomDropdown
            compacto
            buscable={opciones.length > 6}
            value={torneoId}
            onChange={cambiarCategoria}
            placeholder="Otra categoría del evento"
            options={opciones}
          />
        </div>
      </div>
    </div>
  );
}
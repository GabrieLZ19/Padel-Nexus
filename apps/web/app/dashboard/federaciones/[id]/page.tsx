"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Landmark,
  MapPin,
  Scale,
} from "lucide-react";
import {
  FederacionesService,
  type Federacion,
} from "@/utils/services/federaciones";

export default function DetalleFederacionPage() {
  const params = useParams();
  const id = params?.id as string;
  const [federacion, setFederacion] = useState<Federacion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    FederacionesService.getById(id)
      .then((data) => {
        if (mounted) setFederacion(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-gray-500 text-sm">Cargando federación...</div>
    );
  }

  if (!federacion) {
    return (
      <div className="p-8 space-y-4">
        <Link
          href="/dashboard/federaciones"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="size-4" /> Volver a Federaciones
        </Link>
        <p className="text-white font-bold">Federación no encontrada.</p>
      </div>
    );
  }

  const asociaciones = federacion.asociaciones || [];

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
      <Link
        href="/dashboard/federaciones"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="size-4" /> Volver a Federaciones
      </Link>

      <div className="bg-[#151515] border border-white/5 rounded-3xl p-8">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-2xl bg-brand-chartreuse flex items-center justify-center shrink-0">
            <Scale className="size-7 text-brand-black" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-chartreuse mb-1">
              {federacion.sigla || "Federación"}
            </p>
            <h1 className="text-3xl font-extrabold text-white">
              {federacion.nombre}
            </h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
              <MapPin className="size-3.5" />
              {federacion.pais || "Sin país"} · {asociaciones.length} asociaciones
            </p>
          </div>
        </div>
        {federacion.descripcion && (
          <p className="text-sm text-gray-400 mt-6">{federacion.descripcion}</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Asociaciones de esta federación
        </h2>
        {asociaciones.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay asociaciones vinculadas.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {asociaciones.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/asociaciones/${a.id}`}
                className="bg-[#151515] border border-white/5 hover:border-brand-chartreuse/30 rounded-2xl p-5 transition-colors"
              >
                <div className="flex items-center gap-2 text-brand-chartreuse text-xs font-bold uppercase mb-2">
                  <Landmark className="size-3.5" />
                  {a.sigla || a.tipo || "Asociación"}
                </div>
                <p className="font-extrabold text-white">{a.nombre}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {[a.localidad, a.provincia].filter(Boolean).join(", ") ||
                    "Sin ubicación"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

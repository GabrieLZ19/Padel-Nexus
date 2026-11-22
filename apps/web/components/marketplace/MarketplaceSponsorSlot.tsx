"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MarketplaceService,
  type EspacioSponsorCampana,
  type MarketplaceSponsorCampanaPublica,
} from "@/utils/services/marketplace";

interface Props {
  espacio: EspacioSponsorCampana;
  vendedorId?: string;
  className?: string;
}

export default function MarketplaceSponsorSlot({
  espacio,
  vendedorId,
  className = "",
}: Props) {
  const [campanas, setCampanas] = useState<MarketplaceSponsorCampanaPublica[]>(
    [],
  );

  useEffect(() => {
    MarketplaceService.getCampanasSponsorPublicas(espacio, vendedorId)
      .then(setCampanas)
      .catch(() => setCampanas([]));
  }, [espacio, vendedorId]);

  if (campanas.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {campanas.map((campana) => {
        const imagen =
          campana.imagen_url || campana.sponsor?.logo_url || null;
        const href = campana.link_url?.trim() || undefined;
        const contenido = (
          <div className="relative overflow-hidden rounded-2xl border border-brand-white/10 bg-brand-card">
            {imagen ? (
              <div className="relative w-full h-28 sm:h-36 md:h-44">
                <Image
                  src={imagen}
                  alt={campana.titulo}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 1200px"
                />
                <div className="absolute inset-0 bg-linear-to-t from-brand-black/80 via-brand-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-xs uppercase font-bold text-brand-chartreuse tracking-wider">
                    {campana.sponsor?.nombre || "Patrocinio"}
                  </p>
                  <p className="text-sm md:text-base font-bold text-brand-white">
                    {campana.titulo}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 md:p-6">
                <p className="text-xs uppercase font-bold text-brand-chartreuse tracking-wider">
                  {campana.sponsor?.nombre || "Patrocinio"}
                </p>
                <p className="text-base font-bold text-brand-white mt-1">
                  {campana.titulo}
                </p>
                {campana.descripcion && (
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                    {campana.descripcion}
                  </p>
                )}
              </div>
            )}
          </div>
        );

        if (href) {
          return (
            <Link
              key={campana.id}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="block"
            >
              {contenido}
            </Link>
          );
        }

        return <div key={campana.id}>{contenido}</div>;
      })}
    </div>
  );
}
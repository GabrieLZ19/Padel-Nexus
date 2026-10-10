"use client";

import { useEffect, useState } from "react";
import { FederacionesService } from "@/utils/services/federaciones";

/** Sigla vigente de la entidad rectora. Cambia si se edita en Federaciones. */
export function useSiglaRectora(): string {
  const [sigla, setSigla] = useState("FAP");

  useEffect(() => {
    let vivo = true;
    FederacionesService.getFap()
      .then((federacion) => {
        const siguiente = federacion?.sigla?.trim();
        if (vivo && siguiente) setSigla(siguiente);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  return sigla;
}

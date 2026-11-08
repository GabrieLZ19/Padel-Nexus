import type { Metadata } from "next";

export const SITE_DEFAULT_DESCRIPTION =
  "Torneos, ranking oficial, reservas de canchas y marketplace de pádel en un solo lugar.";

/** Título de pestaña con plantilla «{title} · Padel Nexus» del layout raíz. */
export function pageMetadata(input: {
  title: string;
  description?: string;
}): Metadata {
  return {
    title: input.title,
    description: input.description ?? SITE_DEFAULT_DESCRIPTION,
  };
}

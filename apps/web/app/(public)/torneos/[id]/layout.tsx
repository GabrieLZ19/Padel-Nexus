import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";
import { getApiUpstreamUrl } from "@/utils/bff/upstream";

type TorneoPublicoMin = {
  nombre?: string | null;
};

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

async function titularTorneoPublico(id: string): Promise<string | null> {
  const base = getApiUpstreamUrl();
  try {
    const res = await fetch(`${base}/torneos/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TorneoPublicoMin;
    const nombre = data.nombre?.trim();
    return nombre || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const nombre = await titularTorneoPublico(id);
  const title = nombre ?? "Detalle del torneo";
  const description = nombre
    ? `Información, inscripción y fixture del torneo ${nombre} en Padel Nexus.`
    : "Información, inscripción y fixture del torneo en Padel Nexus.";

  return pageMetadata({
    title,
    description,
    path: `/torneos/${id}`,
  });
}

export default function TorneoPublicoDetalleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";
import { getApiUpstreamUrl } from "@/utils/bff/upstream";

type PerfilPublicoMin = {
  nombre?: string | null;
  apellido?: string | null;
};

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

async function titularJugadorPublico(id: string): Promise<string | null> {
  const base = getApiUpstreamUrl();
  try {
    const res = await fetch(`${base}/perfil/publico/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: PerfilPublicoMin };
    const nombre = [json.data?.nombre, json.data?.apellido]
      .filter(Boolean)
      .join(" ")
      .trim();
    return nombre || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const nombre = await titularJugadorPublico(id);
  const title = nombre ? `Ficha de ${nombre}` : "Ficha del jugador";
  const description = nombre
    ? `Perfil público y ranking de ${nombre} en Padel Nexus.`
    : "Perfil público y posición en el ranking oficial de pádel.";

  return pageMetadata({
    title,
    description,
    path: `/jugadores/${id}`,
  });
}

export default function FichaJugadorPublicaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";

export const SITE_NAME = "Padel Nexus";

export const SITE_DEFAULT_DESCRIPTION =
  "Torneos, ranking oficial, reservas de canchas y marketplace de pádel en un solo lugar.";

const OG_IMAGE_PATH = "/brand/LogoHorizontal.svg";

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  return "https://www.padelnexus.app";
}

function fullTitle(pageTitle?: string): string {
  if (!pageTitle) return SITE_NAME;
  return `${pageTitle} · ${SITE_NAME}`;
}

function absoluteUrl(path?: string): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildOpenGraph(input?: {
  title?: string;
  description?: string;
  path?: string;
}): NonNullable<Metadata["openGraph"]> {
  const description = input?.description ?? SITE_DEFAULT_DESCRIPTION;
  const title = fullTitle(input?.title);
  return {
    type: "website",
    locale: "es_AR",
    siteName: SITE_NAME,
    title,
    description,
    url: absoluteUrl(input?.path),
    images: [
      {
        url: absoluteUrl(OG_IMAGE_PATH),
        alt: SITE_NAME,
      },
    ],
  };
}

function buildTwitter(input?: {
  title?: string;
  description?: string;
}): NonNullable<Metadata["twitter"]> {
  const description = input?.description ?? SITE_DEFAULT_DESCRIPTION;
  return {
    card: "summary_large_image",
    title: fullTitle(input?.title),
    description,
    images: [absoluteUrl(OG_IMAGE_PATH)],
  };
}

/** Metadata del layout raíz (Open Graph, Twitter, metadataBase, ícono). */
export function rootMetadata(): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: SITE_NAME,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DEFAULT_DESCRIPTION,
    openGraph: buildOpenGraph(),
    twitter: buildTwitter(),
    icons: {
      icon: [{ url: "/brand/LogoAccessory.svg", type: "image/svg+xml" }],
      apple: "/brand/LogoAccessory.svg",
    },
    alternates: {
      canonical: "/",
    },
  };
}

/** Título de pestaña con plantilla «{title} · Padel Nexus» del layout raíz. */
export function pageMetadata(input: {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const description = input.description ?? SITE_DEFAULT_DESCRIPTION;
  return {
    title: input.title,
    description,
    openGraph: buildOpenGraph({
      title: input.title,
      description,
      path: input.path,
    }),
    twitter: buildTwitter({ title: input.title, description }),
    ...(input.path
      ? { alternates: { canonical: input.path } }
      : {}),
    ...(input.noIndex
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

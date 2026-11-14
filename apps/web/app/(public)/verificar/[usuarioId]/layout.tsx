import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ usuarioId: string }>;
};

export async function generateMetadata({
  params,
}: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { usuarioId } = await params;
  return pageMetadata({
    title: "Verificación de licencia",
    description:
      "Consultá el estado de la credencial deportiva ante la Federación.",
    path: `/verificar/${usuarioId}`,
    noIndex: true,
  });
}

export default function VerificarCredencialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

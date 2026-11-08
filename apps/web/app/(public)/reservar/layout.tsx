import type { Metadata } from "next";
import { pageMetadata } from "@/utils/siteMetadata";

export const metadata: Metadata = pageMetadata({
  title: "Reservar canchas",
  description:
    "Encontrá clubes, horarios disponibles y reservá turnos de pádel en línea.",
});

export default function ReservarPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

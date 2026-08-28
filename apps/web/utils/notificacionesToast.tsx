"use client";

import { Megaphone } from "lucide-react";
import { sileo } from "sileo";
import type { Notificacion } from "@/utils/types";

export function mostrarToastNotificacion(notif: Notificacion) {
  const promo = notif.metadata?.origen === "marketplace_promo";
  const nombreTienda = notif.metadata?.nombre_tienda as string | undefined;
  const description =
    promo && nombreTienda
      ? `${notif.mensaje} · ${nombreTienda}`
      : notif.mensaje;

  if (promo) {
    sileo.show({
      type: "info",
      title: notif.titulo,
      description,
      icon: <Megaphone className="size-5 text-brand-chartreuse" strokeWidth={2.25} />,
      fill: "#0b0b0b",
      roundness: 14,
      styles: {
        title: "!text-white !font-bold",
        description: "!text-gray-300",
        badge: "!bg-brand-chartreuse/20 !text-brand-chartreuse",
      },
    });
    return;
  }

  const payload = { title: notif.titulo, description: notif.mensaje };

  switch (notif.tipo) {
    case "success":
      sileo.success(payload);
      break;
    case "error":
      sileo.error(payload);
      break;
    case "warning":
      sileo.warning(payload);
      break;
    default:
      sileo.info(payload);
      break;
  }
}

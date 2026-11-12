import type {
  ComunicacionesCampana,
  ComunicacionesCanal,
  ComunicacionesMetricasCampana,
} from "@/utils/types/comunicaciones.types";

const ETIQUETA_CANAL: Record<ComunicacionesCanal, string> = {
  in_app: "In-app",
  email: "Email",
  whatsapp: "WhatsApp",
};

export function canalesCampanaOrdenados(
  campana: Pick<ComunicacionesCampana, "canales">,
): ComunicacionesCanal[] {
  const orden: ComunicacionesCanal[] = ["in_app", "email", "whatsapp"];
  const set = new Set<ComunicacionesCanal>(
    (campana.canales?.length ? campana.canales : ["in_app"]) as ComunicacionesCanal[],
  );
  return orden.filter((c) => set.has(c));
}

export function etiquetaEntregasCanal(
  canal: ComunicacionesCanal,
  metricas: ComunicacionesMetricasCampana | null | undefined,
  opciones?: {
    destinatarios?: number;
    fallbackInAppEntregados?: number;
  },
): string {
  const ent =
    metricas?.entregados?.[canal] ??
    (canal === "in_app" ? opciones?.fallbackInAppEntregados ?? 0 : 0);
  const omi = metricas?.omitidos?.[canal] ?? 0;
  const label = ETIQUETA_CANAL[canal];

  let texto = `${label}: ${ent} entregado${ent === 1 ? "" : "s"}`;
  if (opciones?.destinatarios != null && canal === "in_app") {
    texto = `${label}: ${ent}/${opciones.destinatarios}`;
  }
  if (omi > 0) {
    texto += ` · ${omi} omitido${omi === 1 ? "" : "s"}`;
  }
  return texto;
}

export function resumenMetricasCampana(
  campana: Pick<
    ComunicacionesCampana,
    "canales" | "metricas" | "total_destinatarios" | "total_enviados"
  >,
): string[] {
  return canalesCampanaOrdenados(campana).map((canal) =>
    etiquetaEntregasCanal(canal, campana.metricas, {
      destinatarios: campana.total_destinatarios,
      fallbackInAppEntregados:
        canal === "in_app" ? campana.total_enviados : undefined,
    }),
  );
}

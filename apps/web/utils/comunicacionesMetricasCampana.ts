import type {
  ComunicacionesCampana,
  ComunicacionesCanal,
  ComunicacionesMetricasCampana,
} from "@/utils/types/comunicaciones.types";

import type { OmitidoMotivoClave } from "@/utils/types/comunicaciones.types";
import { ETIQUETA_CANAL_UI } from "@/utils/remitenteCampana";

const ETIQUETA_CANAL = ETIQUETA_CANAL_UI;

const ETIQUETA_MOTIVO_OMITIDO: Record<
  ComunicacionesCanal,
  Record<OmitidoMotivoClave, string>
> = {
  in_app: {
    sin_dato: "sin destino in-app",
    no_configurado: "canal no disponible",
    prefs: "notificaciones desactivadas",
    error: "error de envío",
  },
  email: {
    sin_dato: "sin email",
    no_configurado: "correo no configurado",
    prefs: "no acepta mails",
    error: "error de envío",
  },
  whatsapp: {
    sin_dato: "sin teléfono",
    no_configurado: "WhatsApp no disponible",
    prefs: "no acepta WhatsApp",
    error: "error de envío",
  },
};

function textoMotivosOmitidos(
  canal: ComunicacionesCanal,
  metricas: ComunicacionesMetricasCampana | null | undefined,
): string | null {
  const detalle = metricas?.omitidos_motivo?.[canal];
  if (!detalle) return null;
  const partes: string[] = [];
  for (const clave of Object.keys(detalle) as OmitidoMotivoClave[]) {
    const n = detalle[clave] || 0;
    if (n <= 0) continue;
    const etiqueta = ETIQUETA_MOTIVO_OMITIDO[canal][clave];
    partes.push(
      n === 1 ? etiqueta : `${n} ${etiqueta}`,
    );
  }
  if (partes.length === 0) return null;
  return partes.join(", ");
}

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
    const motivos = textoMotivosOmitidos(canal, metricas);
    if (motivos) {
      texto += ` · ${omi} omitido${omi === 1 ? "" : "s"} (${motivos})`;
    } else {
      texto += ` · ${omi} omitido${omi === 1 ? "" : "s"}`;
    }
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

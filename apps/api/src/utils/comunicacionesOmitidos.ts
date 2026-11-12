import type { ComunicacionesCanal } from "../services/comunicaciones-metricas.service";

export type ResultadoCanalEntrega =
  | "enviado"
  | "omitido_prefs"
  | "omitido_sin_dato"
  | "omitido_config"
  | "error";

export type OmitidoMotivoClave = "sin_dato" | "no_configurado" | "prefs" | "error";

export function motivoOmitidoDesdeResultado(
  resultado: ResultadoCanalEntrega,
): OmitidoMotivoClave | null {
  if (resultado === "enviado") return null;
  if (resultado === "omitido_sin_dato") return "sin_dato";
  if (resultado === "omitido_config") return "no_configurado";
  if (resultado === "omitido_prefs") return "prefs";
  return "error";
}

export function estadoDestinatarioCampana(
  resultado: ResultadoCanalEntrega,
):
  | "enviado"
  | "omitido_prefs"
  | "omitido_sin_dato"
  | "omitido_config"
  | "error" {
  if (resultado === "enviado") return "enviado";
  if (resultado === "error") return "error";
  if (resultado === "omitido_sin_dato") return "omitido_sin_dato";
  if (resultado === "omitido_config") return "omitido_config";
  return "omitido_prefs";
}

export const ETIQUETA_MOTIVO_OMITIDO: Record<
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

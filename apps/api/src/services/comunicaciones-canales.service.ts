import { supabaseAdmin } from "../config/supabase";
import type { ComunicacionesCanal } from "./comunicaciones-metricas.service";

type ResultadoCanal = "enviado" | "omitido_prefs" | "omitido_sin_dato" | "omitido_config" | "error";

interface PerfilContacto {
  email: string | null;
  telefono: string | null;
  preferencias_notificacion: {
    push?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  } | null;
}

export class ComunicacionesCanalesService {
  static async cargarContacto(usuarioId: string): Promise<PerfilContacto | null> {
    const { data } = await supabaseAdmin
      .from("perfiles")
      .select("email, telefono, preferencias_notificacion")
      .eq("id", usuarioId)
      .maybeSingle();
    return data as PerfilContacto | null;
  }

  static async enviarEmail(
    perfil: PerfilContacto | null,
    titulo: string,
    mensaje: string,
    actionUrl?: string | null,
  ): Promise<ResultadoCanal> {
    const prefs = perfil?.preferencias_notificacion;
    if (prefs?.email === false) return "omitido_prefs";
    const destino = (perfil?.email || "").trim();
    if (!destino) return "omitido_sin_dato";

    const apiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.RESEND_FROM || "Padel Nexus <comunicaciones@padelnexus.com>";
    if (!apiKey) return "omitido_config";

    const cuerpo = actionUrl
      ? `${mensaje}\n\nVer más: ${actionUrl}`
      : mensaje;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [destino],
          subject: titulo,
          text: cuerpo,
        }),
      });
      if (!res.ok) {
        console.error("Resend email falló:", await res.text());
        return "error";
      }
      return "enviado";
    } catch (err) {
      console.error("Error al enviar email de campaña:", err);
      return "error";
    }
  }

  static async enviarWhatsApp(
    perfil: PerfilContacto | null,
    titulo: string,
    mensaje: string,
  ): Promise<ResultadoCanal> {
    const prefs = perfil?.preferencias_notificacion;
    if (prefs?.whatsapp === false) return "omitido_prefs";
    const telefono = (perfil?.telefono || "").trim();
    if (!telefono) return "omitido_sin_dato";

    if (process.env.WHATSAPP_CAMPANAS_HABILITADO !== "true") {
      return "omitido_config";
    }

    // Punto de integración con proveedor WhatsApp (fase 2).
    console.info(
      `[comunicaciones] WhatsApp pendiente de proveedor · ${telefono} · ${titulo}: ${mensaje.slice(0, 80)}`,
    );
    return "omitido_config";
  }

  static resultadoEsExito(resultado: ResultadoCanal): boolean {
    return resultado === "enviado";
  }

  static estadoDestinatario(
    resultado: ResultadoCanal,
  ): "enviado" | "omitido_prefs" | "error" {
    if (resultado === "enviado") return "enviado";
    if (resultado === "error") return "error";
    return "omitido_prefs";
  }
}

export const COMUNICACIONES_CANALES: ComunicacionesCanal[] = [
  "in_app",
  "email",
  "whatsapp",
];

export function normalizarCanales(
  raw?: string[] | null,
): ComunicacionesCanal[] {
  const allowed = new Set<string>(COMUNICACIONES_CANALES);
  const lista = (raw || ["in_app"]).filter((c): c is ComunicacionesCanal =>
    allowed.has(c),
  );
  return lista.length > 0 ? [...new Set(lista)] : ["in_app"];
}

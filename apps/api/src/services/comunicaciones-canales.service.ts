import { env } from "../config/env.config";
import { supabaseAdmin } from "../config/supabase";
import {
  campanaEmailHabilitado,
  resendFromCampana,
  urlGestionarNotificaciones,
} from "../utils/resendConfig";
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
    opciones?: {
      entidadRemitente?: string;
      gestionarUrl?: string;
    },
  ): Promise<ResultadoCanal> {
    const prefs = perfil?.preferencias_notificacion;
    if (prefs?.email === false) return "omitido_prefs";
    const destino = (perfil?.email || "").trim();
    if (!destino) return "omitido_sin_dato";

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return "omitido_config";
    if (!campanaEmailHabilitado()) return "omitido_config";

    const entidad = (opciones?.entidadRemitente || "Padel Nexus").trim();
    const from = resendFromCampana(entidad);
    const gestionarUrl = opciones?.gestionarUrl || urlGestionarNotificaciones();

    const baseWeb = (env.FRONTEND_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    const linkAbsoluto = actionUrl
      ? actionUrl.startsWith("http")
        ? actionUrl
        : `${baseWeb}${actionUrl.startsWith("/") ? actionUrl : `/${actionUrl}`}`
      : null;

    const cuerpoTexto = [
      mensaje,
      linkAbsoluto ? `\nVer más: ${linkAbsoluto}` : "",
      `\n---\nEnviado por ${entidad} · Padel Nexus.`,
      `Gestionar notificaciones: ${gestionarUrl}`,
    ]
      .filter(Boolean)
      .join("\n");

    const htmlMensaje = mensaje
      .split("\n")
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join("");
    const html = `
      ${htmlMensaje}
      ${linkAbsoluto ? `<p><a href="${escapeHtml(linkAbsoluto)}">Ver más</a></p>` : ""}
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e5e5;" />
      <p style="font-size:13px;color:#666;">
        Enviado por <strong>${escapeHtml(entidad)}</strong> · Padel Nexus.
      </p>
      <p style="font-size:13px;">
        <a href="${escapeHtml(gestionarUrl)}">Gestionar notificaciones</a>
      </p>
    `.trim();

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
          text: cuerpoTexto,
          html,
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizarCanales(
  raw?: string[] | null,
): ComunicacionesCanal[] {
  const allowed = new Set<string>(COMUNICACIONES_CANALES);
  const lista = (raw || ["in_app"]).filter((c): c is ComunicacionesCanal =>
    allowed.has(c),
  );
  return lista.length > 0 ? [...new Set(lista)] : ["in_app"];
}

import { supabaseAdmin } from "../config/supabase";

import {
  motivoOmitidoDesdeResultado,
  type OmitidoMotivoClave,
  type ResultadoCanalEntrega,
} from "../utils/comunicacionesOmitidos";

export type ComunicacionesCanal = "in_app" | "email" | "whatsapp";

export interface ComunicacionesMetricasCampana {
  entregados: Partial<Record<ComunicacionesCanal, number>>;
  omitidos: Partial<Record<ComunicacionesCanal, number>>;
  omitidos_motivo?: Partial<
    Record<ComunicacionesCanal, Partial<Record<OmitidoMotivoClave, number>>>
  >;
  /** Etiqueta institucional del remitente al momento del envío (FAP, club, etc.). */
  entidad_remitente?: string;
  abiertos: number;
  clics: number;
}

export function metricasVacias(): ComunicacionesMetricasCampana {
  return {
    entregados: {},
    omitidos: {},
    abiertos: 0,
    clics: 0,
  };
}

/** Asegura métricas legibles en listados (campañas legacy sin JSON). */
export function normalizarMetricasCampana(
  raw: unknown,
  totalEnviadosInApp?: number | null,
): ComunicacionesMetricasCampana {
  const base = metricasVacias();
  if (!raw || typeof raw !== "object") {
    if (totalEnviadosInApp != null && totalEnviadosInApp > 0) {
      return {
        ...base,
        entregados: { in_app: totalEnviadosInApp },
      };
    }
    return base;
  }
  const m = raw as ComunicacionesMetricasCampana;
  return {
    abiertos: Number(m.abiertos) || 0,
    clics: Number(m.clics) || 0,
    entregados: { ...base.entregados, ...(m.entregados || {}) },
    omitidos: { ...base.omitidos, ...(m.omitidos || {}) },
    omitidos_motivo: m.omitidos_motivo
      ? { ...m.omitidos_motivo }
      : undefined,
    entidad_remitente:
      typeof m.entidad_remitente === "string"
        ? m.entidad_remitente.trim() || undefined
        : undefined,
  };
}

export function sumarEntrega(
  metricas: ComunicacionesMetricasCampana,
  canal: ComunicacionesCanal,
  ok: boolean,
): ComunicacionesMetricasCampana {
  const bucket = ok ? "entregados" : "omitidos";
  return {
    ...metricas,
    [bucket]: {
      ...metricas[bucket],
      [canal]: (metricas[bucket][canal] || 0) + 1,
    },
  };
}

export function sumarOmitidoConMotivo(
  metricas: ComunicacionesMetricasCampana,
  canal: ComunicacionesCanal,
  motivo: OmitidoMotivoClave,
): ComunicacionesMetricasCampana {
  const conConteo = sumarEntrega(metricas, canal, false);
  const prevCanal = conConteo.omitidos_motivo?.[canal] || {};
  return {
    ...conConteo,
    omitidos_motivo: {
      ...conConteo.omitidos_motivo,
      [canal]: {
        ...prevCanal,
        [motivo]: (prevCanal[motivo] || 0) + 1,
      },
    },
  };
}

export function registrarResultadoCanal(
  metricas: ComunicacionesMetricasCampana,
  canal: ComunicacionesCanal,
  resultado: ResultadoCanalEntrega,
): ComunicacionesMetricasCampana {
  if (resultado === "enviado") {
    return sumarEntrega(metricas, canal, true);
  }
  const motivo = motivoOmitidoDesdeResultado(resultado);
  if (motivo) {
    return sumarOmitidoConMotivo(metricas, canal, motivo);
  }
  return sumarEntrega(metricas, canal, false);
}

export class ComunicacionesMetricasService {
  static async guardarMetricas(
    campanaId: string,
    metricas: ComunicacionesMetricasCampana,
  ) {
    const { error } = await supabaseAdmin
      .from("comunicaciones_campanas")
      .update({ metricas })
      .eq("id", campanaId);
    if (error) {
      console.error("Error al guardar metricas de campaña:", error.message);
    }
  }

  static async registrarApertura(campanaId: string, usuarioId: string) {
    const ahora = new Date().toISOString();
    const { data: fila } = await supabaseAdmin
      .from("comunicaciones_campana_destinatarios")
      .select("id, abierto_en")
      .eq("campana_id", campanaId)
      .eq("usuario_id", usuarioId)
      .eq("canal", "in_app")
      .maybeSingle();

    if (fila && !fila.abierto_en) {
      await supabaseAdmin
        .from("comunicaciones_campana_destinatarios")
        .update({ abierto_en: ahora })
        .eq("id", fila.id);
    }

    const { data: campana } = await supabaseAdmin
      .from("comunicaciones_campanas")
      .select("metricas")
      .eq("id", campanaId)
      .maybeSingle();

    const metricas = (campana?.metricas ||
      metricasVacias()) as ComunicacionesMetricasCampana;
    await this.guardarMetricas(campanaId, {
      ...metricas,
      abiertos: (metricas.abiertos || 0) + 1,
    });
  }

  static async registrarClic(campanaId: string, usuarioId: string) {
    const ahora = new Date().toISOString();
    const { data: fila } = await supabaseAdmin
      .from("comunicaciones_campana_destinatarios")
      .select("id")
      .eq("campana_id", campanaId)
      .eq("usuario_id", usuarioId)
      .eq("canal", "in_app")
      .maybeSingle();

    if (fila) {
      await supabaseAdmin
        .from("comunicaciones_campana_destinatarios")
        .update({ clic_en: ahora })
        .eq("id", fila.id);
    }

    const { data: campana } = await supabaseAdmin
      .from("comunicaciones_campanas")
      .select("metricas")
      .eq("id", campanaId)
      .maybeSingle();

    const metricas = (campana?.metricas ||
      metricasVacias()) as ComunicacionesMetricasCampana;
    await this.guardarMetricas(campanaId, {
      ...metricas,
      clics: (metricas.clics || 0) + 1,
    });
  }
}

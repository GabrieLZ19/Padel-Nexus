import { supabaseAdmin } from "../config/supabase";

export type ComunicacionesCanal = "in_app" | "email" | "whatsapp";

export interface ComunicacionesMetricasCampana {
  entregados: Partial<Record<ComunicacionesCanal, number>>;
  omitidos: Partial<Record<ComunicacionesCanal, number>>;
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

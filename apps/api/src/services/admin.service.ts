import { supabaseAdmin } from "../config/supabase";

interface OverridePartidoDTO {
  partidoId: string;
  usuarioAdminId: string;
  nuevoEquipoAId?: string | null;
  nuevoEquipoBId?: string | null;
  nuevoEstado?: string;
  notas?: string;
}

export class AdminService {
  /**
   * Modifica manualmente los equipos o estados de un partido en curso (Fase de Grupos o Llaves)
   * REGLA DE ORO: No destructivo con los resultados previos consolidados.
   */
  static async realizarOverridePartido(datos: OverridePartidoDTO) {
    // 1. OBTENER ESTADO ACTUAL DEL PARTIDO PARA EL REGISTRO DE AUDITORÍA
    const { data: partidoActual, error: errFetch } = await supabaseAdmin
      .from("partidos")
      .select("*")
      .eq("id", datos.partidoId)
      .single();

    if (errFetch || !partidoActual) {
      throw new Error(
        "El partido que se intenta modificar manualmente no existe.",
      );
    }

    // 2. PREPARAR EL PAYLOAD DE ACTUALIZACIÓN DINÁMICO
    const updatePayload: Record<string, any> = {};
    if (datos.nuevoEquipoAId !== undefined)
      updatePayload.equipo_a_id = datos.nuevoEquipoAId;
    if (datos.nuevoEquipoBId !== undefined)
      updatePayload.equipo_b_id = datos.nuevoEquipoBId;
    if (datos.nuevoEstado !== undefined)
      updatePayload.estado_partido = datos.nuevoEstado;

    if (Object.keys(updatePayload).length === 0) {
      throw new Error(
        "No se enviaron cambios válidos para realizar el override.",
      );
    }

    // 3. EJECUTAR LA ACTUALIZACIÓN EN LA BASE DE DATOS
    const { data: partidoModificado, error: errUpdate } = await supabaseAdmin
      .from("partidos")
      .update(updatePayload)
      .eq("id", datos.partidoId)
      .select()
      .single();

    if (errUpdate || !partidoModificado) {
      throw new Error(
        `Error al aplicar la modificación manual: ${errUpdate?.message}`,
      );
    }

    // 4. AUDITORÍA OBLIGATORIA (Guardamos el estado anterior y el nuevo en un campo JSONB seguro)
    const { error: errLog } = await supabaseAdmin
      .from("logs_auditoria")
      .insert([
        {
          usuario_id_admin: datos.usuarioAdminId,
          accion: "ADMIN_OVERRIDE_PARTIDO",
          entidad_afectada: `partido_id: ${datos.partidoId}`,
          detalles: {
            antes: {
              equipo_a_id: partidoActual.equipo_a_id,
              equipo_b_id: partidoActual.equipo_b_id,
              estado_partido: partidoActual.estado_partido,
            },
            despues: {
              equipo_a_id: partidoModificado.equipo_a_id,
              equipo_b_id: partidoModificado.equipo_b_id,
              estado_partido: partidoModificado.estado_partido,
            },
            motivo:
              datos.notas ||
              "Modificación manual del fixture por el organizador deportivo.",
          },
        },
      ]);

    if (errLog) {
      console.error(
        "❌ CRÍTICO: El override se aplicó pero falló el registro en la tabla logs_auditoria:",
        errLog.message,
      );
    }

    return partidoModificado;
  }

  /**
   * Obtiene el historial de auditoría completo de un torneo para fiscalización oficial
   */
  static async obtenerLogsTorneo(torneoId: string) {
    const { data, error } = await supabaseAdmin
      .from("logs_auditoria")
      .select("*")
      .ilike("entidad_afectada", `%${torneoId}%`)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Error al consultar la cola de auditoría.");
    return data || [];
  }
}

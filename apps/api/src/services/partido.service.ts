import { supabaseAdmin } from "../config/supabase";

interface PublicarPartidoDTO {
  reservaId: string;
  creadorId: string;
  nivelRequerido: string;
  jugadoresFaltantes: number;
  notas?: string;
}

export class PartidoService {
  static async publicarPartidoAbierto(datos: PublicarPartidoDTO) {
    // Insertamos en la tabla real según tu esquema: partidos_abiertos
    const { data, error } = await supabaseAdmin
      .from("partidos_abiertos")
      .insert([
        {
          reserva_id: datos.reservaId,
          creador_id: datos.creadorId,
          nivel_requerido: datos.nivelRequerido,
          jugadores_faltantes: datos.jugadoresFaltantes,
          notas: datos.notas || null,
          estado: "abierto",
        },
      ])
      .select()
      .single();

    if (error)
      throw new Error(`Error al publicar el partido abierto: ${error.message}`);
    return data;
  }

  static async obtenerPartidosAbiertos(nivelRequerido?: string) {
    let query = supabaseAdmin
      .from("partidos_abiertos")
      .select(
        `
        *,
        perfiles!partidos_abiertos_creador_id_fkey (nombre, apellido, avatar_url),
        reservas (fecha_reserva, turno_id)
      `,
      )
      .eq("estado", "abierto");

    if (nivelRequerido) {
      query = query.eq("nivel_requerido", nivelRequerido);
    }

    const { data, error } = await query;
    if (error)
      throw new Error("Error al obtener el listado de partidos abiertos.");
    return data;
  }

  static async unirseAPartidoExistente(partidoId: string, jugadorId: string) {
    // 1. Obtener estado del partido abierto utilizando la tabla correcta
    const { data: partido, error: pError } = await supabaseAdmin
      .from("partidos_abiertos")
      .select("id, jugadores_faltantes, estado")
      .eq("id", partidoId)
      .single();

    if (pError || !partido) throw new Error("El partido abierto no existe.");
    if (partido.estado !== "abierto" || partido.jugadores_faltantes <= 0) {
      throw new Error("El partido ya se encuentra completo o cerrado.");
    }

    // 2. Verificar si el usuario ya está inscrito en este partido
    const { data: yaInscripto } = await supabaseAdmin
      .from("inscripciones_partidos")
      .select("id")
      .eq("partido_id", partidoId)
      .eq("jugador_id", jugadorId)
      .maybeSingle();

    if (yaInscripto)
      throw new Error("Ya estás inscrito en este partido abierto.");

    // 3. Registrar al usuario en la tabla intermedia correcta: inscripciones_partidos
    const { error: insError } = await supabaseAdmin
      .from("inscripciones_partidos")
      .insert([
        { partido_id: partidoId, jugador_id: jugadorId, estado: "confirmado" },
      ]);

    if (insError)
      throw new Error("No se pudo registrar tu inscripción al partido.");

    // 4. Actualizar de forma atómica los cupos restantes
    const nuevosFaltantes = partido.jugadores_faltantes - 1;
    const nuevoEstado = nuevosFaltantes === 0 ? "completo" : "abierto";

    const { error: updError } = await supabaseAdmin
      .from("partidos_abiertos")
      .update({
        jugadores_faltantes: nuevosFaltantes,
        estado: nuevoEstado,
      })
      .eq("id", partidoId);

    if (updError) throw new Error("Error al actualizar los cupos del partido.");

    return { nuevosFaltantes, estado: nuevoEstado };
  }
}

import { supabaseAdmin } from "../config/supabase";

interface PublicarPartidoDTO {
  reservaId: string;
  creadorId: string;
  nivelRequerido: string;
  jugadoresFaltantes: number;
  notas?: string;
}

export interface FiltrosPartidosAbiertos {
  nivelRequerido?: string;
  provincia?: string;
  localidad?: string;
  franja?: "manana" | "tarde" | "noche";
}

type PartidoAbiertoRow = {
  id: string;
  reserva_id: string;
  creador_id: string;
  nivel_requerido: string | null;
  jugadores_faltantes: number;
  notas: string | null;
  estado: string;
  created_at: string;
  perfiles?: {
    nombre: string | null;
    apellido: string | null;
    avatar_url: string | null;
  } | null;
  reservas?: {
    id: string;
    fecha_reserva: string;
    turno_id: string;
    turnos?: {
      id: string;
      hora_inicio: string;
      hora_fin: string;
      canchas?: {
        id: string;
        nombre: string;
        clubes?: {
          id: string;
          nombre: string;
          localidad: string | null;
          provincia: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
  inscripciones_partidos?: Array<{
    id: string;
    jugador_id: string;
    estado: string;
    perfiles?: {
      nombre: string | null;
      apellido: string | null;
      avatar_url: string | null;
    } | null;
  }>;
};

function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function matchFranja(
  horaInicio: string | undefined,
  franja: FiltrosPartidosAbiertos["franja"],
): boolean {
  if (!franja || !horaInicio) return true;
  const mins = horaAMinutos(horaInicio);
  if (franja === "manana") return mins < 12 * 60;
  if (franja === "tarde") return mins >= 12 * 60 && mins < 18 * 60;
  return mins >= 18 * 60;
}

export class PartidoService {
  static async publicarPartidoAbierto(datos: PublicarPartidoDTO) {
    const faltantes = Number(datos.jugadoresFaltantes);
    if (!Number.isInteger(faltantes) || faltantes < 1 || faltantes > 3) {
      throw new Error("jugadores_faltantes debe ser un entero entre 1 y 3.");
    }

    if (!datos.nivelRequerido?.trim()) {
      throw new Error("nivel_requerido es obligatorio.");
    }

    const { data: reserva, error: reservaError } = await supabaseAdmin
      .from("reservas")
      .select("id, usuario_id, estado_reserva, fecha_reserva")
      .eq("id", datos.reservaId)
      .single();

    if (reservaError || !reserva) {
      throw new Error("La reserva no existe.");
    }

    if (reserva.usuario_id !== datos.creadorId) {
      throw new Error("Solo el dueño de la reserva puede publicar el partido.");
    }

    if (reserva.estado_reserva !== "confirmada") {
      throw new Error(
        "Solo se pueden publicar partidos sobre reservas confirmadas.",
      );
    }

    const { data: existente } = await supabaseAdmin
      .from("partidos_abiertos")
      .select("id, estado")
      .eq("reserva_id", datos.reservaId)
      .in("estado", ["abierto", "completo"])
      .maybeSingle();

    if (existente) {
      throw new Error("Ya existe un partido abierto para esta reserva.");
    }

    const { data, error } = await supabaseAdmin
      .from("partidos_abiertos")
      .insert([
        {
          reserva_id: datos.reservaId,
          creador_id: datos.creadorId,
          nivel_requerido: datos.nivelRequerido.trim(),
          jugadores_faltantes: faltantes,
          notas: datos.notas?.trim() || null,
          estado: "abierto",
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Error al publicar el partido abierto: ${error.message}`);
    }

    const { error: insError } = await supabaseAdmin
      .from("inscripciones_partidos")
      .insert([
        {
          partido_id: data.id,
          jugador_id: datos.creadorId,
          estado: "confirmado",
        },
      ]);

    if (insError) {
      await supabaseAdmin.from("partidos_abiertos").delete().eq("id", data.id);
      throw new Error("No se pudo registrar al creador en el partido.");
    }

    return data;
  }

  static async obtenerPartidosAbiertos(filtros: FiltrosPartidosAbiertos = {}) {
    let query = supabaseAdmin
      .from("partidos_abiertos")
      .select(
        `
        *,
        perfiles!partidos_abiertos_creador_id_fkey (nombre, apellido, avatar_url),
        reservas (
          id,
          fecha_reserva,
          turno_id,
          turnos (
            id,
            hora_inicio,
            hora_fin,
            canchas (
              id,
              nombre,
              clubes (
                id,
                nombre,
                localidad,
                provincia
              )
            )
          )
        ),
        inscripciones_partidos (
          id,
          jugador_id,
          estado,
          perfiles:perfiles!inscripciones_partidos_jugador_id_fkey (
            nombre,
            apellido,
            avatar_url
          )
        )
      `,
      )
      .eq("estado", "abierto")
      .order("created_at", { ascending: false });

    if (filtros.nivelRequerido) {
      query = query.eq("nivel_requerido", filtros.nivelRequerido);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(
        `Error al obtener el listado de partidos abiertos: ${error.message}`,
      );
    }

    const rows = (data || []) as PartidoAbiertoRow[];

    return rows.filter((partido) => {
      const club = partido.reservas?.turnos?.canchas?.clubes;
      const horaInicio = partido.reservas?.turnos?.hora_inicio;

      if (
        filtros.provincia &&
        (club?.provincia || "").toLowerCase() !==
          filtros.provincia.toLowerCase()
      ) {
        return false;
      }

      if (
        filtros.localidad &&
        (club?.localidad || "").toLowerCase() !==
          filtros.localidad.toLowerCase()
      ) {
        return false;
      }

      if (!matchFranja(horaInicio, filtros.franja)) {
        return false;
      }

      return true;
    });
  }

  static async unirseAPartidoExistente(partidoId: string, jugadorId: string) {
    const { data: partido, error: pError } = await supabaseAdmin
      .from("partidos_abiertos")
      .select("id, creador_id, jugadores_faltantes, estado")
      .eq("id", partidoId)
      .single();

    if (pError || !partido) throw new Error("El partido abierto no existe.");

    if (partido.creador_id === jugadorId) {
      throw new Error("No podés unirte a tu propio partido.");
    }

    if (partido.estado !== "abierto" || partido.jugadores_faltantes <= 0) {
      throw new Error("El partido ya se encuentra completo o cerrado.");
    }

    const { data: yaInscripto } = await supabaseAdmin
      .from("inscripciones_partidos")
      .select("id")
      .eq("partido_id", partidoId)
      .eq("jugador_id", jugadorId)
      .maybeSingle();

    if (yaInscripto) {
      throw new Error("Ya estás inscrito en este partido abierto.");
    }

    const { error: insError } = await supabaseAdmin
      .from("inscripciones_partidos")
      .insert([
        { partido_id: partidoId, jugador_id: jugadorId, estado: "confirmado" },
      ]);

    if (insError) {
      throw new Error("No se pudo registrar tu inscripción al partido.");
    }

    const nuevosFaltantes = partido.jugadores_faltantes - 1;
    const nuevoEstado = nuevosFaltantes === 0 ? "completo" : "abierto";

    const { data: actualizado, error: updError } = await supabaseAdmin
      .from("partidos_abiertos")
      .update({
        jugadores_faltantes: nuevosFaltantes,
        estado: nuevoEstado,
      })
      .eq("id", partidoId)
      .eq("estado", "abierto")
      .gt("jugadores_faltantes", 0)
      .select("id")
      .maybeSingle();

    if (updError || !actualizado) {
      await supabaseAdmin
        .from("inscripciones_partidos")
        .delete()
        .eq("partido_id", partidoId)
        .eq("jugador_id", jugadorId);
      throw new Error(
        "El partido ya no tiene cupos disponibles. Intentá con otro.",
      );
    }

    return { nuevosFaltantes, estado: nuevoEstado };
  }

  static async tienePartidoParaReserva(reservaId: string) {
    const { data } = await supabaseAdmin
      .from("partidos_abiertos")
      .select("id, estado")
      .eq("reserva_id", reservaId)
      .in("estado", ["abierto", "completo"])
      .maybeSingle();

    return data || null;
  }
}

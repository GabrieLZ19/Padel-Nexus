import { supabaseAdmin } from "../config/supabase";
import { NotificacionService } from "./notificacion.service";
import { esTurnoReservaFinalizado } from "../utils/fechaArgentina";

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
  conversacion_id?: string | null;
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

const PARTIDO_SELECT = `
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
`;

async function crearConversacionPartido(
  partidoId: string,
  creadorId: string,
): Promise<string> {
  const { data: conv, error: convError } = await supabaseAdmin
    .from("chat_conversaciones")
    .insert({ creado_por: creadorId, tipo: "partido" })
    .select("id")
    .single();

  if (convError || !conv) {
    throw new Error("No se pudo crear el chat del partido.");
  }

  const { error: partError } = await supabaseAdmin
    .from("chat_participantes")
    .insert({ conversacion_id: conv.id, perfil_id: creadorId });

  if (partError) {
    await supabaseAdmin.from("chat_conversaciones").delete().eq("id", conv.id);
    throw new Error("No se pudo registrar al organizador en el chat.");
  }

  await supabaseAdmin
    .from("partidos_abiertos")
    .update({ conversacion_id: conv.id })
    .eq("id", partidoId);

  return conv.id;
}

async function agregarParticipanteChat(
  conversacionId: string,
  perfilId: string,
): Promise<void> {
  const { data: existente } = await supabaseAdmin
    .from("chat_participantes")
    .select("perfil_id")
    .eq("conversacion_id", conversacionId)
    .eq("perfil_id", perfilId)
    .maybeSingle();

  if (existente) return;

  await supabaseAdmin
    .from("chat_participantes")
    .insert({ conversacion_id: conversacionId, perfil_id: perfilId });
}

async function removerParticipanteChat(
  conversacionId: string,
  perfilId: string,
): Promise<void> {
  await supabaseAdmin
    .from("chat_participantes")
    .delete()
    .eq("conversacion_id", conversacionId)
    .eq("perfil_id", perfilId);
}

function nombrePerfil(
  perfil?: { nombre: string | null; apellido: string | null } | null,
): string {
  if (!perfil) return "Un jugador";
  const parts = [perfil.nombre, perfil.apellido].filter(Boolean);
  return parts.length ? parts.join(" ") : "Un jugador";
}

function partidoReservaVencida(partido: PartidoAbiertoRow): boolean {
  const fecha = partido.reservas?.fecha_reserva;
  const horaFin = partido.reservas?.turnos?.hora_fin;
  if (!fecha || !horaFin) return false;
  return esTurnoReservaFinalizado(fecha, horaFin);
}

export class PartidoService {
  static async cerrarPartidosVencidos(): Promise<void> {
    const { data: candidatos } = await supabaseAdmin
      .from("partidos_abiertos")
      .select(
        `
        id,
        reservas (
          fecha_reserva,
          turnos (hora_fin)
        )
      `,
      )
      .in("estado", ["abierto", "completo"]);

    const idsCerrar = (candidatos || [])
      .filter((row) =>
        partidoReservaVencida(row as unknown as PartidoAbiertoRow),
      )
      .map((row) => row.id);

    if (idsCerrar.length === 0) return;

    await supabaseAdmin
      .from("partidos_abiertos")
      .update({ estado: "cerrado" })
      .in("id", idsCerrar);
  }

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

    try {
      await crearConversacionPartido(data.id, datos.creadorId);
    } catch (chatError) {
      console.warn("Chat de partido no creado:", chatError);
    }

    const { data: completo } = await supabaseAdmin
      .from("partidos_abiertos")
      .select(PARTIDO_SELECT)
      .eq("id", data.id)
      .single();

    return completo || data;
  }

  static async obtenerPartidoPorId(partidoId: string) {
    await PartidoService.cerrarPartidosVencidos();

    const { data, error } = await supabaseAdmin
      .from("partidos_abiertos")
      .select(PARTIDO_SELECT)
      .eq("id", partidoId)
      .single();

    if (error || !data) {
      throw new Error("El partido no existe.");
    }

    return data as PartidoAbiertoRow;
  }

  static async obtenerPartidosAbiertos(filtros: FiltrosPartidosAbiertos = {}) {
    await PartidoService.cerrarPartidosVencidos();

    let query = supabaseAdmin
      .from("partidos_abiertos")
      .select(PARTIDO_SELECT)
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
      if (partidoReservaVencida(partido)) return false;

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
    await PartidoService.cerrarPartidosVencidos();

    const { data: partido, error: pError } = await supabaseAdmin
      .from("partidos_abiertos")
      .select(
        "id, creador_id, jugadores_faltantes, estado, conversacion_id, reservas (fecha_reserva, turnos (hora_fin))",
      )
      .eq("id", partidoId)
      .single();

    if (pError || !partido) throw new Error("El partido abierto no existe.");

    if (
      partidoReservaVencida(partido as unknown as PartidoAbiertoRow)
    ) {
      await supabaseAdmin
        .from("partidos_abiertos")
        .update({ estado: "cerrado" })
        .eq("id", partidoId);
      throw new Error("Este partido ya finalizó (la reserva pasó).");
    }

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

    if (partido.conversacion_id) {
      await agregarParticipanteChat(partido.conversacion_id, jugadorId);
    }

    const { data: perfilUnidor } = await supabaseAdmin
      .from("perfiles")
      .select("nombre, apellido")
      .eq("id", jugadorId)
      .single();

    await NotificacionService.crearNotificacion({
      usuario_id: partido.creador_id,
      titulo: "¡Alguien se sumó!",
      mensaje: `${nombrePerfil(perfilUnidor)} se unió a tu convocatoria Nos falta uno.`,
      tipo: "success",
      metadata: {
        partido_id: partidoId,
        tipo_evento: "partido_jugador_unido",
        action_url: `/partidos/${partidoId}`,
      },
    });

    return { nuevosFaltantes, estado: nuevoEstado };
  }

  static async salirDePartidoAbierto(partidoId: string, usuarioId: string) {
    await PartidoService.cerrarPartidosVencidos();

    const { data: partido, error: pError } = await supabaseAdmin
      .from("partidos_abiertos")
      .select(
        "id, creador_id, jugadores_faltantes, estado, conversacion_id, reservas (fecha_reserva, turnos (hora_fin))",
      )
      .eq("id", partidoId)
      .single();

    if (pError || !partido) throw new Error("El partido abierto no existe.");

    if (
      partidoReservaVencida(partido as unknown as PartidoAbiertoRow)
    ) {
      await supabaseAdmin
        .from("partidos_abiertos")
        .update({ estado: "cerrado" })
        .eq("id", partidoId);
      throw new Error("Este partido ya finalizó (la reserva pasó).");
    }

    if (partido.estado === "cerrado" || partido.estado === "cancelado") {
      throw new Error("Esta convocatoria ya no está activa.");
    }

    if (partido.creador_id === usuarioId) {
      const { error: cancelError } = await supabaseAdmin
        .from("partidos_abiertos")
        .update({ estado: "cancelado" })
        .eq("id", partidoId)
        .in("estado", ["abierto", "completo"]);

      if (cancelError) {
        throw new Error("No se pudo cancelar la convocatoria.");
      }

      return { accion: "cancelado" as const };
    }

    const { data: inscripcion } = await supabaseAdmin
      .from("inscripciones_partidos")
      .select("id")
      .eq("partido_id", partidoId)
      .eq("jugador_id", usuarioId)
      .maybeSingle();

    if (!inscripcion) {
      throw new Error("No estás anotado en esta convocatoria.");
    }

    const { error: deleteError } = await supabaseAdmin
      .from("inscripciones_partidos")
      .delete()
      .eq("id", inscripcion.id);

    if (deleteError) {
      throw new Error("No se pudo registrar tu salida del partido.");
    }

    const nuevosFaltantes = partido.jugadores_faltantes + 1;

    const { error: updError } = await supabaseAdmin
      .from("partidos_abiertos")
      .update({
        jugadores_faltantes: nuevosFaltantes,
        estado: "abierto",
      })
      .eq("id", partidoId)
      .in("estado", ["abierto", "completo"]);

    if (updError) {
      await supabaseAdmin.from("inscripciones_partidos").insert([
        {
          partido_id: partidoId,
          jugador_id: usuarioId,
          estado: "confirmado",
        },
      ]);
      throw new Error("No se pudo actualizar la convocatoria.");
    }

    if (partido.conversacion_id) {
      await removerParticipanteChat(partido.conversacion_id, usuarioId);
    }

    const { data: perfilSaliente } = await supabaseAdmin
      .from("perfiles")
      .select("nombre, apellido")
      .eq("id", usuarioId)
      .single();

    await NotificacionService.crearNotificacion({
      usuario_id: partido.creador_id,
      titulo: "Alguien se bajó",
      mensaje: `${nombrePerfil(perfilSaliente)} abandonó tu convocatoria Nos falta uno.`,
      tipo: "info",
      metadata: {
        partido_id: partidoId,
        tipo_evento: "partido_jugador_salio",
        action_url: `/partidos/${partidoId}`,
      },
    });

    return {
      accion: "abandonado" as const,
      nuevosFaltantes,
      estado: "abierto" as const,
    };
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

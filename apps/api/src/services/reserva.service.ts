import { supabaseAdmin } from "../config/supabase";
import { MercadoPagoConfig, Preference } from "mercadopago";
import {
  buildMercadoPagoBackUrls,
  getMercadoPagoAccessToken,
  isMercadoPagoConfigured,
  resolveMercadoPagoInitPoint,
} from "../config/mercadopago";
import { esHorarioReservaPasado } from "../utils/fechaArgentina";
import {
  assertMetodoPagoReservaPermitido,
  type ClubMetodosPagoConfig,
} from "../utils/metodos-pago-reserva";
import { ClubService } from "./club.service";
import {
  reservaOcupaTurno,
  reservaPendienteExpirada,
  retencionInicialDesde,
  retencionMercadoPagoDesde,
  retencionTransferenciaDesde,
  limitePagoReserva,
} from "../utils/reservaRetencion";
import { evaluarCancelacionReservaJugador } from "../utils/cancelacionReservaJugador";
import { mensajeNotificacionReservaCanceladaPorJugador } from "../utils/reservaCancelacion";
import { RESERVA_MOTIVO_PAGO_VENCIDO } from "../constants/reserva";

// ── Tipos ──────────────────────────────────────────────────────────────

export interface SlotDisponible {
  turno_id: string;
  cancha_id: string;
  cancha_nombre: string;
  tipo_suelo: string | null;
  techada: boolean;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  disponible: boolean;
  motivo_bloqueo?: string | null;
}

export interface CrearReservaDTO {
  turno_id: string;
  usuario_id: string;
  fecha_reserva: string; // YYYY-MM-DD
}

// ── Servicio ───────────────────────────────────────────────────────────

export class ReservaService {
  private static esReservaMarcadaPagoVencido(reserva: {
    estado_reserva?: string | null;
    motivo_cancelacion?: string | null;
  }): boolean {
    return (
      (reserva.estado_reserva || "").toLowerCase() === "cancelada" &&
      (reserva.motivo_cancelacion || "").trim() === RESERVA_MOTIVO_PAGO_VENCIDO
    );
  }

  /**
   * Marca la reserva como cancelada por plazo de pago y libera el turno (sin borrar el registro).
   */
  static async marcarReservaVencidaPorPago(
    reservaId: string,
    opciones?: { notificar?: boolean },
  ): Promise<boolean> {
    const { data: reserva, error } = await supabaseAdmin
      .from("reservas")
      .select(
        "id, usuario_id, estado_reserva, estado_pago, motivo_cancelacion",
      )
      .eq("id", reservaId)
      .maybeSingle();

    if (error || !reserva) return false;
    if (ReservaService.esReservaMarcadaPagoVencido(reserva)) return false;
    if (
      (reserva.estado_reserva || "").toLowerCase() !== "pendiente" ||
      (reserva.estado_pago || "").toLowerCase() === "completado"
    ) {
      return false;
    }

    const ahora = new Date().toISOString();

    await supabaseAdmin
      .from("pagos")
      .update({ estado: "rechazado" })
      .eq("reserva_id", reservaId)
      .eq("estado", "pendiente");

    const { error: updError } = await supabaseAdmin
      .from("reservas")
      .update({
        estado_reserva: "cancelada",
        estado_pago: "cancelado",
        motivo_cancelacion: RESERVA_MOTIVO_PAGO_VENCIDO,
        cancelada_en: ahora,
        retiene_hasta: null,
      })
      .eq("id", reservaId);

    if (updError) return false;

    if (opciones?.notificar !== false && reserva.usuario_id) {
      await ReservaService.enviarNotificacionReservaPagoVencido(
        reservaId,
        String(reserva.usuario_id),
      );
    }
    return true;
  }

  /**
   * Libera turnos con reservas pendientes cuya retención ya venció (checkout abandonado).
   */
  private static async liberarPendientesExpiradas(
    turnoIds: string[],
    fecha: string,
  ) {
    if (turnoIds.length === 0) return;
    const ahora = new Date();
    const { data: candidatas, error } = await supabaseAdmin
      .from("reservas")
      .select(
        "id, estado_reserva, estado_pago, created_at, retiene_hasta, usuario_id",
      )
      .in("turno_id", turnoIds)
      .eq("fecha_reserva", fecha)
      .eq("estado_reserva", "pendiente");

    if (error) throw new Error("Error al liberar reservas pendientes expiradas.");

    const expiradas = (candidatas || []).filter((r) =>
      reservaPendienteExpirada(r, ahora),
    );
    await Promise.all(
      expiradas.map((r) =>
        ReservaService.marcarReservaVencidaPorPago(String(r.id)),
      ),
    );
  }

  private static async liberarPendientesExpiradasUsuario(usuarioId: string) {
    const ahora = new Date();
    const { data: candidatas, error } = await supabaseAdmin
      .from("reservas")
      .select(
        "id, estado_reserva, estado_pago, created_at, retiene_hasta, fecha_reserva, usuario_id, turno_id",
      )
      .eq("usuario_id", usuarioId)
      .eq("estado_reserva", "pendiente")
      .eq("estado_pago", "pendiente");

    if (error || !candidatas?.length) return;

    const expiradas = candidatas.filter((r) => reservaPendienteExpirada(r, ahora));
    if (expiradas.length === 0) return;

    await Promise.all(
      expiradas.map((r) =>
        ReservaService.marcarReservaVencidaPorPago(String(r.id)),
      ),
    );
  }

  static async enviarNotificacionReservaPagoVencido(
    reservaId: string,
    usuarioId: string,
  ) {
    try {
      const { NotificacionService } = await import("./notificacion.service");
      await NotificacionService.crearNotificacion({
        usuario_id: usuarioId,
        titulo: "Plazo de pago vencido",
        mensaje:
          "Tu reserva pendiente de pago expiró y el turno quedó liberado. Podés elegir otro horario desde Reservar.",
        tipo: "warning",
        metadata: { reserva_id: reservaId, motivo: "pago_vencido" },
      });
    } catch (e) {
      console.warn("Error al notificar vencimiento de pago de reserva:", e);
    }
  }

  /**
   * Obtiene la disponibilidad de todos los turnos de un club para una fecha dada.
   * Cruza los turnos semanales preestablecidos con las reservas existentes.
   */
  static async obtenerDisponibilidad(
    clubId: string,
    fecha: string,
  ): Promise<SlotDisponible[]> {
    await ClubService.assertClubReservablePublico(clubId);

    // Calcular el día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
    const fechaDate = new Date(fecha + "T12:00:00Z");
    const diaSemana = fechaDate.getUTCDay();

    // 1. Obtener canchas activas del club
    const { data: canchas, error: canchasError } = await supabaseAdmin
      .from("canchas")
      .select("id, nombre, tipo_suelo, techada")
      .eq("club_id", clubId)
      .eq("activa", true);

    if (canchasError) throw new Error("Error al obtener las canchas del club.");
    if (!canchas || canchas.length === 0) return [];

    const canchaIds = canchas.map((c) => c.id);

    // 2. Obtener turnos del día de la semana para esas canchas
    const { data: turnos, error: turnosError } = await supabaseAdmin
      .from("turnos")
      .select("id, cancha_id, hora_inicio, hora_fin, precio")
      .in("cancha_id", canchaIds)
      .eq("dia_semana", diaSemana);

    if (turnosError)
      throw new Error("Error al obtener los turnos disponibles.");
    if (!turnos || turnos.length === 0) return [];

    const turnoIds = turnos.map((t) => t.id);

    await this.liberarPendientesExpiradas(turnoIds, fecha);

    const ahora = new Date();

    // 3. Reservas que ocupan el turno (confirmadas o pendientes con retención vigente)
    const { data: reservas, error: reservasError } = await supabaseAdmin
      .from("reservas")
      .select("turno_id, estado_reserva, created_at, retiene_hasta")
      .in("turno_id", turnoIds)
      .eq("fecha_reserva", fecha)
      .neq("estado_reserva", "cancelada");

    if (reservasError)
      throw new Error("Error al consultar las reservas existentes.");

    // 3b. Partidos de torneo en esas canchas/fecha (schema real)
    const { data: partidosTorneo } = await supabaseAdmin
      .from("partidos")
      .select("cancha_asignada, franja_horaria, fecha_partido")
      .in("cancha_asignada", canchaIds)
      .eq("fecha_partido", fecha);

    // 3c. Bloqueos de franja del club (abonos / torneo / mantenimiento)
    const { data: bloqueos } = await supabaseAdmin
      .from("bloqueos_disponibilidad")
      .select("cancha_id, hora_inicio, hora_fin, motivo")
      .eq("club_id", clubId)
      .eq("activo", true)
      .lte("fecha_inicio", fecha)
      .gte("fecha_fin", fecha);

    const turnosOcupados = new Set(
      (reservas || [])
        .filter((r) => reservaOcupaTurno(r, ahora))
        .map((r) => r.turno_id as string),
    );

    const toMin = (t: string) => {
      const [h, m] = String(t).slice(0, 5).split(":").map(Number);
      return h * 60 + m;
    };
    const overlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
      const aS = toMin(aStart);
      const aRawE = toMin(aEnd);
      const aE = aRawE <= aS ? aRawE + 1440 : aRawE;
      const bS = toMin(bStart);
      const bRawE = toMin(bEnd);
      const bE = bRawE <= bS ? bRawE + 1440 : bRawE;
      return aS < bE && aE > bS;
    };

    const franjaInicio = (franja: string | null | undefined) => {
      if (!franja) return null;
      const m = String(franja).match(/(\d{1,2}:\d{2})/);
      return m ? m[1] : null;
    };

    // 4. Construir la grilla de disponibilidad
    const canchasMap = new Map(canchas.map((c) => [c.id, c]));

    const slots: SlotDisponible[] = turnos.map((turno) => {
      const cancha = canchasMap.get(turno.cancha_id);

      const horaIni = String(turno.hora_inicio).slice(0, 5);
      const tienePartidoTorneo = (partidosTorneo || []).some((p) => {
        if (p.cancha_asignada !== turno.cancha_id) return false;
        const hi = franjaInicio(p.franja_horaria as string | null);
        return hi != null && hi === horaIni;
      });

      const bloqueo = (bloqueos || []).find((b) => {
        if (b.cancha_id && b.cancha_id !== turno.cancha_id) return false;
        return overlap(
          String(turno.hora_inicio),
          String(turno.hora_fin),
          String(b.hora_inicio),
          String(b.hora_fin),
        );
      });

      const estaOcupado =
        turnosOcupados.has(turno.id) || tienePartidoTorneo || !!bloqueo;
      const horarioPasado = esHorarioReservaPasado(fecha, turno.hora_inicio);

      return {
        turno_id: turno.id,
        cancha_id: turno.cancha_id,
        cancha_nombre: cancha?.nombre ?? "Sin nombre",
        tipo_suelo: cancha?.tipo_suelo ?? null,
        techada: cancha?.techada ?? false,
        hora_inicio: turno.hora_inicio,
        hora_fin: turno.hora_fin,
        precio: turno.precio,
        disponible: !estaOcupado && !horarioPasado,
        motivo_bloqueo: bloqueo?.motivo ?? (bloqueo ? "Horario bloqueado" : null),
      };
    });

    // Ordenar por cancha y luego por hora
    slots.sort((a, b) => {
      if (a.cancha_nombre !== b.cancha_nombre)
        return a.cancha_nombre.localeCompare(b.cancha_nombre);
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });

    return slots;
  }

  /**
   * Crea una reserva tras verificar que no exista solapamiento.
   * Las pendientes expiradas se liberan; las vigentes retienen el turno (RES-1).
   */
  static async crearReserva(dto: CrearReservaDTO) {
    const { turno_id, usuario_id, fecha_reserva } = dto;

    // Obtener los detalles del turno para validar la hora de inicio
    const { data: turno, error: turnoError } = await supabaseAdmin
      .from("turnos")
      .select("hora_inicio, hora_fin, cancha_id, canchas(club_id)")
      .eq("id", turno_id)
      .single();

    if (turnoError || !turno) throw new Error("Turno no encontrado.");

    // Validar contra hora local Argentina (evita falsos positivos en servidores UTC)
    if (esHorarioReservaPasado(fecha_reserva, turno.hora_inicio)) {
      throw new Error("FECHA_PASADA");
    }

    const clubId = (turno.canchas as { club_id?: string } | null)?.club_id;
    if (clubId) {
      await ClubService.assertClubReservablePublico(clubId);
      const bloqueo = await ClubService.slotEstaBloqueado(
        clubId,
        turno.cancha_id,
        fecha_reserva,
        String(turno.hora_inicio),
        String(turno.hora_fin),
      );
      if (bloqueo.bloqueado) {
        throw new Error("TURNO_BLOQUEADO");
      }
    }

    await this.liberarPendientesExpiradas([turno_id], fecha_reserva);

    const ahora = new Date();

    // 1. Verificar solapamiento
    const { data: existentes, error: checkError } = await supabaseAdmin
      .from("reservas")
      .select("id, estado_reserva, usuario_id, created_at, retiene_hasta")
      .eq("turno_id", turno_id)
      .eq("fecha_reserva", fecha_reserva);

    if (checkError) throw new Error("Error al verificar disponibilidad.");

    if (existentes && existentes.length > 0) {
      const confirmada = existentes.find(
        (r) => r.estado_reserva === "confirmada",
      );
      if (confirmada) {
        throw new Error("TURNO_OCUPADO");
      }

      const vigentes = existentes.filter(
        (r) =>
          r.estado_reserva === "pendiente" && reservaOcupaTurno(r, ahora),
      );
      if (vigentes.length > 0) {
        const delUsuario = vigentes.find((r) => r.usuario_id === usuario_id);
        if (delUsuario) {
          return this.obtenerReservaPorId(delUsuario.id);
        }
        throw new Error("TURNO_OCUPADO");
      }

    }

    const retieneHasta = retencionInicialDesde(ahora);

    // 2. Crear la reserva en estado pendiente
    const { data, error } = await supabaseAdmin
      .from("reservas")
      .insert([
        {
          turno_id,
          usuario_id,
          fecha_reserva,
          estado_reserva: "pendiente",
          estado_pago: "pendiente",
          retiene_hasta: retieneHasta,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear la reserva: ${error.message}`);
    // Devolver detalle completo (turno/cancha/club) para el checkout.
    return this.obtenerReservaPorId(data.id);
  }

  /**
   * Obtiene los detalles de un turno con su cancha y club (para el checkout antes de reservar).
   */
  static async obtenerTurnoConDetalles(turnoId: string) {
    const { data, error } = await supabaseAdmin
      .from("turnos")
      .select(
        `
        id, hora_inicio, hora_fin, precio, dia_semana,
        canchas (
          id, nombre, tipo_suelo, techada,
          clubes ( id, nombre, provincia, localidad, direccion, latitud, longitud, cbu, alias, suscripcion_sin_comisiones, pago_transferencia_habilitado, pago_efectivo_habilitado )
        )
      `,
      )
      .eq("id", turnoId)
      .single();

    if (error || !data) throw new Error("Turno no encontrado.");
    return data;
  }

  /**
   * Obtiene una reserva por su ID con datos del turno, la cancha y los pagos.
   */
  static async obtenerReservaPorId(reservaId: string) {
    const { data, error } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        *,
        turnos (
          id, hora_inicio, hora_fin, precio, dia_semana,
          canchas (
            id, nombre, tipo_suelo, techada,
            clubes ( id, nombre, provincia, localidad, direccion, latitud, longitud, cbu, alias, suscripcion_sin_comisiones, pago_transferencia_habilitado, pago_efectivo_habilitado )
          )
        ),
        pagos (
          id, monto, metodo_pago, referencia_pago, estado, comprobante_url, created_at
        )
      `,
      )
      .eq("id", reservaId)
      .single();

    if (error || !data) throw new Error("Reserva no encontrada.");

    if (ReservaService.esReservaMarcadaPagoVencido(data)) {
      throw new Error("RESERVA_PAGO_VENCIDO");
    }

    const ahora = new Date();
    if (reservaPendienteExpirada(data, ahora)) {
      await ReservaService.marcarReservaVencidaPorPago(reservaId);
      throw new Error("RESERVA_PAGO_VENCIDO");
    }

    const limite = limitePagoReserva(data);
    return {
      ...data,
      retiene_hasta:
        data.retiene_hasta || (limite ? limite.toISOString() : null),
    };
  }

  /**
   * Confirma el pago de una reserva y registra el pago en la tabla de pagos.
   * Si es por transferencia, se registra en estado pendiente a la espera de validación.
   */
  static async confirmarPago(
    reservaId: string,
    usuarioId: string,
    monto: number,
    metodoPago: string,
    referenciaPago?: string,
    comprobanteUrl?: string,
  ) {
    // 1. Verificar que la reserva existe y pertenece al usuario
    const { data: reserva, error: rError } = await supabaseAdmin
      .from("reservas")
      .select(
        `
        id, usuario_id, estado_pago, estado_reserva, created_at, retiene_hasta, motivo_cancelacion,
        turnos (
          canchas (
            clubes ( id, nombre, provincia, localidad, direccion, latitud, longitud, cbu, alias, suscripcion_sin_comisiones, pago_transferencia_habilitado, pago_efectivo_habilitado )
          )
        )
      `,
      )
      .eq("id", reservaId)
      .single();

    if (rError || !reserva) throw new Error("Reserva no encontrada.");
    if (reserva.usuario_id !== usuarioId)
      throw new Error("No tiene permiso sobre esta reserva.");
    if (ReservaService.esReservaMarcadaPagoVencido(reserva)) {
      throw new Error("RESERVA_PAGO_VENCIDO");
    }
    if (reservaPendienteExpirada(reserva, new Date())) {
      await ReservaService.marcarReservaVencidaPorPago(reservaId);
      throw new Error("RESERVA_PAGO_VENCIDO");
    }
    if (reserva.estado_pago === "completado")
      throw new Error("Esta reserva ya fue pagada.");

    const clubEmbed = (
      reserva as {
        turnos?: {
          canchas?: { clubes?: ClubMetodosPagoConfig | null } | null;
        } | null;
      }
    ).turnos?.canchas?.clubes;
    assertMetodoPagoReservaPermitido(clubEmbed, metodoPago);

    const esTransferencia = metodoPago === "transferencia";

    const retieneHasta = esTransferencia
      ? retencionTransferenciaDesde(new Date())
      : null;

    // 2. Actualizar la reserva
    const { error: updError } = await supabaseAdmin
      .from("reservas")
      .update({
        estado_reserva: esTransferencia ? "pendiente" : "confirmada",
        estado_pago: esTransferencia ? "pendiente" : "completado",
        ...(esTransferencia ? { retiene_hasta: retieneHasta } : { retiene_hasta: null }),
      })
      .eq("id", reservaId);

    if (updError)
      throw new Error(`Error al confirmar la reserva: ${updError.message}`);

    // 3. Registrar el pago
    const { data: pago, error: pagoError } = await supabaseAdmin
      .from("pagos")
      .insert([
        {
          reserva_id: reservaId,
          usuario_id: usuarioId,
          monto,
          metodo_pago: metodoPago,
          referencia_pago: referenciaPago || null,
          comprobante_url: comprobanteUrl || null,
          estado: esTransferencia ? "pendiente" : "completado",
        },
      ])
      .select()
      .single();

    if (pagoError)
      throw new Error(`Error al registrar el pago: ${pagoError.message}`);

    // 4. Notificaciones
    if (esTransferencia) {
      this.enviarNotificacionesTransferenciaPendiente(reservaId, monto);
    } else {
      this.enviarNotificacionesPago(reservaId, monto);
    }

    return pago;
  }

  /**
   * Cancela una reserva del jugador (pendiente o confirmada según política del club).
   */
  static async cancelarReserva(reservaId: string, usuarioId: string) {
    const { data: reserva, error: rError } = await supabaseAdmin
      .from("reservas")
      .select(
        `id, usuario_id, estado_reserva, estado_pago, fecha_reserva,
        perfiles!reservas_usuario_id_fkey ( nombre, apellido ),
        turnos (
          hora_inicio,
          canchas (
            id,
            nombre,
            club_id,
            clubes ( id, nombre, horas_antelacion_cancelacion_jugador )
          )
        )`,
      )
      .eq("id", reservaId)
      .single();

    if (rError || !reserva) throw new Error("Reserva no encontrada.");
    if (reserva.usuario_id !== usuarioId)
      throw new Error("No tiene permiso sobre esta reserva.");

    const turno = Array.isArray(reserva.turnos)
      ? reserva.turnos[0]
      : reserva.turnos;
    const cancha = turno
      ? Array.isArray(turno.canchas)
        ? turno.canchas[0]
        : turno.canchas
      : null;
    const club = cancha
      ? Array.isArray(cancha.clubes)
        ? cancha.clubes[0]
        : cancha.clubes
      : null;

    const evaluacion = evaluarCancelacionReservaJugador({
      estado_reserva: reserva.estado_reserva,
      fecha_reserva: reserva.fecha_reserva,
      hora_inicio: turno?.hora_inicio || "00:00",
      horas_antelacion_club: club?.horas_antelacion_cancelacion_jugador,
    });
    if (!evaluacion.permitido) {
      throw new Error(evaluacion.motivo || "No podés cancelar esta reserva.");
    }

    const ahora = new Date().toISOString();

    const { error: pagosError } = await supabaseAdmin
      .from("pagos")
      .update({ estado: "rechazado" })
      .eq("reserva_id", reservaId)
      .eq("estado", "pendiente");
    if (pagosError) throw new Error(pagosError.message);

    const estadoPago =
      reserva.estado_pago === "completado"
        ? reserva.estado_pago
        : "cancelado";

    const { error } = await supabaseAdmin
      .from("reservas")
      .update({
        estado_reserva: "cancelada",
        estado_pago: estadoPago,
        cancelada_en: ahora,
        retiene_hasta: null,
      })
      .eq("id", reservaId);

    if (error) throw new Error("Error al cancelar la reserva.");

    void ReservaService.notificarClubCancelacionPorJugador({
      reservaId,
      fechaReserva: String(reserva.fecha_reserva || ""),
      estadoPago: estadoPago,
      horaInicio: turno?.hora_inicio || "00:00",
      canchaNombre: cancha?.nombre || "Cancha",
      clubId: cancha?.club_id || club?.id,
      jugador: Array.isArray(reserva.perfiles)
        ? reserva.perfiles[0]
        : reserva.perfiles,
    });
  }

  private static async notificarClubCancelacionPorJugador(params: {
    reservaId: string;
    clubId?: string | null;
    fechaReserva: string;
    horaInicio: string;
    canchaNombre: string;
    estadoPago: string;
    jugador?: { nombre?: string | null; apellido?: string | null } | null;
  }) {
    try {
      const clubId = String(params.clubId || "").trim();
      if (!clubId) return;

      const { NotificacionService } = await import("./notificacion.service");
      const perfil = params.jugador;
      const jugadorNombre = [perfil?.nombre, perfil?.apellido]
        .map((p) => String(p || "").trim())
        .filter(Boolean)
        .join(" ")
        .trim() || "Un jugador";
      const horaInicio = params.horaInicio.slice(0, 5);
      const { titulo, mensaje } = mensajeNotificacionReservaCanceladaPorJugador({
        jugadorNombre,
        canchaNombre: params.canchaNombre,
        fechaReserva: params.fechaReserva,
        horaInicio,
        estadoPago: params.estadoPago,
      });

      await NotificacionService.notificarAdminsClub(clubId, {
        titulo,
        mensaje,
        tipo: "warning",
        metadata: {
          reserva_id: params.reservaId,
          club_id: clubId,
          origen: "jugador",
        },
      });
    } catch (err) {
      console.warn(
        "Error al notificar cancelación de reserva por jugador al club:",
        err,
      );
    }
  }

  /**
   * Obtiene las reservas de un club para una fecha dada (para admin).
   */
  static async obtenerReservasClub(clubId: string, fecha?: string) {
    // Obtener IDs de canchas del club
    const { data: canchas } = await supabaseAdmin
      .from("canchas")
      .select("id")
      .eq("club_id", clubId)
      .eq("activa", true);

    if (!canchas || canchas.length === 0) return [];

    const canchaIds = canchas.map((c) => c.id);

    // Obtener turnos de esas canchas
    const { data: turnos } = await supabaseAdmin
      .from("turnos")
      .select("id")
      .in("cancha_id", canchaIds);

    if (!turnos || turnos.length === 0) return [];

    const turnoIds = turnos.map((t) => t.id);

    // Obtener reservas con datos del usuario y turno
    let query = supabaseAdmin
      .from("reservas")
      .select(
        `
        *,
        perfiles!reservas_usuario_id_fkey ( nombre, apellido, email, telefono ),
        turnos (
          hora_inicio, hora_fin, precio,
          canchas ( nombre )
        )
      `,
      )
      .in("turno_id", turnoIds)
      .order("fecha_reserva", { ascending: false });

    if (fecha) {
      query = query.eq("fecha_reserva", fecha);
    }

    const { data, error } = await query;
    if (error) throw new Error("Error al obtener las reservas del club.");
    return data || [];
  }

  /**
   * Crea una preferencia de pago en Mercado Pago para una reserva específica.
   */
  static async crearPreferenciaPago(
    reservaId: string,
    options?: { mobile?: boolean },
  ) {
    const reserva = await this.obtenerReservaPorId(reservaId);

    const { id, turnos } = reserva;
    if (!turnos) throw new Error("Turno asociado no encontrado.");

    const ahoraMp = new Date();
    const retieneHastaMp = retencionMercadoPagoDesde(ahoraMp);
    await supabaseAdmin
      .from("reservas")
      .update({ retiene_hasta: retieneHastaMp })
      .eq("id", reservaId);

    // @ts-ignore
    const cancha = turnos.canchas;
    if (!cancha) throw new Error("Cancha asociada no encontrada.");

    // @ts-ignore
    const club = cancha.clubes;
    if (!club) throw new Error("Club asociado no encontrado.");

    const token = getMercadoPagoAccessToken();
    if (!isMercadoPagoConfigured()) {
      console.warn(
        "Mercado Pago Access Token no configurado. Simulando checkout exitoso.",
      );
      return {
        preferenceId: "mock-pref-id-12345",
        initPoint: null,
        sandboxInitPoint: null,
        mockConfirmed: true,
        paymentId: `mock-reserva-${Date.now()}`,
      };
    }

    const mpClient = new MercadoPagoConfig({
      accessToken: token!,
    });

    const preference = new Preference(mpClient);

    const backUrls = buildMercadoPagoBackUrls({
      mobile: options?.mobile,
      webPath: `/reservar/checkout/${id}`,
      mobileParams: { reserva_id: id },
    });

    const response = await preference.create({
      body: {
        items: [
          {
            id: turnos.id,
            title: `Reserva: ${cancha.nombre} - ${club.nombre}`,
            quantity: 1,
            unit_price: Number(turnos.precio),
            currency_id: "ARS",
          },
        ],
        back_urls: backUrls,
        auto_return: backUrls.success.startsWith("https://")
          ? "approved"
          : undefined,
        external_reference: id,
        notification_url: `${process.env.BACKEND_URL || "http://localhost:4000"}/api/reservas/webhook/mercadopago`,
        expiration_date_from: ahoraMp.toISOString(),
        expiration_date_to: retieneHastaMp,
      },
    });

    return {
      preferenceId: response.id,
      initPoint: resolveMercadoPagoInitPoint(
        token!,
        response.init_point,
        response.sandbox_init_point,
      ),
      sandboxInitPoint: response.sandbox_init_point,
    };
  }

  /**
   * Confirma el pago por ID de reserva sin validar al usuario en sesión (para webhooks).
   */
  static async confirmarPagoPorId(
    reservaId: string,
    monto: number,
    metodoPago: string,
    referenciaPago?: string,
  ) {
    const { data: reserva, error: rError } = await supabaseAdmin
      .from("reservas")
      .select("id, usuario_id, estado_pago")
      .eq("id", reservaId)
      .single();

    if (rError || !reserva) throw new Error("Reserva no encontrada.");
    if (reserva.estado_pago === "completado") return null;

    const { error: updError } = await supabaseAdmin
      .from("reservas")
      .update({
        estado_reserva: "confirmada",
        estado_pago: "completado",
      })
      .eq("id", reservaId);

    if (updError)
      throw new Error(`Error al confirmar la reserva: ${updError.message}`);

    const { data: pago, error: pagoError } = await supabaseAdmin
      .from("pagos")
      .insert([
        {
          reserva_id: reservaId,
          usuario_id: reserva.usuario_id,
          monto,
          metodo_pago: metodoPago,
          referencia_pago: referenciaPago || null,
          estado: "completado",
        },
      ])
      .select()
      .single();

    if (pagoError)
      throw new Error(`Error al registrar el pago: ${pagoError.message}`);

    // Disparar notificaciones en segundo plano por WebSocket y DB
    this.enviarNotificacionesPago(reservaId, monto);

    return pago;
  }

  /**
   * Envía notificaciones de confirmación de pago al usuario y a los administradores.
   */
  static async enviarNotificacionesPago(reservaId: string, monto: number) {
    try {
      const { NotificacionService } = require("./notificacion.service");

      const details = await this.obtenerReservaPorId(reservaId);
      // @ts-ignore
      const canchaNombre = details.turnos?.canchas?.nombre || "Cancha";
      // @ts-ignore
      const clubNombre = details.turnos?.canchas?.clubes?.nombre || "Club";
      // @ts-ignore
      const horaInicio = details.turnos?.hora_inicio?.slice(0, 5) || "00:00";

      // 1. Notificar al usuario que reservó
      if (details.usuario_id) {
        await NotificacionService.crearNotificacion({
          usuario_id: details.usuario_id,
          titulo: "Reserva Confirmada",
          mensaje: `Tu turno en ${canchaNombre} (${clubNombre}) para el ${details.fecha_reserva} a las ${horaInicio} Hs ha sido confirmado correctamente. Te esperamos.`,
          tipo: "success",
          metadata: { reserva_id: reservaId },
        });
      }

      // 2. Notificar a los administradores del club
      await NotificacionService.notificarAdmins({
        titulo: "Nuevo Pago Acreditado",
        mensaje: `Se acredito un pago de $${monto} para la reserva en ${canchaNombre} (${clubNombre}) del ${details.fecha_reserva} a las ${horaInicio} Hs.`,
        tipo: "success",
        metadata: { reserva_id: reservaId },
      });
    } catch (notifError) {
      console.warn("Error al emitir notificaciones post-pago:", notifError);
    }
  }

  /**
   * Envía notificaciones de transferencia pendiente al usuario y a los administradores.
   */
  static async enviarNotificacionesTransferenciaPendiente(
    reservaId: string,
    monto: number,
  ) {
    try {
      const { NotificacionService } = require("./notificacion.service");

      const details = await this.obtenerReservaPorId(reservaId);
      // @ts-ignore
      const canchaNombre = details.turnos?.canchas?.nombre || "Cancha";
      // @ts-ignore
      const clubNombre = details.turnos?.canchas?.clubes?.nombre || "Club";
      // @ts-ignore
      const horaInicio = details.turnos?.hora_inicio?.slice(0, 5) || "00:00";

      // 1. Notificar al usuario que reservó
      if (details.usuario_id) {
        await NotificacionService.crearNotificacion({
          usuario_id: details.usuario_id,
          titulo: "Transferencia Pendiente de Validacion",
          mensaje: `Tu comprobante de transferencia por $${monto} para el turno en ${canchaNombre} (${clubNombre}) el ${details.fecha_reserva} a las ${horaInicio} Hs esta siendo revisado por el club.`,
          tipo: "warning",
          metadata: { reserva_id: reservaId },
        });
      }

      // 2. Notificar a los administradores del club
      await NotificacionService.notificarAdmins({
        titulo: "Nueva Transferencia por Validar",
        mensaje: `Un usuario cargo un comprobante de pago por $${monto} para el turno en ${canchaNombre} (${clubNombre}) del ${details.fecha_reserva} a las ${horaInicio} Hs.`,
        tipo: "warning",
        metadata: { reserva_id: reservaId },
      });
    } catch (notifError) {
      console.warn(
        "Error al emitir notificaciones de transferencia pendiente:",
        notifError,
      );
    }
  }

  /**
   * Valida un pago pendiente por transferencia (Aprobado o Rechazado).
   */
  static async validarTransferencia(pagoId: string, aprobado: boolean) {
    // 1. Obtener el pago y validar su estado pendiente
    const { data: pago, error: pError } = await supabaseAdmin
      .from("pagos")
      .select("*, reservas(id, usuario_id, fecha_reserva, turno_id)")
      .eq("id", pagoId)
      .single();

    if (pError || !pago) throw new Error("Pago no encontrado.");
    if (pago.estado !== "pendiente")
      throw new Error("Este pago ya fue procesado.");

    // @ts-ignore
    const reservaId = pago.reservas?.id || pago.reserva_id;

    if (aprobado) {
      // 2a. Si es aprobado, marcamos el pago como completado y la reserva como confirmada
      const { error: updPago } = await supabaseAdmin
        .from("pagos")
        .update({ estado: "completado" })
        .eq("id", pagoId);
      if (updPago) throw new Error("Error al actualizar estado del pago.");

      const { error: updReserva } = await supabaseAdmin
        .from("reservas")
        .update({ estado_reserva: "confirmada", estado_pago: "completado" })
        .eq("id", reservaId);
      if (updReserva) throw new Error("Error al confirmar la reserva.");

      // Disparar las notificaciones normales de pago confirmado
      this.enviarNotificacionesPago(reservaId, Number(pago.monto));
    } else {
      // 2b. Si es rechazado, marcamos el pago como rechazado
      const { error: updPago } = await supabaseAdmin
        .from("pagos")
        .update({ estado: "rechazado" })
        .eq("id", pagoId);
      if (updPago) throw new Error("Error al actualizar estado del pago.");

      // La reserva vuelve a quedar en estado pendiente de pago
      const { error: updReserva } = await supabaseAdmin
        .from("reservas")
        .update({ estado_reserva: "pendiente", estado_pago: "pendiente" })
        .eq("id", reservaId);
      if (updReserva)
        throw new Error("Error al actualizar estado de la reserva.");

      // Notificar al usuario sobre el rechazo
      try {
        const { NotificacionService } = require("./notificacion.service");
        const details = await this.obtenerReservaPorId(reservaId);
        // @ts-ignore
        const canchaNombre = details.turnos?.canchas?.nombre || "Cancha";
        // @ts-ignore
        const clubNombre = details.turnos?.canchas?.clubes?.nombre || "Club";
        // @ts-ignore
        const horaInicio = details.turnos?.hora_inicio?.slice(0, 5) || "00:00";

        if (pago.usuario_id) {
          await NotificacionService.crearNotificacion({
            usuario_id: pago.usuario_id,
            titulo: "Transferencia Rechazada",
            mensaje: `El comprobante cargado para tu turno en ${canchaNombre} (${clubNombre}) el ${details.fecha_reserva} a las ${horaInicio} Hs fue rechazado por el club. Por favor, verifica el comprobante o realiza un nuevo pago.`,
            tipo: "error",
            metadata: { reserva_id: reservaId },
          });
        }
      } catch (notifError) {
        console.warn(
          "Error al emitir notificación de transferencia rechazada:",
          notifError,
        );
      }
    }

    return { exito: true };
  }

  /**
   * Obtiene todos los pagos pendientes de transferencia para los clubes administrados.
   */
  static async obtenerPagosPendientes(clubId?: string) {
    let query = supabaseAdmin
      .from("pagos")
      .select(
        `
        *,
        perfiles:usuario_id ( id, nombre, apellido, email ),
        reservas:reserva_id (
          id, fecha_reserva,
          turnos (
            id, hora_inicio, hora_fin, precio,
            canchas (
              id, nombre, club_id,
              clubes ( id, nombre )
            )
          )
        )
      `,
      )
      .eq("estado", "pendiente")
      .eq("metodo_pago", "transferencia")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error("Error al obtener pagos pendientes.");

    // Si se especifica clubId, filtramos en memoria
    if (clubId && data) {
      return data.filter(
        (pago: any) =>
          // @ts-ignore
          pago.reservas?.turnos?.canchas?.club_id === clubId,
      );
    }

    return data || [];
  }

  /**
   * Obtiene todas las reservas de un usuario con detalles de turno, cancha y club.
   */
  static async obtenerReservasUsuario(usuarioId: string) {
    await this.liberarPendientesExpiradasUsuario(usuarioId);

    const { data, error } = await supabaseAdmin
      .from("reservas")
      .select(`
        *,
        turnos (
          hora_inicio,
          hora_fin,
          precio,
          canchas (
            nombre,
            tipo_suelo,
            techada,
            clubes (
              id,
              nombre,
              localidad,
              provincia,
              direccion,
              latitud,
              longitud,
              horas_antelacion_cancelacion_jugador
            )
          )
        ),
        pagos (
          id, metodo_pago, referencia_pago, estado, comprobante_url, created_at
        )
      `)
      .eq("usuario_id", usuarioId)
      .order("fecha_reserva", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Error al obtener las reservas del usuario: ${error.message}`);
    }

    return (data || []).map((fila) => {
      const turno = Array.isArray(fila.turnos) ? fila.turnos[0] : fila.turnos;
      const cancha = turno
        ? Array.isArray(turno.canchas)
          ? turno.canchas[0]
          : turno.canchas
        : null;
      const club = cancha
        ? Array.isArray(cancha.clubes)
          ? cancha.clubes[0]
          : cancha.clubes
        : null;

      const evaluacion = evaluarCancelacionReservaJugador({
        estado_reserva: fila.estado_reserva,
        fecha_reserva: fila.fecha_reserva,
        hora_inicio: turno?.hora_inicio || "00:00",
        horas_antelacion_club: club?.horas_antelacion_cancelacion_jugador,
      });

      const limite = limitePagoReserva(fila);

      return {
        ...fila,
        retiene_hasta:
          fila.retiene_hasta || (limite ? limite.toISOString() : null),
        puede_cancelar: evaluacion.permitido,
        cancelacion_bloqueo: evaluacion.motivo ?? null,
        horas_antelacion_cancelacion: evaluacion.horas_antelacion ?? null,
      };
    });
  }
}

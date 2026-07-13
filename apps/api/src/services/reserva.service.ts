import { supabaseAdmin } from "../config/supabase";
import { MercadoPagoConfig, Preference } from "mercadopago";

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
}

export interface CrearReservaDTO {
  turno_id: string;
  usuario_id: string;
  fecha_reserva: string; // YYYY-MM-DD
}

// ── Servicio ───────────────────────────────────────────────────────────

export class ReservaService {
  /**
   * Obtiene la disponibilidad de todos los turnos de un club para una fecha dada.
   * Cruza los turnos semanales preestablecidos con las reservas existentes.
   */
  static async obtenerDisponibilidad(
    clubId: string,
    fecha: string,
  ): Promise<SlotDisponible[]> {
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

    // 3. Obtener reservas ya tomadas para esos turnos en esa fecha
    const { data: reservas, error: reservasError } = await supabaseAdmin
      .from("reservas")
      .select("turno_id")
      .in("turno_id", turnoIds)
      .eq("fecha_reserva", fecha)
      .in("estado_reserva", ["confirmada"]);

    if (reservasError)
      throw new Error("Error al consultar las reservas existentes.");

    const turnosOcupados = new Set(
      (reservas || []).map((r) => r.turno_id as string),
    );

    // 4. Construir la grilla de disponibilidad
    const canchasMap = new Map(canchas.map((c) => [c.id, c]));

    const slots: SlotDisponible[] = turnos.map((turno) => {
      const cancha = canchasMap.get(turno.cancha_id);
      return {
        turno_id: turno.id,
        cancha_id: turno.cancha_id,
        cancha_nombre: cancha?.nombre ?? "Sin nombre",
        tipo_suelo: cancha?.tipo_suelo ?? null,
        techada: cancha?.techada ?? false,
        hora_inicio: turno.hora_inicio,
        hora_fin: turno.hora_fin,
        precio: turno.precio,
        disponible: !turnosOcupados.has(turno.id),
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
   * Si existen reservas anteriores en estado 'pendiente' (abandonadas), se eliminan automáticamente.
   */
  static async crearReserva(dto: CrearReservaDTO) {
    const { turno_id, usuario_id, fecha_reserva } = dto;

    // Obtener los detalles del turno para validar la hora de inicio
    const { data: turno, error: turnoError } = await supabaseAdmin
      .from("turnos")
      .select("hora_inicio")
      .eq("id", turno_id)
      .single();

    if (turnoError || !turno) throw new Error("Turno no encontrado.");

    // Validar que la reserva no sea para una fecha y hora pasada
    const now = new Date();
    const reservaDateTime = new Date(`${fecha_reserva}T${turno.hora_inicio}`);
    if (reservaDateTime < now) {
      throw new Error("FECHA_PASADA");
    }

    // 1. Verificar solapamiento
    const { data: existentes, error: checkError } = await supabaseAdmin
      .from("reservas")
      .select("id, estado_reserva")
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

      // Si sólo existen pendientes, las eliminamos para liberar la restricción única de la base de datos
      const pendientes = existentes.filter(
        (r) => r.estado_reserva === "pendiente",
      );
      if (pendientes.length > 0) {
        const idsABorrar = pendientes.map((p) => p.id);
        await supabaseAdmin.from("pagos").delete().in("reserva_id", idsABorrar);
        await supabaseAdmin.from("reservas").delete().in("id", idsABorrar);
      }
    }

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
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear la reserva: ${error.message}`);
    return data;
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
          clubes ( id, nombre, provincia, localidad )
        )
      `,
      )
      .eq("id", turnoId)
      .single();

    if (error || !data) throw new Error("Turno no encontrado.");
    return data;
  }

  /**
   * Obtiene una reserva por su ID con datos del turno y la cancha.
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
            clubes ( id, nombre, provincia, localidad )
          )
        )
      `,
      )
      .eq("id", reservaId)
      .single();

    if (error || !data) throw new Error("Reserva no encontrada.");
    return data;
  }

  /**
   * Confirma el pago de una reserva y registra el pago en la tabla de pagos.
   * En el futuro se integrará con MercadoPago.
   */
  static async confirmarPago(
    reservaId: string,
    usuarioId: string,
    monto: number,
    metodoPago: string,
    referenciaPago?: string,
  ) {
    // 1. Verificar que la reserva existe y pertenece al usuario
    const { data: reserva, error: rError } = await supabaseAdmin
      .from("reservas")
      .select("id, usuario_id, estado_pago")
      .eq("id", reservaId)
      .single();

    if (rError || !reserva) throw new Error("Reserva no encontrada.");
    if (reserva.usuario_id !== usuarioId)
      throw new Error("No tiene permiso sobre esta reserva.");
    if (reserva.estado_pago === "completado")
      throw new Error("Esta reserva ya fue pagada.");

    // 2. Actualizar la reserva
    const { error: updError } = await supabaseAdmin
      .from("reservas")
      .update({
        estado_reserva: "confirmada",
        estado_pago: "completado",
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
   * Cancela una reserva pendiente.
   */
  static async cancelarReserva(reservaId: string, usuarioId: string) {
    const { data: reserva, error: rError } = await supabaseAdmin
      .from("reservas")
      .select("id, usuario_id, estado_reserva")
      .eq("id", reservaId)
      .single();

    if (rError || !reserva) throw new Error("Reserva no encontrada.");
    if (reserva.usuario_id !== usuarioId)
      throw new Error("No tiene permiso sobre esta reserva.");
    if (reserva.estado_reserva === "cancelada")
      throw new Error("Esta reserva ya fue cancelada.");

    const { error } = await supabaseAdmin
      .from("reservas")
      .update({ estado_reserva: "cancelada" })
      .eq("id", reservaId);

    if (error) throw new Error("Error al cancelar la reserva.");
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
  static async crearPreferenciaPago(reservaId: string) {
    const reserva = await this.obtenerReservaPorId(reservaId);

    const { id, turnos } = reserva;
    if (!turnos) throw new Error("Turno asociado no encontrado.");

    // @ts-ignore
    const cancha = turnos.canchas;
    if (!cancha) throw new Error("Cancha asociada no encontrada.");

    // @ts-ignore
    const club = cancha.clubes;
    if (!club) throw new Error("Club asociado no encontrado.");

    // Fallback de simulación si no hay credencial real configurada
    const token = process.env.MP_ACCESS_TOKEN;
    if (
      !token ||
      token === "TEST-TOKEN-MOCK" ||
      (!token.startsWith("APP_USR-") && !token.startsWith("TEST-"))
    ) {
      console.warn(
        "Mercado Pago Access Token no configurado o inválido. Simulando checkout exitoso.",
      );
      const mockSuccessUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reservar/checkout/${id}?payment=success`;
      return {
        preferenceId: "mock-pref-id-12345",
        initPoint: mockSuccessUrl,
        sandboxInitPoint: mockSuccessUrl,
      };
    }

    const mpClient = new MercadoPagoConfig({
      accessToken: token,
    });

    const preference = new Preference(mpClient);

    const successUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reservar/checkout/${id}?payment=success`;
    const failureUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reservar/checkout/${id}?payment=failure`;
    const pendingUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reservar/checkout/${id}?payment=pending`;

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
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        auto_return: successUrl.startsWith("https://") ? "approved" : undefined,
        external_reference: id,
        notification_url: `${process.env.BACKEND_URL || "http://localhost:4000"}/api/reservas/webhook/mercadopago`,
      },
    });

    return {
      preferenceId: response.id,
      initPoint:
        token && token.startsWith("TEST-")
          ? response.sandbox_init_point
          : response.init_point,
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
}

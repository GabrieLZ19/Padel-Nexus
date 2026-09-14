import { supabaseAdmin } from "../config/supabase";
import { MercadoPagoConfig, Preference } from "mercadopago";
import {
  buildMercadoPagoBackUrls,
  getMercadoPagoAccessToken,
  isMercadoPagoConfigured,
  resolveMercadoPagoInitPoint,
} from "../config/mercadopago";
import { NotificacionService } from "./notificacion.service";
import { LicenciaOrganizacionService } from "./licenciaOrganizacion.service";
import {
  calcularVencimientoTrasPagoMensual,
  descripcionVigenciaLicencia,
  periodoDesdeFecha,
} from "../utils/licenciaConfig";

function normalizarTexto(input?: string | null): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export class LicenciaService {
  /**
   * Lista licencias paginadas. Si el actor es admin_provincial, filtra
   * a su asociación / provincia (asociacion_id o lugar_residencia).
   */
  static async obtenerLicencias(
    page: number,
    limit: number,
    search?: string,
    estado?: string,
    actor?: { id: string; rol: string },
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let alcanceProvincial: {
      asociacionId: string;
      provincia: string;
    } | null = null;

    if (actor?.rol === "admin_provincial") {
      const asoc =
        await LicenciaOrganizacionService.resolverAsociacionProvincial(
          actor.id,
        );
      alcanceProvincial = {
        asociacionId: asoc.asociacionId,
        provincia: asoc.provincia,
      };
    }

    let query = supabaseAdmin
      .from("perfiles")
      .select(
        "*, licencias:licencias!fk_licencias_usuario!inner(*), afiliaciones:afiliaciones!fk_afiliaciones_usuario(id, entidad, estado, fecha_vencimiento)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (estado) {
      query = query.eq("licencias.estado", estado);
    }

    if (search) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `nombre.ilike.${term},apellido.ilike.${term},email.ilike.${term},licencias.nro_licencia.ilike.${term}`,
      );
    }

    // Alcance provincial: preferimos asociacion_id; fallback a lugar_residencia.
    if (alcanceProvincial) {
      query = query.or(
        `licencias.asociacion_id.eq.${alcanceProvincial.asociacionId},lugar_residencia.ilike.${alcanceProvincial.provincia}`,
      );
    }

    const { data, error, count } = await query.range(from, to);
    if (error) {
      console.error("🔴 Error al obtener licencias por perfil:", error);
      throw new Error("Error al listar licencias");
    }

    let rows = data || [];

    // Refuerzo en memoria: normalizamos acentos porque lugar_residencia
    // puede venir como "Cordoba" vs "Córdoba".
    if (alcanceProvincial) {
      const target = normalizarTexto(alcanceProvincial.provincia);
      rows = rows.filter((perfil) => {
        const licencias = Array.isArray(perfil.licencias)
          ? perfil.licencias
          : perfil.licencias
            ? [perfil.licencias]
            : [];
        const matchAsoc = licencias.some(
          (l: { asociacion_id?: string | null }) =>
            l.asociacion_id === alcanceProvincial!.asociacionId,
        );
        if (matchAsoc) return true;
        return normalizarTexto(perfil.lugar_residencia) === target;
      });
    }

    return {
      data: rows,
      total: alcanceProvincial ? rows.length : count || 0,
    };
  }

  /**
   * Valida que un admin_provincial solo pueda operar sobre licencias
   * de su asociación / provincia.
   */
  static async assertPuedeGestionarLicencia(
    licenciaId: string,
    actor: { id: string; rol: string },
  ): Promise<void> {
    if (actor.rol !== "admin_provincial") return;

    const asoc =
      await LicenciaOrganizacionService.resolverAsociacionProvincial(actor.id);

    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("id, asociacion_id, datos_solicitud, usuario_id")
      .eq("id", licenciaId)
      .maybeSingle();

    if (error || !licencia) {
      throw new Error("Licencia no encontrada.");
    }

    if (licencia.asociacion_id === asoc.asociacionId) return;

    const datos = (licencia.datos_solicitud || {}) as Record<string, unknown>;
    const provinciaSolicitud =
      typeof datos.provincia === "string" ? datos.provincia : "";

    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("lugar_residencia")
      .eq("id", licencia.usuario_id)
      .maybeSingle();

    const target = normalizarTexto(asoc.provincia);
    if (
      normalizarTexto(provinciaSolicitud) === target ||
      normalizarTexto(perfil?.lugar_residencia) === target
    ) {
      return;
    }

    throw new Error(
      "No podés gestionar licencias fuera de tu asociación provincial.",
    );
  }

  static async obtenerPorUsuario(usuario_id: string) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("usuario_id", usuario_id)
      .single();

    if (error || !data)
      throw new Error("Licencia no encontrada para este usuario.");

    const datos = (data.datos_solicitud || {}) as Record<string, unknown>;
    return {
      ...data,
      precio_anual: Number(datos.precio_anual ?? 0),
      estado_pago: (datos.estado_pago as string) || "no_aplica",
    };
  }

  static async crearLicencia(
    usuario_id: string,
    nro_licencia: string,
    estado: string,
  ) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .insert([
        {
          usuario_id,
          nro_licencia,
          estado,
          fecha_emision: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async renovar(id: string) {
    const { data: licencia, error: readError } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", id)
      .single();

    if (readError || !licencia) {
      throw new Error("Licencia no encontrada para renovar.");
    }

    const fechaVencimiento =
      await LicenciaOrganizacionService.calcularVencimientoParaLicencia(
        licencia,
      );

    const { data, error } = await supabaseAdmin
      .from("licencias")
      .update({
        fecha_vencimiento: fechaVencimiento,
        estado: "Activa",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async verificar(usuario_id: string) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select(
        "estado, nro_licencia, fecha_vencimiento, perfiles(nombre, apellido)",
      )
      .eq("usuario_id", usuario_id)
      .single();

    if (error || !data) throw new Error("Licencia no encontrada");

    // Lógica dinámica de vencimiento
    if (
      new Date(data.fecha_vencimiento) < new Date() &&
      data.estado === "Activa"
    ) {
      data.estado = "Vencida";
    }
    return data;
  }

  static async actualizarEstado(id: string, estado: string, fechaVencimientoOverride?: string) {
    // 1. Obtener la licencia actual para saber el estado previo y usuario
    const { data: licenciaPrevia, error: readError } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", id)
      .single();

    if (readError || !licenciaPrevia) {
      throw new Error("No se encontró la licencia para actualizar o el estado es inválido.");
    }

    const estadoPrevio = licenciaPrevia.estado;
    const usuario_id = licenciaPrevia.usuario_id;
    let data = { ...licenciaPrevia, estado };

    const fechaVencimientoCalculada =
      await LicenciaOrganizacionService.calcularVencimientoParaLicencia(
        licenciaPrevia,
      );
    const fechaVencimiento =
      fechaVencimientoOverride || fechaVencimientoCalculada;

    // 2. Si es Rechazo (de Pendiente a Suspendida)
    if (estado === "Suspendida" && estadoPrevio === "Pendiente") {
      // Notificar al usuario sobre el rechazo
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Solicitud de Alta Rechazada",
        mensaje: "Tu solicitud de alta para la licencia deportiva fue rechazada. Puedes volver a iniciar el trámite desde tu perfil.",
        tipo: "error"
      });

      // Eliminar inmediatamente la fila de la base de datos
      const { error: deleteError } = await supabaseAdmin
        .from("licencias")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("🔴 Error al eliminar licencia rechazada:", deleteError);
        throw new Error("Error al eliminar la licencia rechazada.");
      }

      return data;
    }

    // 3. Si no es rechazo, actualizamos normalmente
    const updateData: Record<string, any> = { estado };

    if (estado === "Activa" && estadoPrevio !== "Activa") {
      // Activación real: registrar la fecha de emisión y calcular vencimiento
      updateData.fecha_emision = new Date().toISOString().split("T")[0];
      updateData.fecha_vencimiento = fechaVencimiento;
    } else if (fechaVencimientoOverride) {
      // Solo cambio de fecha (sin cambio de estado, o ya estaba Activa)
      updateData.fecha_vencimiento = fechaVencimientoOverride;
    } else if (estado === "Activa" && estadoPrevio === "Activa") {
      // Mismo estado, sin override de fecha → no tocar fechas
    }

    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from("licencias")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedData) {
      throw new Error("Error al actualizar el estado de la licencia.");
    }

    data = updatedData;

    // Helper para formatear fechas sin timezone shift
    const formatFecha = (iso?: string | null) => {
      if (!iso) return "";
      const [year, month, day] = iso.split("T")[0].split("-");
      return `${day}/${month}/${year}`;
    };

    // 4. Emitir notificaciones para otros cambios de estado
    if (estado === "Activa" && estadoPrevio !== "Activa") {
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Licencia Aprobada",
        mensaje: `¡Felicidades! Tu licencia N° ${data.nro_licencia} fue aprobada. Vence el ${formatFecha(data.fecha_vencimiento)}. Ya podés ver tu carnet digital.`,
        tipo: "success",
        metadata: { nro_licencia: data.nro_licencia, licencia_id: data.id },
      });
    } else if (estado === "Suspendida" && estadoPrevio === "Activa") {
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Licencia Suspendida",
        mensaje: `Tu licencia N° ${data.nro_licencia} fue suspendida administrativamente. Contactá a tu federación para más información.`,
        tipo: "error",
        metadata: { nro_licencia: data.nro_licencia, licencia_id: data.id },
      });
    }

    // 5. Si se activa o se suspende, actualizamos la afiliación correspondiente
    if (data.datos_solicitud) {
      const datosSol = data.datos_solicitud as Record<string, unknown>;
      const clubId =
        typeof datosSol.club_id === "string" ? datosSol.club_id : null;

      if (clubId) {
        try {
          if (estado === "Activa") {
            const { AfiliacionService } = await import(
              "./afiliacion.service"
            );
            await AfiliacionService.upsertActivaPorClub({
              usuarioId: data.usuario_id,
              clubId,
              fechaVencimiento: data.fecha_vencimiento || fechaVencimiento,
            });
          } else if (estado === "Suspendida") {
            await supabaseAdmin
              .from("afiliaciones")
              .update({ estado: "suspendido" })
              .eq("usuario_id", data.usuario_id)
              .eq("club_id", clubId);
          }
        } catch (err) {
          console.error(
            "Error al registrar/actualizar afiliación en cambio de estado:",
            err,
          );
        }
      }
    }

    return data;
  }

  static async solicitar(usuario_id: string, datos: Record<string, unknown>) {
    const config =
      await LicenciaOrganizacionService.resolverConfigParaLicencia({
        datos_solicitud: datos,
        club_id: typeof datos.club_id === "string" ? datos.club_id : null,
      });

    const esMensual = config.frecuenciaPago === "mensual";
    const precio = esMensual
      ? Number(config.precioMensual || 0)
      : Number(config.precioAnual || 0);

    const datosConPago = {
      ...datos,
      precio_anual: Number(config.precioAnual || 0),
      precio_mensual: Number(config.precioMensual || 0),
      frecuencia_pago: config.frecuenciaPago,
      nombre_carne: config.nombreCarne,
      estado_pago: precio > 0 ? "pendiente" : "no_aplica",
      moneda: "ARS",
    };

    let asociacionId: string | null = null;
    const clubId = typeof datos.club_id === "string" ? datos.club_id : null;
    if (clubId) {
      const { data: club } = await supabaseAdmin
        .from("clubes")
        .select("asociacion_id")
        .eq("id", clubId)
        .maybeSingle();
      asociacionId = club?.asociacion_id ?? null;
    }
    if (!asociacionId && typeof datos.provincia === "string") {
      const { data: asoc } = await supabaseAdmin
        .from("asociaciones")
        .select("id")
        .ilike("provincia", datos.provincia.trim())
        .limit(1)
        .maybeSingle();
      asociacionId = asoc?.id ?? null;
    }

    const { data, error } = await supabaseAdmin
      .from("licencias")
      .insert([
        {
          usuario_id,
          estado: "Pendiente",
          nro_licencia: `PAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          datos_solicitud: datosConPago,
          club_id: clubId,
          asociacion_id: asociacionId,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    NotificacionService.notificarAdmins({
      titulo: "Nueva Solicitud de Licencia",
      mensaje: `${datos.nombre} ${datos.apellido} ha solicitado una nueva licencia deportiva.`,
      tipo: "info",
    }).catch((err) =>
      console.error("Error al notificar admins de nueva licencia:", err),
    );

    const etiqueta = esMensual ? "mensual" : "anual";
    const mensajePago =
      precio > 0
        ? `Completá el pago ${etiqueta} de $${precio.toLocaleString("es-AR")} para continuar con la revisión.`
        : "Un administrador revisará tu solicitud pronto.";

    NotificacionService.crearNotificacion({
      usuario_id,
      titulo: "Solicitud de licencia recibida",
      mensaje: `Tu carnet ${data.nro_licencia} quedó en estado pendiente. ${mensajePago}`,
      tipo: "info",
      metadata: {
        tipo: "licencia",
        licencia_id: data.id,
        nro_licencia: data.nro_licencia,
        precio_anual: Number(config.precioAnual || 0),
        precio_mensual: Number(config.precioMensual || 0),
        frecuencia_pago: config.frecuenciaPago,
      },
    }).catch((err) =>
      console.error("Error al notificar jugador de solicitud:", err),
    );

    return {
      ...data,
      precio_anual: Number(config.precioAnual || 0),
      precio_mensual: Number(config.precioMensual || 0),
      frecuencia_pago: config.frecuenciaPago,
      estado_pago: datosConPago.estado_pago,
    };
  }

  static async cotizar(params: {
    club_id?: string | null;
    provincia?: string | null;
  }) {
    const config =
      await LicenciaOrganizacionService.resolverConfigParaLicencia({
        datos_solicitud: {
          club_id: params.club_id || undefined,
          provincia: params.provincia || undefined,
        },
        club_id: params.club_id || null,
      });

    return {
      precio_anual: Number(config.precioAnual || 0),
      precio_mensual: Number(config.precioMensual || 0),
      frecuencia_pago: config.frecuenciaPago,
      nombre_carne: config.nombreCarne,
      dia_cobro: config.diaCobro,
      moneda: "ARS",
      vigencia_modo: config.vigenciaModo,
      descripcion_vigencia: descripcionVigenciaLicencia(config),
      origen: config.origen,
    };
  }

  static async crearPreferenciaPago(
    licenciaId: string,
    usuarioId: string,
    options?: { mobile?: boolean },
  ) {
    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", licenciaId)
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !licencia) throw new Error("Licencia no encontrada.");

    const datos = (licencia.datos_solicitud || {}) as Record<string, unknown>;
    let precio = Number(datos.precio_anual ?? 0);

    // Licencias creadas antes del cobro: resolver precio actual y persistirlo
    if (precio <= 0) {
      const config =
        await LicenciaOrganizacionService.resolverConfigParaLicencia(licencia);
      precio = Number(config.precioAnual || 0);
      if (precio > 0) {
        const datosActualizados = {
          ...datos,
          precio_anual: precio,
          estado_pago:
            datos.estado_pago === "pagado" ? "pagado" : "pendiente",
          moneda: "ARS",
        };
        await supabaseAdmin
          .from("licencias")
          .update({ datos_solicitud: datosActualizados })
          .eq("id", licenciaId);
        Object.assign(datos, datosActualizados);
      }
    }

    if (precio <= 0) {
      throw new Error("Esta licencia no tiene un monto pendiente de pago.");
    }
    if (datos.estado_pago === "pagado") {
      throw new Error("El pago de esta licencia ya fue registrado.");
    }

    const token = getMercadoPagoAccessToken();
    if (!isMercadoPagoConfigured()) {
      console.warn(
        "⚠️ MP Access Token no configurado. Simulando pago de licencia.",
      );
      const mockPaymentId = `mock-licencia-${Date.now()}`;
      const actualizada = await LicenciaService.confirmarPagoLicencia(
        licenciaId,
        usuarioId,
        mockPaymentId,
        precio,
      );
      return {
        preferenceId: "mock-licencia-pref",
        initPoint: null,
        sandboxInitPoint: null,
        mockConfirmed: true,
        paymentId: mockPaymentId,
        licencia: actualizada,
      };
    }

    const mpClient = new MercadoPagoConfig({ accessToken: token! });
    const preference = new Preference(mpClient);
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

    const backUrls = buildMercadoPagoBackUrls({
      mobile: options?.mobile,
      webPath: "/mi-perfil",
      mobileParams: { licencia_id: licenciaId },
    });

    const response = await preference.create({
      body: {
        items: [
          {
            id: licenciaId,
            title: `Licencia FAP ${licencia.nro_licencia}`,
            quantity: 1,
            unit_price: precio,
            currency_id: "ARS",
          },
        ],
        back_urls: backUrls,
        auto_return: backUrls.success.startsWith("https://")
          ? "approved"
          : undefined,
        external_reference: `licencia:${licenciaId}`,
        notification_url: `${backendUrl}/api/licencias/webhook/mercadopago`,
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
      mockConfirmed: false,
    };
  }

  static async confirmarPagoLicencia(
    licenciaId: string,
    usuarioId: string,
    paymentId: string,
    monto?: number,
  ) {
    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", licenciaId)
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !licencia) throw new Error("Licencia no encontrada.");

    const previos = (licencia.datos_solicitud || {}) as Record<string, unknown>;
    const datos: Record<string, unknown> = {
      ...previos,
      estado_pago: "pagado",
      mp_payment_id: paymentId,
      fecha_pago: new Date().toISOString(),
      ...(monto != null ? { monto_pagado: monto } : {}),
    };

    const { data, error: updError } = await supabaseAdmin
      .from("licencias")
      .update({ datos_solicitud: datos })
      .eq("id", licenciaId)
      .select()
      .single();

    if (updError || !data) {
      throw new Error("No se pudo registrar el pago de la licencia.");
    }

    await NotificacionService.crearNotificacion({
      usuario_id: usuarioId,
      titulo: "Pago de licencia recibido",
      mensaje: `Registramos el pago de tu licencia ${data.nro_licencia}. Queda pendiente la aprobación de la federación.`,
      tipo: "success",
      metadata: {
        tipo: "licencia",
        licencia_id: data.id,
        nro_licencia: data.nro_licencia,
      },
    });

    NotificacionService.notificarAdmins({
      titulo: "Pago de licencia acreditado",
      mensaje: `El jugador pagó la licencia ${data.nro_licencia}. Revisá y aprobá el alta.`,
      tipo: "info",
      metadata: { licencia_id: data.id },
    }).catch(() => undefined);

    return {
      ...data,
      precio_anual: Number(datos.precio_anual || 0),
      estado_pago: "pagado",
    };
  }

  /**
   * Registra un pago manual (anual o mensual) y actualiza la vigencia.
   * Para frecuencia mensual: extiende fecha_vencimiento según dia_cobro.
   */
  static async registrarPago(
    licenciaId: string,
    payload: {
      monto?: number;
      periodo?: string;
      metodo?: string;
      notas?: string;
      mp_payment_id?: string;
    },
    adminId?: string,
  ) {
    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", licenciaId)
      .single();

    if (error || !licencia) throw new Error("Licencia no encontrada.");

    const config =
      await LicenciaOrganizacionService.resolverConfigParaLicencia(licencia);

    const ahora = new Date();
    const periodo =
      payload.periodo && /^\d{4}-\d{2}$/.test(payload.periodo)
        ? payload.periodo
        : periodoDesdeFecha(ahora);

    const montoDefault =
      config.frecuenciaPago === "mensual"
        ? Number(config.precioMensual || 0)
        : Number(config.precioAnual || 0);
    const monto =
      payload.monto != null ? Math.max(0, Number(payload.monto)) : montoDefault;

    const { data: pago, error: pagoError } = await supabaseAdmin
      .from("licencia_pagos")
      .insert({
        licencia_id: licenciaId,
        usuario_id: licencia.usuario_id,
        periodo,
        monto,
        estado: "pagado",
        metodo: payload.metodo || "manual",
        mp_payment_id: payload.mp_payment_id || null,
        registrado_por: adminId || null,
        notas: payload.notas || null,
        pagado_en: ahora.toISOString(),
      })
      .select()
      .single();

    if (pagoError) {
      if (pagoError.code === "23505") {
        throw new Error(
          `Ya existe un pago registrado para el período ${periodo}.`,
        );
      }
      throw new Error(pagoError.message);
    }

    // Extender vigencia según frecuencia.
    let fechaVencimiento: string;
    if (config.frecuenciaPago === "mensual") {
      fechaVencimiento = calcularVencimientoTrasPagoMensual(
        config.diaCobro,
        ahora,
      );
    } else {
      fechaVencimiento =
        await LicenciaOrganizacionService.calcularVencimientoParaLicencia(
          licencia,
          ahora,
        );
    }

    const datos = {
      ...((licencia.datos_solicitud || {}) as Record<string, unknown>),
      estado_pago: "pagado",
      fecha_pago: ahora.toISOString(),
      ultimo_periodo_pagado: periodo,
    };

    const updatePayload: Record<string, unknown> = {
      fecha_vencimiento: fechaVencimiento,
      datos_solicitud: datos,
    };
    // Si estaba vencida y pagó, reactivamos.
    if (licencia.estado === "Vencida") {
      updatePayload.estado = "Activa";
    }

    const { data: updated, error: updError } = await supabaseAdmin
      .from("licencias")
      .update(updatePayload)
      .eq("id", licenciaId)
      .select()
      .single();

    if (updError || !updated) {
      throw new Error("Pago registrado pero no se pudo actualizar la vigencia.");
    }

    await NotificacionService.crearNotificacion({
      usuario_id: licencia.usuario_id,
      titulo: "Pago de licencia registrado",
      mensaje: `Se registró el pago del período ${periodo} de tu licencia ${updated.nro_licencia}. Vigente hasta ${fechaVencimiento.split("-").reverse().join("/")}.`,
      tipo: "success",
      metadata: {
        tipo: "licencia",
        licencia_id: updated.id,
        periodo,
      },
    }).catch(() => undefined);

    return {
      pago,
      licencia: updated,
      fecha_vencimiento: fechaVencimiento,
    };
  }

  static async listarPagos(licenciaId: string) {
    const { data, error } = await supabaseAdmin
      .from("licencia_pagos")
      .select(
        "id, licencia_id, usuario_id, periodo, monto, estado, metodo, mp_payment_id, notas, pagado_en, created_at, registrado_por",
      )
      .eq("licencia_id", licenciaId)
      .order("pagado_en", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
}

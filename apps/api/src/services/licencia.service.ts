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
import { descripcionVigenciaLicencia } from "../utils/licenciaConfig";

export class LicenciaService {
  static async obtenerLicencias(
    page: number,
    limit: number,
    search?: string,
    estado?: string,
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

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

    const { data, error, count } = await query.range(from, to);
    if (error) {
      console.error("🔴 Error al obtener licencias por perfil:", error);
      throw new Error("Error al listar licencias");
    }
    return { data: data || [], total: count || 0 };
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

    const precioAnual = Number(config.precioAnual || 0);
    const datosConPago = {
      ...datos,
      precio_anual: precioAnual,
      estado_pago: precioAnual > 0 ? "pendiente" : "no_aplica",
      moneda: "ARS",
    };

    const { data, error } = await supabaseAdmin
      .from("licencias")
      .insert([
        {
          usuario_id,
          estado: "Pendiente",
          nro_licencia: `PAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          datos_solicitud: datosConPago,
          club_id:
            typeof datos.club_id === "string" ? datos.club_id : null,
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

    const mensajePago =
      precioAnual > 0
        ? `Completá el pago de $${precioAnual.toLocaleString("es-AR")} para continuar con la revisión.`
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
        precio_anual: precioAnual,
      },
    }).catch((err) =>
      console.error("Error al notificar jugador de solicitud:", err),
    );

    return {
      ...data,
      precio_anual: precioAnual,
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
}

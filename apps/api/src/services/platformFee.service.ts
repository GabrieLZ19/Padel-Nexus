import { MercadoPagoConfig, Preference } from "mercadopago";
import { supabaseAdmin } from "../config/supabase";
import {
  buildMercadoPagoBackUrls,
  getMercadoPagoAccessToken,
  isMercadoPagoConfigured,
  mercadoPagoNotificationUrl,
  resolveMercadoPagoInitPoint,
} from "../config/mercadopago";
import {
  PLATFORM_FEE_CANALES,
  type PlatformFeeCanal,
  type PlatformFeeCheckoutBreakdown,
  type PlatformFeeModo,
  type PlatformFeeOrgRef,
  type PlatformFeeOrigen,
  type PlatformFeeTipo,
} from "../constants/platformFee";
import { precioUnitarioDesdeMonto } from "../utils/inscripcionMonto";

interface CanalConfigRow {
  canal: string;
  tipo: PlatformFeeTipo;
  valor: number;
  activo: boolean;
}

export class PlatformFeeService {
  static async listarCanales(): Promise<CanalConfigRow[]> {
    const { data, error } = await supabaseAdmin
      .from("plataforma_fee_canales")
      .select("canal, tipo, valor, activo")
      .in("canal", [...PLATFORM_FEE_CANALES])
      .order("canal");
    if (error) throw new Error("No se pudieron cargar los fees por canal.");
    return (data || []) as CanalConfigRow[];
  }

  static async actualizarCanal(
    canal: PlatformFeeCanal,
    patch: { tipo: PlatformFeeTipo; valor: number; activo: boolean },
  ) {
    const { data, error } = await supabaseAdmin
      .from("plataforma_fee_canales")
      .update({
        tipo: patch.tipo,
        valor: patch.valor,
        activo: patch.activo,
        actualizado_en: new Date().toISOString(),
      })
      .eq("canal", canal)
      .select()
      .single();
    if (error || !data) throw new Error("No se pudo actualizar el fee del canal.");
    return data;
  }

  static async obtenerPreferenciasOrg(org: PlatformFeeOrgRef) {
    const { data, error } = await supabaseAdmin
      .from("plataforma_fee_preferencias_org")
      .select("canal, modo")
      .eq("org_tipo", org.org_tipo)
      .eq("org_id", org.org_id);
    if (error) throw new Error("No se pudieron cargar preferencias de fee.");
    const map = new Map<string, PlatformFeeModo>();
    for (const row of data || []) {
      map.set(row.canal, row.modo as PlatformFeeModo);
    }
    return PLATFORM_FEE_CANALES.map((canal) => ({
      canal,
      modo: map.get(canal) ?? ("absorber" as PlatformFeeModo),
    }));
  }

  static async guardarPreferenciasOrg(
    org: PlatformFeeOrgRef,
    preferencias: Array<{ canal: PlatformFeeCanal; modo: PlatformFeeModo }>,
  ) {
    for (const pref of preferencias) {
      const { error } = await supabaseAdmin
        .from("plataforma_fee_preferencias_org")
        .upsert(
          {
            org_tipo: org.org_tipo,
            org_id: org.org_id,
            canal: pref.canal,
            modo: pref.modo,
            actualizado_en: new Date().toISOString(),
          },
          { onConflict: "org_tipo,org_id,canal" },
        );
      if (error) {
        throw new Error(`No se pudo guardar preferencia para ${pref.canal}.`);
      }
    }
    return PlatformFeeService.obtenerPreferenciasOrg(org);
  }

  static countPlazasInscripcion(usuario2Id: string | null | undefined): number {
    return usuario2Id ? 2 : 1;
  }

  static async resolverOrgDesdeTorneo(
    torneoId: string,
  ): Promise<PlatformFeeOrgRef> {
    const { data, error } = await supabaseAdmin
      .from("torneos")
      .select("club_id, asociacion_id, federacion_id")
      .eq("id", torneoId)
      .single();
    if (error || !data) throw new Error("Torneo no encontrado para fee.");
    if (data.federacion_id) {
      return { org_tipo: "federacion", org_id: data.federacion_id };
    }
    if (data.asociacion_id) {
      return { org_tipo: "asociacion", org_id: data.asociacion_id };
    }
    if (data.club_id) {
      return { org_tipo: "club", org_id: data.club_id };
    }
    throw new Error("El torneo no tiene organizador asociado.");
  }

  static async resolverOrgDesdeClub(clubId: string): Promise<PlatformFeeOrgRef> {
    return { org_tipo: "club", org_id: clubId };
  }

  static async resolverOrgDesdeLicencia(
    licenciaId: string,
  ): Promise<PlatformFeeOrgRef> {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select("asociacion_id")
      .eq("id", licenciaId)
      .single();
    if (error || !data) throw new Error("Licencia no encontrada.");
    if (data.asociacion_id) {
      return { org_tipo: "asociacion", org_id: data.asociacion_id };
    }
    const { data: fed } = await supabaseAdmin
      .from("federaciones")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (fed?.id) {
      return { org_tipo: "federacion", org_id: fed.id };
    }
    throw new Error("La licencia no tiene entidad emisora.");
  }

  static async resolverModoOrg(
    org: PlatformFeeOrgRef,
    canal: PlatformFeeCanal,
  ): Promise<PlatformFeeModo> {
    const { data } = await supabaseAdmin
      .from("plataforma_fee_preferencias_org")
      .select("modo")
      .eq("org_tipo", org.org_tipo)
      .eq("org_id", org.org_id)
      .eq("canal", canal)
      .maybeSingle();
    return (data?.modo as PlatformFeeModo) || "absorber";
  }

  static async obtenerConfigCanal(
    canal: PlatformFeeCanal,
  ): Promise<CanalConfigRow | null> {
    const { data } = await supabaseAdmin
      .from("plataforma_fee_canales")
      .select("canal, tipo, valor, activo")
      .eq("canal", canal)
      .maybeSingle();
    return (data as CanalConfigRow) || null;
  }

  static calcularMontoFee(
    config: CanalConfigRow | null,
    montoBruto: number,
    unidades = 1,
  ): number {
    if (!config || !config.activo || config.valor <= 0) {
      return 0;
    }
    if (config.tipo === "fijo") {
      return Math.round(config.valor * Math.max(1, unidades));
    }
    if (montoBruto <= 0) {
      return 0;
    }
    return Math.round((montoBruto * Number(config.valor)) / 100);
  }

  static async calcularCheckout(
    canal: PlatformFeeCanal,
    org: PlatformFeeOrgRef,
    montoBruto: number,
    unidades = 1,
  ): Promise<PlatformFeeCheckoutBreakdown> {
    const [config, modo] = await Promise.all([
      PlatformFeeService.obtenerConfigCanal(canal),
      PlatformFeeService.resolverModoOrg(org, canal),
    ]);
    const montoFee = PlatformFeeService.calcularMontoFee(
      config,
      montoBruto,
      unidades,
    );
    const sumar = modo === "sumar" && montoFee > 0;
    return {
      montoBruto,
      montoFee,
      montoTotal: sumar ? montoBruto + montoFee : montoBruto,
      modo,
      plazas: unidades,
      discriminadoEnCheckout: sumar,
    };
  }

  /** Campos estándar de desglose para preferencia / preview de checkout MP. */
  static camposCheckoutApi(breakdown: PlatformFeeCheckoutBreakdown): {
    monto_bruto: number;
    cargo_servicio: number;
    modo_fee: PlatformFeeModo;
    monto: number;
  } {
    return {
      monto_bruto: breakdown.montoBruto,
      cargo_servicio: breakdown.montoFee,
      modo_fee: breakdown.modo,
      monto: breakdown.montoTotal,
    };
  }

  /**
   * Checkout de inscripción: una línea por plaza + cargo(s) por servicio discriminado(s).
   */
  static buildMpItemsInscripcion(input: {
    inscripcionId: string;
    torneoNombre: string;
    precioPorPlaza: number;
    plazas: number;
    breakdown: PlatformFeeCheckoutBreakdown;
  }) {
    const items: Array<{
      id: string;
      title: string;
      quantity: number;
      unit_price: number;
      currency_id: "ARS";
    }> = [];

    for (let i = 1; i <= input.plazas; i++) {
      items.push({
        id: `${input.inscripcionId}-plaza-${i}`,
        title:
          input.plazas > 1
            ? `Inscripción: ${input.torneoNombre} · Plaza ${i}`
            : `Inscripción: ${input.torneoNombre}`,
        quantity: 1,
        unit_price: input.precioPorPlaza,
        currency_id: "ARS",
      });
    }

    if (input.breakdown.discriminadoEnCheckout && input.breakdown.montoFee > 0) {
      if (input.plazas > 1) {
        const base = Math.floor(input.breakdown.montoFee / input.plazas);
        let resto = input.breakdown.montoFee - base * input.plazas;
        for (let i = 1; i <= input.plazas; i++) {
          const feePlaza = base + (resto > 0 ? 1 : 0);
          if (resto > 0) resto -= 1;
          if (feePlaza <= 0) continue;
          items.push({
            id: `${input.inscripcionId}-fee-plaza-${i}`,
            title: `Cargo por servicio · Plaza ${i}`,
            quantity: 1,
            unit_price: feePlaza,
            currency_id: "ARS",
          });
        }
      } else {
        items.push({
          id: `${input.inscripcionId}-fee`,
          title: "Cargo por servicio Padel Nexus",
          quantity: 1,
          unit_price: input.breakdown.montoFee,
          currency_id: "ARS",
        });
      }
    }

    return items;
  }

  static buildMpItems(
    principal: { id: string; title: string; unit_price: number },
    breakdown: PlatformFeeCheckoutBreakdown,
  ) {
    const items = [
      {
        id: principal.id,
        title: principal.title,
        quantity: 1,
        unit_price: breakdown.montoBruto,
        currency_id: "ARS" as const,
      },
    ];
    if (breakdown.discriminadoEnCheckout && breakdown.montoFee > 0) {
      items.push({
        id: `${principal.id}-fee`,
        title: "Cargo por servicio Padel Nexus",
        quantity: 1,
        unit_price: breakdown.montoFee,
        currency_id: "ARS" as const,
      });
    }
    return items;
  }

  static async registrarMovimientoFee(input: {
    canal: PlatformFeeCanal;
    org: PlatformFeeOrgRef;
    entidadTipo: string;
    entidadId: string;
    torneoId?: string | null;
    plazasInscripcion?: number;
    montoBruto: number;
    modo: PlatformFeeModo;
    origen: PlatformFeeOrigen;
    mpPaymentId?: string;
    online: boolean;
  }) {
    const config = await PlatformFeeService.obtenerConfigCanal(input.canal);
    const unidades =
      input.canal === "inscripciones"
        ? input.plazasInscripcion ?? 1
        : 1;
    const montoFee = PlatformFeeService.calcularMontoFee(
      config,
      input.montoBruto,
      unidades,
    );
    if (montoFee <= 0) return null;

    let estado: "pendiente_organizador" | "cobrado_mp" | "descontar_liquidacion";
    if (!input.online) {
      estado = "pendiente_organizador";
    } else if (input.modo === "sumar") {
      estado = "cobrado_mp";
    } else {
      estado = "descontar_liquidacion";
    }

    const { data, error } = await supabaseAdmin
      .from("plataforma_fee_movimientos")
      .upsert(
        {
          canal: input.canal,
          org_tipo: input.org.org_tipo,
          org_id: input.org.org_id,
          entidad_tipo: input.entidadTipo,
          entidad_id: input.entidadId,
          torneo_id: input.torneoId ?? null,
          plazas_inscripcion: input.plazasInscripcion ?? null,
          monto_bruto: input.montoBruto,
          monto_fee: montoFee,
          modo_fee: input.modo,
          estado,
          origen_pago: input.origen,
          mp_payment_id: input.mpPaymentId ?? null,
        },
        { onConflict: "entidad_tipo,entidad_id,origen_pago", ignoreDuplicates: false },
      )
      .select()
      .single();

    if (error) {
      console.error("Error al registrar fee:", error.message);
      return null;
    }
    return data;
  }

  private static async registrarFeesInscripcionPorPlaza(input: {
    inscripcionId: string;
    torneoId: string;
    org: PlatformFeeOrgRef;
    montoTotal: number;
    plazas: number;
    soloNumerosPlaza?: number[];
    modo: PlatformFeeModo;
    origen: PlatformFeeOrigen;
    mpPaymentId?: string;
    online: boolean;
  }) {
    const plazas = Math.max(1, input.plazas);
    const brutoPorPlaza = Math.round(input.montoTotal / plazas);
    const indices =
      input.soloNumerosPlaza?.length &&
      input.soloNumerosPlaza.every((n) => n >= 1 && n <= plazas)
        ? input.soloNumerosPlaza
        : Array.from({ length: plazas }, (_, k) => k + 1);
    const registros = [];
    for (const i of indices) {
      const bruto =
        i === plazas
          ? input.montoTotal - brutoPorPlaza * (plazas - 1)
          : brutoPorPlaza;
      const row = await PlatformFeeService.registrarMovimientoFee({
        canal: "inscripciones",
        org: input.org,
        entidadTipo: "inscripcion_plaza",
        entidadId: `${input.inscripcionId}:plaza-${i}`,
        torneoId: input.torneoId,
        plazasInscripcion: 1,
        montoBruto: bruto,
        modo: input.modo,
        origen: input.origen,
        mpPaymentId: input.mpPaymentId,
        online: input.online,
      });
      if (row) registros.push(row);
    }
    return registros;
  }

  static async registrarFeeInscripcionOffPlatform(
    inscripcionId: string,
    origen: "manual" | "planilla",
  ) {
    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .select("id, torneo_id, monto, usuario2_id")
      .eq("id", inscripcionId)
      .single();
    if (error || !data) return null;

    const org = await PlatformFeeService.resolverOrgDesdeTorneo(data.torneo_id);
    const modo = await PlatformFeeService.resolverModoOrg(org, "inscripciones");
    const plazas = PlatformFeeService.countPlazasInscripcion(data.usuario2_id);

    return PlatformFeeService.registrarFeesInscripcionPorPlaza({
      inscripcionId,
      torneoId: data.torneo_id,
      org,
      montoTotal: Number(data.monto || 0),
      plazas,
      modo,
      origen,
      online: false,
    });
  }

  /**
   * Al cancelar o rechazar una inscripción: anula fees pendientes y acredita si ya estaban cobrados/liquidados.
   */
  static async anularFeesPorInscripcion(inscripcionId: string) {
    const prefijo = `${inscripcionId}:plaza-`;
    const { data: movs, error } = await supabaseAdmin
      .from("plataforma_fee_movimientos")
      .select("*")
      .eq("canal", "inscripciones")
      .eq("entidad_tipo", "inscripcion_plaza")
      .like("entidad_id", `${inscripcionId}:plaza-%`);
    if (error) {
      throw new Error("No se pudieron cargar movimientos de fee de la inscripción.");
    }

    const ESTADOS_PAGADOS = new Set(["cobrado_mp", "liquidado"]);

    for (const mov of movs || []) {
      if (!String(mov.entidad_id || "").startsWith(prefijo)) continue;
      if (mov.estado === "anulado") continue;

      const { error: updError } = await supabaseAdmin
        .from("plataforma_fee_movimientos")
        .update({ estado: "anulado" })
        .eq("id", mov.id);
      if (updError) {
        throw new Error("No se pudo anular el movimiento de fee.");
      }

      if (ESTADOS_PAGADOS.has(mov.estado as string)) {
        await PlatformFeeService.registrarCreditoOrganizadorFeeAnulado(mov);
      }
    }
  }

  private static async registrarCreditoOrganizadorFeeAnulado(mov: {
    id: string;
    canal: string;
    org_tipo: string;
    org_id: string;
    torneo_id: string | null;
    monto_fee: number;
    modo_fee: string;
  }) {
    const fee = Number(mov.monto_fee || 0);
    if (fee <= 0) return;

    const { error } = await supabaseAdmin.from("plataforma_fee_movimientos").upsert(
      {
        canal: mov.canal,
        org_tipo: mov.org_tipo,
        org_id: mov.org_id,
        entidad_tipo: "inscripcion_credito_anulacion",
        entidad_id: String(mov.id),
        torneo_id: mov.torneo_id,
        plazas_inscripcion: null,
        monto_bruto: 0,
        monto_fee: -fee,
        modo_fee: mov.modo_fee,
        estado: "descontar_liquidacion",
        origen_pago: "manual",
        mp_payment_id: null,
      },
      { onConflict: "entidad_tipo,entidad_id,origen_pago", ignoreDuplicates: true },
    );
    if (error) {
      console.error("Error al registrar crédito por anulación de fee:", error.message);
    }
  }

  static async registrarFeeInscripcionOnline(
    inscripcionId: string,
    mpPaymentId: string,
    _montoPagado?: number,
    soloNumerosPlaza?: number[],
  ) {
    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .select("id, torneo_id, monto, usuario2_id, torneos(precio_inscripcion)")
      .eq("id", inscripcionId)
      .single();
    if (error || !data) return null;

    const org = await PlatformFeeService.resolverOrgDesdeTorneo(data.torneo_id);
    const modo = await PlatformFeeService.resolverModoOrg(org, "inscripciones");
    const plazas = PlatformFeeService.countPlazasInscripcion(data.usuario2_id);
    const torneoRaw = data.torneos as
      | { precio_inscripcion?: number }
      | { precio_inscripcion?: number }[]
      | null;
    const torneo = Array.isArray(torneoRaw) ? torneoRaw[0] : torneoRaw;
    const precioPlaza = Number(
      torneo?.precio_inscripcion ??
        precioUnitarioDesdeMonto(Number(data.monto || 0), plazas),
    );

    const indices =
      soloNumerosPlaza?.length &&
      soloNumerosPlaza.every((n) => n >= 1 && n <= plazas)
        ? soloNumerosPlaza
        : Array.from({ length: plazas }, (_, i) => i + 1);

    const registros = [];
    for (const i of indices) {
      const row = await PlatformFeeService.registrarMovimientoFee({
        canal: "inscripciones",
        org,
        entidadTipo: "inscripcion_plaza",
        entidadId: `${inscripcionId}:plaza-${i}`,
        torneoId: data.torneo_id,
        plazasInscripcion: 1,
        montoBruto: precioPlaza,
        modo,
        origen: "mp_online",
        mpPaymentId,
        online: true,
      });
      if (row) registros.push(row);
    }
    return registros;
  }

  static async obtenerSaldoTorneo(torneoId: string) {
    const { data, error } = await supabaseAdmin
      .from("plataforma_fee_movimientos")
      .select("id, monto_fee")
      .eq("torneo_id", torneoId)
      .eq("estado", "pendiente_organizador");
    if (error) throw new Error("No se pudo calcular el saldo del torneo.");
    const filas = data || [];
    const total = filas.reduce((acc, row) => acc + Number(row.monto_fee || 0), 0);
    return {
      torneo_id: torneoId,
      cantidad_movimientos: filas.length,
      saldo_pendiente: total,
      moneda: "ARS",
    };
  }

  static async crearPreferenciaSaldoTorneo(
    torneoId: string,
    usuarioId: string,
    options?: { mobile?: boolean },
  ) {
    const saldo = await PlatformFeeService.obtenerSaldoTorneo(torneoId);
    if (saldo.saldo_pendiente <= 0) {
      throw new Error("No hay saldo pendiente con Padel Nexus para este torneo.");
    }

    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("nombre")
      .eq("id", torneoId)
      .single();

    const token = getMercadoPagoAccessToken();
    if (!isMercadoPagoConfigured()) {
      throw new Error("Mercado Pago no está configurado.");
    }

    const mpClient = new MercadoPagoConfig({ accessToken: token! });
    const preference = new Preference(mpClient);
    const backUrls = buildMercadoPagoBackUrls({
      mobile: options?.mobile,
      webPath: `/dashboard/torneos/${torneoId}`,
      mobileParams: { torneo_id: torneoId, saldo_fee: "1" },
    });

    const response = await preference.create({
      body: {
        items: [
          {
            id: `saldo-torneo-${torneoId}`,
            title: `Saldo Padel Nexus · ${torneo?.nombre || "Torneo"}`,
            quantity: 1,
            unit_price: saldo.saldo_pendiente,
            currency_id: "ARS",
          },
        ],
        back_urls: backUrls,
        auto_return: backUrls.success.startsWith("https://")
          ? "approved"
          : undefined,
        external_reference: `saldo_torneo:${torneoId}`,
        notification_url: mercadoPagoNotificationUrl(
          "/api/platform-fees/webhook/mercadopago",
        ),
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
      monto: saldo.saldo_pendiente,
      torneoId,
    };
  }

  static async confirmarSaldoTorneoDesdeWebhook(
    torneoId: string,
    paymentId: string,
  ) {
    const { error } = await supabaseAdmin
      .from("plataforma_fee_movimientos")
      .update({
        estado: "cobrado_mp",
        mp_payment_id: paymentId,
      })
      .eq("torneo_id", torneoId)
      .eq("estado", "pendiente_organizador");
    if (error) {
      throw new Error("No se pudo acreditar el pago del saldo del torneo.");
    }
    return PlatformFeeService.obtenerSaldoTorneo(torneoId);
  }

  static async reporteMensual(anio: number, mes: number) {
    const desde = new Date(anio, mes - 1, 1);
    const hasta = new Date(anio, mes, 1);
    const { data, error } = await supabaseAdmin
      .from("plataforma_fee_movimientos")
      .select("*")
      .gte("creado_en", desde.toISOString())
      .lt("creado_en", hasta.toISOString())
      .neq("estado", "anulado")
      .order("creado_en", { ascending: true });
    if (error) throw new Error("No se pudo generar el reporte mensual.");

    const filas = data || [];
    const ingresosBrutos = filas.reduce(
      (acc, row) => acc + Number(row.monto_bruto || 0),
      0,
    );
    const totalFees = filas.reduce(
      (acc, row) => acc + Number(row.monto_fee || 0),
      0,
    );

    return {
      periodo: { anio, mes },
      resumen: {
        operaciones: filas.length,
        ingresos_brutos: ingresosBrutos,
        fees_plataforma: totalFees,
      },
      movimientos: filas,
    };
  }

  static async listarLiquidacionesPendientes() {
    const { data, error } = await supabaseAdmin
      .from("plataforma_fee_movimientos")
      .select("*")
      .eq("estado", "descontar_liquidacion")
      .order("creado_en", { ascending: false })
      .limit(500);
    if (error) throw new Error("No se pudieron listar liquidaciones.");
    return data || [];
  }

  static async marcarLiquidacionTransferida(input: {
    org: PlatformFeeOrgRef;
    periodoMes: string;
    montoNeto: number;
    montoBruto: number;
    montoFees: number;
    cbu?: string;
    aliasCuenta?: string;
    adminId: string;
    notas?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from("plataforma_liquidaciones")
      .insert({
        org_tipo: input.org.org_tipo,
        org_id: input.org.org_id,
        periodo_mes: input.periodoMes,
        monto_bruto: input.montoBruto,
        monto_fees: input.montoFees,
        monto_neto: input.montoNeto,
        cbu: input.cbu ?? null,
        alias_cuenta: input.aliasCuenta ?? null,
        estado: "transferida",
        marcado_por: input.adminId,
        marcado_en: new Date().toISOString(),
        notas: input.notas ?? null,
      })
      .select()
      .single();
    if (error || !data) {
      throw new Error("No se pudo registrar la liquidación.");
    }

    await supabaseAdmin
      .from("plataforma_fee_movimientos")
      .update({ estado: "liquidado" })
      .eq("org_tipo", input.org.org_tipo)
      .eq("org_id", input.org.org_id)
      .eq("estado", "descontar_liquidacion");

    return data;
  }

  static async resolverDatosBancariosOrg(org: PlatformFeeOrgRef) {
    if (org.org_tipo === "club") {
      const { data } = await supabaseAdmin
        .from("clubes")
        .select("nombre, cbu, alias")
        .eq("id", org.org_id)
        .maybeSingle();
      return {
        nombre: data?.nombre || "Club",
        cbu: data?.cbu || null,
        alias: data?.alias || null,
      };
    }
    if (org.org_tipo === "asociacion") {
      const { data } = await supabaseAdmin
        .from("asociaciones")
        .select("nombre, licencia_pago_cbu, licencia_pago_alias")
        .eq("id", org.org_id)
        .maybeSingle();
      return {
        nombre: data?.nombre || "Asociación",
        cbu: data?.licencia_pago_cbu || null,
        alias: data?.licencia_pago_alias || null,
      };
    }
    const { data } = await supabaseAdmin
      .from("federaciones")
      .select("nombre, licencia_pago_cbu, licencia_pago_alias")
      .eq("id", org.org_id)
      .maybeSingle();
    return {
      nombre: data?.nombre || "Federación",
      cbu: data?.licencia_pago_cbu || null,
      alias: data?.licencia_pago_alias || null,
    };
  }

  private static porcentajeComisionMp(): number {
    const raw = process.env.MP_COMISION_PORCENTAJE?.trim();
    const n = raw ? Number(raw) : 6.29;
    return Number.isFinite(n) && n >= 0 ? n : 6.29;
  }

  static async resumenLiquidacionesOrganizadores() {
    const { data: movs, error } = await supabaseAdmin
      .from("plataforma_fee_movimientos")
      .select("*")
      .in("estado", ["descontar_liquidacion", "pendiente_organizador"]);
    if (error) {
      throw new Error("No se pudo armar el resumen de liquidaciones.");
    }
    const filas = movs || [];
    const grupos = new Map<
      string,
      {
        org_tipo: string;
        org_id: string;
        bruto_online: number;
        fees_descontar: number;
        saldo_pendiente: number;
        movimientos: number;
      }
    >();

    for (const row of filas) {
      const key = `${row.org_tipo}:${row.org_id}`;
      const g = grupos.get(key) || {
        org_tipo: row.org_tipo,
        org_id: row.org_id,
        bruto_online: 0,
        fees_descontar: 0,
        saldo_pendiente: 0,
        movimientos: 0,
      };
      g.movimientos += 1;
      if (row.estado === "pendiente_organizador") {
        g.saldo_pendiente += Number(row.monto_fee || 0);
      }
      if (row.estado === "descontar_liquidacion") {
        g.bruto_online += Number(row.monto_bruto || 0);
        g.fees_descontar += Number(row.monto_fee || 0);
      }
      grupos.set(key, g);
    }

    const comisionPct = PlatformFeeService.porcentajeComisionMp();
    const resultado = [];
    for (const g of grupos.values()) {
      const datosBanco = await PlatformFeeService.resolverDatosBancariosOrg({
        org_tipo: g.org_tipo as PlatformFeeOrgRef["org_tipo"],
        org_id: g.org_id,
      });
      const comision_mp = Math.round((g.bruto_online * comisionPct) / 100);
      const monto_neto =
        g.bruto_online - g.fees_descontar - comision_mp - g.saldo_pendiente;
      resultado.push({
        ...g,
        nombre: datosBanco.nombre,
        cbu: datosBanco.cbu,
        alias: datosBanco.alias,
        comision_mp,
        comision_mp_porcentaje: comisionPct,
        monto_neto: Math.max(0, monto_neto),
      });
    }

    resultado.sort((a, b) => b.monto_neto - a.monto_neto);
    return resultado;
  }

  static async historialLiquidaciones(limit = 50) {
    const { data, error } = await supabaseAdmin
      .from("plataforma_liquidaciones")
      .select("*")
      .order("creado_en", { ascending: false })
      .limit(limit);
    if (error) throw new Error("No se pudo cargar el historial.");
    return data || [];
  }
}
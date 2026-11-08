import { supabaseAdmin } from "../config/supabase";
import { LicenciaOrganizacionService } from "./licenciaOrganizacion.service";
import {
  aplicarEstadoEfectivoLicencia,
  estadoEfectivoLicencia,
} from "../utils/estadoLicencia";
import {
  calcularVencimientoTrasPagoMensual,
  periodoDesdeFecha,
} from "../utils/licenciaConfig";

export interface LicenciaClubRow {
  id: string;
  club_id: string;
  asociacion_id: string | null;
  nro_licencia: string;
  estado: string;
  fecha_emision: string | null;
  fecha_vencimiento: string | null;
  created_at?: string;
  updated_at?: string;
}

function generarNroLicenciaClub(clubId: string): string {
  const compact = clubId.replace(/-/g, "").toUpperCase().slice(0, 8);
  return `CLB-${compact}`;
}

function mapEstadoClubOperativoAEstadoLicencia(
  estadoClub?: string | null,
): "Activa" | "Pendiente" | "Suspendida" {
  const e = String(estadoClub || "Activo");
  if (e === "Pendiente") return "Pendiente";
  if (e === "Inactivo") return "Suspendida";
  return "Activa";
}

export class LicenciaClubService {
  static async obtenerPorClubId(clubId: string): Promise<LicenciaClubRow | null> {
    const { data, error } = await supabaseAdmin
      .from("licencias_club")
      .select("*")
      .eq("club_id", clubId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return aplicarEstadoEfectivoLicencia(data) as LicenciaClubRow;
  }

  static async asegurarLicenciaParaClub(
    clubId: string,
    asociacionId?: string | null,
    estadoClub?: string | null,
  ): Promise<LicenciaClubRow> {
    const existente = await LicenciaClubService.obtenerPorClubId(clubId);
    if (existente) return existente;

    const hoy = new Date();
    const vencimiento = new Date(hoy);
    vencimiento.setFullYear(vencimiento.getFullYear() + 1);

    const { data, error } = await supabaseAdmin
      .from("licencias_club")
      .insert({
        club_id: clubId,
        asociacion_id: asociacionId ?? null,
        nro_licencia: generarNroLicenciaClub(clubId),
        estado: mapEstadoClubOperativoAEstadoLicencia(estadoClub),
        fecha_emision: hoy.toISOString().slice(0, 10),
        fecha_vencimiento: vencimiento.toISOString().slice(0, 10),
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        const retry = await LicenciaClubService.obtenerPorClubId(clubId);
        if (retry) return retry;
      }
      throw new Error(error.message || "No se pudo crear la licencia del club.");
    }

    return aplicarEstadoEfectivoLicencia(data) as LicenciaClubRow;
  }

  static async actualizarEstado(
    licenciaId: string,
    nuevoEstado: "Activa" | "Pendiente" | "Suspendida" | "Vencida",
    fechaVencimiento?: string,
    adminId?: string,
  ) {
    const { data: actual, error } = await supabaseAdmin
      .from("licencias_club")
      .select("*, clubes(nombre)")
      .eq("id", licenciaId)
      .maybeSingle();
    if (error || !actual) throw new Error("Licencia de club no encontrada.");

    const patch: Record<string, unknown> = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    };
    if (fechaVencimiento) patch.fecha_vencimiento = fechaVencimiento;
    if (nuevoEstado === "Activa" && !actual.fecha_emision) {
      patch.fecha_emision = new Date().toISOString().slice(0, 10);
    }

    const { data, error: updError } = await supabaseAdmin
      .from("licencias_club")
      .update(patch)
      .eq("id", licenciaId)
      .select("*")
      .single();
    if (updError || !data) {
      throw new Error(updError?.message || "No se pudo actualizar la licencia.");
    }

    void adminId;
    return aplicarEstadoEfectivoLicencia(data) as LicenciaClubRow;
  }

  static async darDeBaja(licenciaId: string) {
    const { error } = await supabaseAdmin
      .from("licencias_club")
      .delete()
      .eq("id", licenciaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  }

  static async registrarPago(
    licenciaId: string,
    payload: {
      periodo?: string;
      monto?: number;
      metodo?: string;
      notas?: string;
      mp_payment_id?: string;
    },
    adminId?: string,
  ) {
    const { data: licencia, error } = await supabaseAdmin
      .from("licencias_club")
      .select("*")
      .eq("id", licenciaId)
      .single();
    if (error || !licencia) throw new Error("Licencia de club no encontrada.");

    const config = await LicenciaOrganizacionService.resolverConfigParaLicencia(
      { asociacion_id: licencia.asociacion_id, club_id: licencia.club_id },
    );

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

    const { error: pagoError } = await supabaseAdmin
      .from("licencias_club_pagos")
      .insert({
        licencia_club_id: licenciaId,
        club_id: licencia.club_id,
        periodo,
        monto,
        estado: "pagado",
        metodo: payload.metodo || "manual",
        mp_payment_id: payload.mp_payment_id || null,
        registrado_por: adminId || null,
        notas: payload.notas || null,
        pagado_en: ahora.toISOString(),
      });
    if (pagoError) {
      if (pagoError.code === "23505") {
        throw new Error(`Ya existe un pago registrado para el período ${periodo}.`);
      }
      throw new Error(pagoError.message);
    }

    let fechaVencimiento: string;
    if (config.frecuenciaPago === "mensual") {
      fechaVencimiento = calcularVencimientoTrasPagoMensual(
        config.diaCobro,
        ahora,
      );
    } else {
      fechaVencimiento =
        await LicenciaOrganizacionService.calcularVencimientoParaLicencia(
          { asociacion_id: licencia.asociacion_id, club_id: licencia.club_id },
          ahora,
        );
    }

    const updatePayload: Record<string, unknown> = {
      fecha_vencimiento: fechaVencimiento,
      updated_at: ahora.toISOString(),
    };
    if (
      estadoEfectivoLicencia(licencia.estado, licencia.fecha_vencimiento) ===
        "Vencida" ||
      licencia.estado === "Vencida"
    ) {
      updatePayload.estado = "Activa";
    }

    const { data: updated, error: updError } = await supabaseAdmin
      .from("licencias_club")
      .update(updatePayload)
      .eq("id", licenciaId)
      .select("*")
      .single();
    if (updError || !updated) {
      throw new Error("Pago registrado pero no se pudo actualizar la vigencia.");
    }

    return {
      licencia: aplicarEstadoEfectivoLicencia(updated) as LicenciaClubRow,
      fecha_vencimiento: fechaVencimiento,
      periodo,
    };
  }

  static async listarPagos(licenciaId: string) {
    const { data, error } = await supabaseAdmin
      .from("licencias_club_pagos")
      .select(
        "id, licencia_club_id, club_id, periodo, monto, estado, metodo, mp_payment_id, notas, pagado_en, created_at, registrado_por",
      )
      .eq("licencia_club_id", licenciaId)
      .order("pagado_en", { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
}

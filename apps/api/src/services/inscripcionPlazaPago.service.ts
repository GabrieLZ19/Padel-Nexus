import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_PAGO } from "../constants/fap";
import {
  montoInscripcionDesdePrecioTorneo,
  precioUnitarioDesdeMonto,
} from "../utils/inscripcionMonto";
import { PlatformFeeService } from "./platformFee.service";

export type InscripcionPlazaPagoRow = {
  id: string;
  inscripcion_id: string;
  numero_plaza: number;
  usuario_id: string | null;
  estado: string;
  monto: number;
  mp_payment_id: string | null;
};

export class InscripcionPlazaPagoService {
  static async listarPorInscripcion(
    inscripcionId: string,
  ): Promise<InscripcionPlazaPagoRow[]> {
    const { data, error } = await supabaseAdmin
      .from("inscripcion_plazas_pago")
      .select(
        "id, inscripcion_id, numero_plaza, usuario_id, estado, monto, mp_payment_id",
      )
      .eq("inscripcion_id", inscripcionId)
      .order("numero_plaza");
    if (error) throw new Error("No se pudieron cargar plazas de pago.");
    return (data || []) as InscripcionPlazaPagoRow[];
  }

  static async asegurarPlazasDesdeInscripcion(inscripcion: {
    id: string;
    usuario_id?: string | null;
    usuario2_id?: string | null;
    monto?: number | null;
    estado_pago?: string | null;
  }) {
    const plazas = PlatformFeeService.countPlazasInscripcion(
      inscripcion.usuario2_id,
    );
    const montoTotal = Number(inscripcion.monto || 0);
    const brutoPlaza = precioUnitarioDesdeMonto(montoTotal, plazas);
    const confirmado =
      inscripcion.estado_pago === FAP_ESTADOS_PAGO.CONFIRMADO;

    for (let n = 1; n <= plazas; n++) {
      const usuarioId =
        n === 1 ? inscripcion.usuario_id : inscripcion.usuario2_id;
      const { data: existing } = await supabaseAdmin
        .from("inscripcion_plazas_pago")
        .select("id")
        .eq("inscripcion_id", inscripcion.id)
        .eq("numero_plaza", n)
        .maybeSingle();

      const payload = {
        inscripcion_id: inscripcion.id,
        numero_plaza: n,
        usuario_id: usuarioId ?? null,
        monto: brutoPlaza,
        estado: confirmado
          ? FAP_ESTADOS_PAGO.CONFIRMADO
          : FAP_ESTADOS_PAGO.PENDIENTE,
        ...(confirmado ? { pagado_en: new Date().toISOString() } : {}),
      };

      if (existing?.id) {
        await supabaseAdmin
          .from("inscripcion_plazas_pago")
          .update({
            usuario_id: payload.usuario_id,
            monto: payload.monto,
            ...(confirmado
              ? {
                  estado: FAP_ESTADOS_PAGO.CONFIRMADO,
                  pagado_en: payload.pagado_en,
                }
              : {}),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("inscripcion_plazas_pago").insert(payload);
      }
    }
  }

  static numeroPlazaDelUsuario(
    inscripcion: {
      usuario_id?: string | null;
      usuario2_id?: string | null;
    },
    usuarioId: string,
  ): number | null {
    if (inscripcion.usuario_id === usuarioId) return 1;
    if (inscripcion.usuario2_id === usuarioId) return 2;
    return null;
  }

  static plazasPendientes(rows: InscripcionPlazaPagoRow[]): number[] {
    return rows
      .filter((r) => r.estado === FAP_ESTADOS_PAGO.PENDIENTE)
      .map((r) => r.numero_plaza);
  }

  static async marcarPlazasPagadas(input: {
    inscripcionId: string;
    numerosPlaza: number[];
    paymentId: string;
    montosPorPlaza?: Map<number, number>;
  }): Promise<InscripcionPlazaPagoRow[]> {
    const rows = await InscripcionPlazaPagoService.listarPorInscripcion(
      input.inscripcionId,
    );
    const pagadoEn = new Date().toISOString();

    for (const numero of input.numerosPlaza) {
      const row = rows.find((r) => r.numero_plaza === numero);
      if (!row) continue;
      if (row.estado === FAP_ESTADOS_PAGO.CONFIRMADO) continue;

      const { count } = await supabaseAdmin
        .from("inscripcion_plazas_pago")
        .select("id", { count: "exact", head: true })
        .eq("mp_payment_id", input.paymentId);
      if (count && count > 0) continue;

      const monto =
        input.montosPorPlaza?.get(numero) ?? Number(row.monto || 0);
      const { error } = await supabaseAdmin
        .from("inscripcion_plazas_pago")
        .update({
          estado: FAP_ESTADOS_PAGO.CONFIRMADO,
          mp_payment_id: input.paymentId,
          monto,
          pagado_en: pagadoEn,
        })
        .eq("id", row.id)
        .eq("estado", FAP_ESTADOS_PAGO.PENDIENTE);
      if (error) {
        throw new Error("No se pudo acreditar el pago de la plaza.");
      }
    }

    return InscripcionPlazaPagoService.listarPorInscripcion(input.inscripcionId);
  }

  static async sincronizarEstadoInscripcion(inscripcionId: string) {
    const rows = await InscripcionPlazaPagoService.listarPorInscripcion(
      inscripcionId,
    );
    if (!rows.length) return;

    const todasConfirmadas = rows.every(
      (r) => r.estado === FAP_ESTADOS_PAGO.CONFIRMADO,
    );
  if (!todasConfirmadas) return;

    const montoTotal = rows.reduce((a, r) => a + Number(r.monto || 0), 0);
    await supabaseAdmin
      .from("inscripciones")
      .update({
        estado_pago: FAP_ESTADOS_PAGO.CONFIRMADO,
        monto: montoTotal,
      })
      .eq("id", inscripcionId);
  }

  static montoBrutoPlazas(
    precioPorJugador: number,
    numerosPlaza: number[],
  ): number {
    return montoInscripcionDesdePrecioTorneo(
      precioPorJugador,
      numerosPlaza.length,
    );
  }
}
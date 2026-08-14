import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_TORNEO, FAP_ESTADOS_PAGO } from "../constants/fap";
import { MARKETPLACE_ESTADOS_ORDEN } from "../constants/marketplace";

export interface CrmMetricas {
  federaciones: number;
  asociaciones: number;
  clubes: number;
  jugadores: number;
  torneos_activos: number;
  torneos_finalizados: number;
  torneos_borrador: number;
  inscripciones_total: number;
  inscripciones_pagadas: number;
  inscripciones_pendientes: number;
  reservas_mes: number;
  ventas_marketplace: number;
  ventas_marketplace_count: number;
  ingresos_netos: number;
  ingresos_pendientes: number;
}

function countByEstado(
  rows: { estado?: string | null }[] | null,
  predicado: (estado: string) => boolean,
): number {
  return (rows || []).filter((row) => predicado((row.estado || "").toLowerCase())).length;
}

export class CrmDashboardService {
  static async obtenerMetricas(): Promise<CrmMetricas> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    const inicioMesIso = inicioMes.toISOString().slice(0, 10);

    const [
      federacionesRes,
      asociacionesRes,
      clubesRes,
      jugadoresRes,
      torneosRes,
      inscripcionesRes,
      reservasMesRes,
      ordenesMpRes,
    ] = await Promise.all([
      supabaseAdmin.from("federaciones").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("asociaciones").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("clubes").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("perfiles")
        .select("id", { count: "exact", head: true })
        .eq("rol", "usuario"),
      supabaseAdmin.from("torneos").select("estado"),
      supabaseAdmin.from("inscripciones").select("monto, estado_pago, tipo"),
      supabaseAdmin
        .from("reservas")
        .select("id", { count: "exact", head: true })
        .gte("fecha_reserva", inicioMesIso)
        .neq("estado_reserva", "cancelada"),
      supabaseAdmin.from("marketplace_ordenes").select("total, estado"),
    ]);

    const torneosActivos = countByEstado(torneosRes.data, (estado) =>
      [FAP_ESTADOS_TORNEO.INSCRIPCION.toLowerCase(), FAP_ESTADOS_TORNEO.EN_CURSO.toLowerCase()].includes(
        estado,
      ),
    );
    const torneosFinalizados = countByEstado(
      torneosRes.data,
      (estado) => estado === FAP_ESTADOS_TORNEO.FINALIZADO.toLowerCase(),
    );
    const torneosBorrador = countByEstado(
      torneosRes.data,
      (estado) => estado === FAP_ESTADOS_TORNEO.BORRADOR.toLowerCase(),
    );

    const inscripcionesTorneo = (inscripcionesRes.data || []).filter(
      (i) => !i.tipo || i.tipo === "Inscripción torneo",
    );
    const inscripcionesPagadas = inscripcionesTorneo.filter(
      (i) => (i.estado_pago || "").toLowerCase() === FAP_ESTADOS_PAGO.CONFIRMADO.toLowerCase(),
    );
    const inscripcionesPendientes = inscripcionesTorneo.filter(
      (i) => (i.estado_pago || "").toLowerCase() === FAP_ESTADOS_PAGO.PENDIENTE.toLowerCase(),
    );

    const ingresosTorneos = inscripcionesPagadas.reduce(
      (acc, i) => acc + Number(i.monto || 0),
      0,
    );
    const ingresosPendientes = (inscripcionesRes.data || [])
      .filter(
        (i) => (i.estado_pago || "").toLowerCase() === FAP_ESTADOS_PAGO.PENDIENTE.toLowerCase(),
      )
      .reduce((acc, i) => acc + Number(i.monto || 0), 0);

    const ordenesCobradas = (ordenesMpRes.data || []).filter((o) => {
      const estado = (o.estado || "").toLowerCase();
      return (
        estado === MARKETPLACE_ESTADOS_ORDEN.PAGADA ||
        estado === MARKETPLACE_ESTADOS_ORDEN.ENTREGADA
      );
    });
    const ventasMarketplace = ordenesCobradas.reduce(
      (acc, o) => acc + Number(o.total || 0),
      0,
    );

    return {
      federaciones: federacionesRes.count || 0,
      asociaciones: asociacionesRes.count || 0,
      clubes: clubesRes.count || 0,
      jugadores: jugadoresRes.count || 0,
      torneos_activos: torneosActivos,
      torneos_finalizados: torneosFinalizados,
      torneos_borrador: torneosBorrador,
      inscripciones_total: inscripcionesTorneo.length,
      inscripciones_pagadas: inscripcionesPagadas.length,
      inscripciones_pendientes: inscripcionesPendientes.length,
      reservas_mes: reservasMesRes.count || 0,
      ventas_marketplace: ventasMarketplace,
      ventas_marketplace_count: ordenesCobradas.length,
      ingresos_netos: ingresosTorneos + ventasMarketplace,
      ingresos_pendientes: ingresosPendientes,
    };
  }
}

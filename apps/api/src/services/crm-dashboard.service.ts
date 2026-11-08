import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_TORNEO, FAP_ESTADOS_PAGO } from "../constants/fap";
import { MARKETPLACE_ESTADOS_ORDEN } from "../constants/marketplace";
import { InscripcionService } from "./inscripcion.service";
import { CrmContactosService } from "./crm-contactos.service";

export interface CrmMetricas {
  federaciones: number;
  asociaciones: number;
  clubes: number;
  jugadores: number;
  jugadores_con_licencia: number;
  torneos_activos: number;
  torneos_finalizados: number;
  torneos_borrador: number;
  inscripciones_total: number;
  inscripciones_confirmadas: number;
  inscripciones_pagadas: number;
  inscripciones_pendientes: number;
  inscripciones_rechazadas: number;
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
      reservasMesRes,
      ordenesMpRes,
      resumenInscripciones,
      resumenContactos,
    ] = await Promise.all([
      supabaseAdmin.from("federaciones").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("asociaciones").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("clubes").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("perfiles")
        .select("id", { count: "exact", head: true })
        .eq("rol", "usuario"),
      supabaseAdmin.from("torneos").select("estado"),
      supabaseAdmin
        .from("reservas")
        .select("id", { count: "exact", head: true })
        .gte("fecha_reserva", inicioMesIso)
        .neq("estado_reserva", "cancelada"),
      supabaseAdmin.from("marketplace_ordenes").select("total, estado"),
      InscripcionService.obtenerResumenInscripciones(),
      CrmContactosService.obtenerResumen(),
    ]);

    const torneosActivos = countByEstado(torneosRes.data, (estado) =>
      [
        FAP_ESTADOS_TORNEO.INSCRIPCION.toLowerCase(),
        FAP_ESTADOS_TORNEO.CERRADO.toLowerCase(),
        FAP_ESTADOS_TORNEO.PROGRAMADO.toLowerCase(),
        FAP_ESTADOS_TORNEO.EN_CURSO.toLowerCase(),
      ].includes(estado),
    );
    const torneosFinalizados = countByEstado(
      torneosRes.data,
      (estado) => estado === FAP_ESTADOS_TORNEO.FINALIZADO.toLowerCase(),
    );
    const torneosBorrador = countByEstado(
      torneosRes.data,
      (estado) => estado === FAP_ESTADOS_TORNEO.BORRADOR.toLowerCase(),
    );

    const inscripcionesConfirmadas = resumenInscripciones.confirmadas;
    const inscripcionesPendientes = resumenInscripciones.pendientes;
    const inscripcionesRechazadas = resumenInscripciones.rechazadas;
    const inscripcionesTotal =
      inscripcionesConfirmadas +
      inscripcionesPendientes +
      inscripcionesRechazadas;

    const ingresosTorneos = resumenInscripciones.recaudacion;
    const ingresosPendientesRes = await supabaseAdmin
      .from("inscripciones")
      .select("monto, estado_pago")
      .eq("estado_pago", FAP_ESTADOS_PAGO.PENDIENTE);
    const ingresosPendientes = (ingresosPendientesRes.data || []).reduce(
      (acc, i) => acc + Number(i.monto || 0),
      0,
    );

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
      jugadores_con_licencia: resumenContactos.con_licencia,
      torneos_activos: torneosActivos,
      torneos_finalizados: torneosFinalizados,
      torneos_borrador: torneosBorrador,
      inscripciones_total: inscripcionesTotal,
      inscripciones_confirmadas: inscripcionesConfirmadas,
      inscripciones_pagadas: inscripcionesConfirmadas,
      inscripciones_pendientes: inscripcionesPendientes,
      inscripciones_rechazadas: inscripcionesRechazadas,
      reservas_mes: reservasMesRes.count || 0,
      ventas_marketplace: ventasMarketplace,
      ventas_marketplace_count: ordenesCobradas.length,
      ingresos_netos: ingresosTorneos + ventasMarketplace,
      ingresos_pendientes: ingresosPendientes,
    };
  }
}

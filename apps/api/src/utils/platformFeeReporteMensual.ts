import { supabaseAdmin } from "../config/supabase";
import type { PlatformFeeOrgRef } from "../constants/platformFee";

type FilaMovimiento = Record<string, unknown>;

export function calcularComisionMpMovimiento(
  montoBruto: number,
  origenPago: string,
  comisionPct: number,
): number {
  if (origenPago !== "mp_online") return 0;
  const bruto = Number(montoBruto);
  if (!Number.isFinite(bruto) || bruto <= 0) return 0;
  const pct = Number.isFinite(comisionPct) && comisionPct >= 0 ? comisionPct : 0;
  return Math.round((bruto * pct) / 100);
}

export function calcularNetoMovimientoFinanzas(
  montoBruto: number,
  montoFee: number,
  comisionMp: number,
): number {
  return Number(montoBruto) - Number(montoFee) - comisionMp;
}

async function mapNombresOrganizaciones(
  filas: FilaMovimiento[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const clubIds = new Set<string>();
  const asocIds = new Set<string>();
  const fedIds = new Set<string>();

  for (const row of filas) {
    const tipo = String(row.org_tipo || "");
    const id = String(row.org_id || "");
    if (!id) continue;
    if (tipo === "club") clubIds.add(id);
    else if (tipo === "asociacion") asocIds.add(id);
    else if (tipo === "federacion") fedIds.add(id);
  }

  if (clubIds.size) {
    const { data } = await supabaseAdmin
      .from("clubes")
      .select("id, nombre")
      .in("id", [...clubIds]);
    for (const c of data || []) {
      map.set(`club:${c.id}`, String(c.nombre || "Club"));
    }
  }
  if (asocIds.size) {
    const { data } = await supabaseAdmin
      .from("asociaciones")
      .select("id, nombre")
      .in("id", [...asocIds]);
    for (const a of data || []) {
      map.set(`asociacion:${a.id}`, String(a.nombre || "Asociación"));
    }
  }
  if (fedIds.size) {
    const { data } = await supabaseAdmin
      .from("federaciones")
      .select("id, nombre")
      .in("id", [...fedIds]);
    for (const f of data || []) {
      map.set(`federacion:${f.id}`, String(f.nombre || "Federación"));
    }
  }

  return map;
}

async function mapNombresTorneos(
  filas: FilaMovimiento[],
): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const row of filas) {
    const tid = row.torneo_id;
    if (tid) ids.add(String(tid));
  }
  const map = new Map<string, string>();
  if (!ids.size) return map;
  const { data } = await supabaseAdmin
    .from("torneos")
    .select("id, nombre")
    .in("id", [...ids]);
  for (const t of data || []) {
    map.set(String(t.id), String(t.nombre || "Torneo"));
  }
  return map;
}

function inscripcionIdDesdeEntidadPlaza(entidadId: string): string | null {
  const idx = entidadId.indexOf(":plaza-");
  if (idx === -1) return null;
  return entidadId.slice(0, idx);
}

function numeroPlazaDesdeEntidad(entidadId: string): string | null {
  const m = /:plaza-(\d+)$/.exec(entidadId);
  return m ? m[1] : null;
}

async function mapEtiquetasInscripciones(
  filas: FilaMovimiento[],
): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const row of filas) {
    if (row.entidad_tipo !== "inscripcion_plaza") continue;
    const insId = inscripcionIdDesdeEntidadPlaza(String(row.entidad_id || ""));
    if (insId) ids.add(insId);
  }
  const map = new Map<string, string>();
  if (!ids.size) return map;

  const { data } = await supabaseAdmin
    .from("inscripciones")
    .select(
      `
      id,
      torneos ( nombre )
    `,
    )
    .in("id", [...ids]);

  for (const ins of data || []) {
    const torneos = ins.torneos as { nombre?: string } | { nombre?: string }[] | null;
    const nombreTorneo = Array.isArray(torneos)
      ? torneos[0]?.nombre
      : torneos?.nombre;
    map.set(
      String(ins.id),
      nombreTorneo ? `Inscripción · ${nombreTorneo}` : "Inscripción",
    );
  }
  return map;
}

async function mapEtiquetasReservas(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const { data } = await supabaseAdmin
    .from("reservas")
    .select(
      `
      id, fecha_reserva,
      turnos ( canchas ( nombre, clubes ( nombre ) ) )
    `,
    )
    .in("id", ids);

  for (const r of data || []) {
    const turnos = r.turnos as {
      canchas?: { nombre?: string; clubes?: { nombre?: string } };
    } | null;
    const cancha = turnos?.canchas?.nombre || "Cancha";
    const club = turnos?.canchas?.clubes?.nombre || "";
    const fecha = r.fecha_reserva ? String(r.fecha_reserva) : "";
    map.set(
      String(r.id),
      club
        ? `Reserva · ${club} · ${cancha} · ${fecha}`
        : `Reserva · ${cancha} · ${fecha}`,
    );
  }
  return map;
}

async function mapEtiquetasLicencias(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const { data } = await supabaseAdmin
    .from("licencias")
    .select("id, nro_licencia")
    .in("id", ids);
  for (const l of data || []) {
    const nro = l.nro_licencia ? String(l.nro_licencia) : l.id;
    map.set(String(l.id), `Licencia · ${nro}`);
  }
  return map;
}

async function mapEtiquetasMarketplace(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!ids.length) return map;
  const { data } = await supabaseAdmin
    .from("marketplace_ordenes")
    .select("id, total")
    .in("id", ids);
  for (const o of data || []) {
    const total = Number(o.total ?? 0).toLocaleString("es-AR");
    map.set(String(o.id), `Orden marketplace · $${total}`);
  }
  return map;
}

function resolverNombreEntidad(
  row: FilaMovimiento,
  torneos: Map<string, string>,
  inscripciones: Map<string, string>,
  reservas: Map<string, string>,
  licencias: Map<string, string>,
  ordenes: Map<string, string>,
): string {
  const tipo = String(row.entidad_tipo || "");
  const entidadId = String(row.entidad_id || "");

  if (tipo === "inscripcion_plaza") {
    const insId = inscripcionIdDesdeEntidadPlaza(entidadId);
    const plaza = numeroPlazaDesdeEntidad(entidadId);
    const base = insId ? inscripciones.get(insId) || "Inscripción" : "Inscripción";
    return plaza ? `${base} · plaza ${plaza}` : base;
  }
  if (tipo === "inscripcion_credito_anulacion") {
    return "Crédito por anulación de inscripción";
  }
  if (tipo === "reserva") {
    return reservas.get(entidadId) || "Reserva";
  }
  if (tipo === "licencia") {
    return licencias.get(entidadId) || "Licencia";
  }
  if (tipo === "marketplace_orden") {
    return ordenes.get(entidadId) || "Orden marketplace";
  }

  const torneoId = row.torneo_id ? String(row.torneo_id) : "";
  if (torneoId && torneos.has(torneoId)) {
    return `${tipo} · ${torneos.get(torneoId)}`;
  }

  return tipo ? `${tipo}${entidadId ? ` (${entidadId})` : ""}` : entidadId;
}

export async function enriquecerMovimientosFinanzas(
  filas: FilaMovimiento[],
  comisionPct: number,
): Promise<
  Array<
    FilaMovimiento & {
      org_nombre: string;
      entidad_nombre: string;
      comision_mp: number;
      monto_neto: number;
    }
  >
> {
  const orgs = await mapNombresOrganizaciones(filas);
  const torneos = await mapNombresTorneos(filas);
  const inscripciones = await mapEtiquetasInscripciones(filas);

  const reservaIds: string[] = [];
  const licenciaIds: string[] = [];
  const ordenIds: string[] = [];
  for (const row of filas) {
    const tipo = String(row.entidad_tipo || "");
    const id = String(row.entidad_id || "");
    if (tipo === "reserva" && id) reservaIds.push(id);
    if (tipo === "licencia" && id) licenciaIds.push(id);
    if (tipo === "marketplace_orden" && id) ordenIds.push(id);
  }

  const [reservas, licencias, ordenes] = await Promise.all([
    mapEtiquetasReservas(reservaIds),
    mapEtiquetasLicencias(licenciaIds),
    mapEtiquetasMarketplace(ordenIds),
  ]);

  return filas.map((row) => {
    const orgKey = `${row.org_tipo}:${row.org_id}`;
    const org_tipo = String(row.org_tipo || "") as PlatformFeeOrgRef["org_tipo"];
    const org_nombre =
      orgs.get(orgKey) ||
      (org_tipo === "club"
        ? "Club"
        : org_tipo === "asociacion"
          ? "Asociación"
          : org_tipo === "federacion"
            ? "Federación"
            : "Organización");

    const origen = String(row.origen_pago || "");
    const bruto = Number(row.monto_bruto ?? 0);
    const fee = Number(row.monto_fee ?? 0);
    const comision_mp = calcularComisionMpMovimiento(bruto, origen, comisionPct);
    const monto_neto = calcularNetoMovimientoFinanzas(bruto, fee, comision_mp);

    return {
      ...row,
      org_nombre,
      entidad_nombre: resolverNombreEntidad(
        row,
        torneos,
        inscripciones,
        reservas,
        licencias,
        ordenes,
      ),
      comision_mp,
      monto_neto,
    };
  });
}
export interface TorneoAgrupable {
  id?: string;
  nombre?: string | null;
  nivel?: string | null;
  rama?: string | null;
  grupo_id?: string | null;
  alcance?: string | null;
  club_id?: string | null;
  clubes?: { provincia?: string | null } | null;
  solo_lectura?: boolean;
  puede_cargar_resultados?: boolean;
}

export interface RamaGrupo {
  rama: string;
  etiqueta: string;
  torneos: TorneoAgrupable[];
}

export interface GrupoListado {
  id: string | null;
  nombre: string | null;
  ramas: RamaGrupo[];
}

export function ramaCorta(rama?: string | null): string {
  const r = String(rama || "").toLowerCase();
  if (r.startsWith("fem") || r.includes("dama")) return "Fem.";
  if (r.startsWith("mix")) return "Mix.";
  if (r.startsWith("mas") || r.includes("cab")) return "Masc.";
  return "";
}

export function etiquetaRamaGrupo(rama?: string | null): string {
  const r = String(rama || "").toLowerCase();
  if (r.startsWith("fem") || r.includes("dama")) return "Categorías Damas";
  if (r.startsWith("mas") || r.includes("cab")) return "Categorías Caballeros";
  if (r.startsWith("mix")) return "Categorías Mixta";
  if (!rama) return "Sin rama";
  return `Categorías ${rama}`;
}

function ordenRama(rama?: string | null): number {
  const r = String(rama || "").toLowerCase();
  if (r.startsWith("fem") || r.includes("dama")) return 0;
  if (r.startsWith("mas") || r.includes("cab")) return 1;
  if (r.startsWith("mix")) return 2;
  return 3;
}

function ordenNivel(nivel?: string | null): number {
  const n = Number(String(nivel || "").match(/\d+/)?.[0]);
  return Number.isFinite(n) ? n : 0;
}

/** Nomenclatura CLI-4: `<evento> — <nivel> <rama corta>` sin duplicar sufijos del origen. */
export function nombreTorneoReplicado(
  nombreOrigen: string,
  nivelOrigen: string | null | undefined,
  ramaOrigen: string | null | undefined,
  nivelNuevo: string,
  ramaNueva: string,
): string {
  const base = nombreBaseTorneo(nombreOrigen, nivelOrigen, ramaOrigen);
  const etiquetaRama = ramaCorta(ramaNueva) || String(ramaNueva || "").trim();
  return `${base} — ${nivelNuevo} ${etiquetaRama}`.trim();
}

export function nombreBaseTorneo(
  nombre?: string | null,
  nivel?: string | null,
  rama?: string | null,
): string {
  let base = (nombre || "Torneo").trim();
  const sufijos = [
    `${nivel || ""} ${ramaCorta(rama)}`.trim(),
    nivel || "",
    ramaCorta(rama),
    rama || "",
  ].filter((s) => s.trim().length > 0);

  for (const s of sufijos) {
    const re = new RegExp(
      `[\\s—\\-–]*${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
      "i",
    );
    base = base.replace(re, "").trim();
  }
  return base || (nombre || "Torneo").trim();
}

export function armarGruposTorneo<T extends TorneoAgrupable>(
  torneos: T[],
  nombresGrupo: Map<string, string> = new Map(),
): Array<GrupoListado & { ramas: Array<RamaGrupo & { torneos: T[] }> }> {
  const cantidadPorBase = new Map<string, number>();
  for (const torneo of torneos) {
    if (torneo.grupo_id) continue;
    const base = nombreBaseTorneo(torneo.nombre, torneo.nivel, torneo.rama)
      .toLowerCase();
    cantidadPorBase.set(base, (cantidadPorBase.get(base) || 0) + 1);
  }

  const orden: string[] = [];
  const baldes = new Map<string, T[]>();
  const meta = new Map<string, { id: string | null; nombre: string | null }>();

  for (const torneo of torneos) {
    const base = nombreBaseTorneo(torneo.nombre, torneo.nivel, torneo.rama);
    const baseKey = base.toLowerCase();
    const explicito = Boolean(torneo.grupo_id);
    const comparteBase = (cantidadPorBase.get(baseKey) || 0) > 1;
    const clave = explicito
      ? `grupo:${torneo.grupo_id}`
      : comparteBase
        ? `base:${baseKey}`
        : `solo:${torneo.id || baseKey}`;

    if (!baldes.has(clave)) {
      baldes.set(clave, []);
      orden.push(clave);
      meta.set(clave, {
        id: explicito ? String(torneo.grupo_id) : null,
        nombre: explicito
          ? nombresGrupo.get(String(torneo.grupo_id)) || base
          : comparteBase
            ? base
            : null,
      });
    }
    baldes.get(clave)!.push(torneo);
  }

  return orden.map((clave) => {
    const lista = baldes.get(clave) || [];
    const info = meta.get(clave) || { id: null, nombre: null };
    const porRama = new Map<string, T[]>();
    for (const torneo of lista) {
      const rama = torneo.rama || "";
      const actual = porRama.get(rama) || [];
      actual.push(torneo);
      porRama.set(rama, actual);
    }
    const ramas = [...porRama.entries()]
      .sort((a, b) => ordenRama(a[0]) - ordenRama(b[0]))
      .map(([rama, items]) => ({
        rama,
        etiqueta: etiquetaRamaGrupo(rama),
        torneos: [...items].sort((a, b) => {
          const porNivel = ordenNivel(b.nivel) - ordenNivel(a.nivel);
          if (porNivel !== 0) return porNivel;
          return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
        }),
      }));
    return { id: info.id, nombre: info.nombre, ramas };
  });
}

/** CLI-14: si una categoría del evento pasa el filtro de vista, incluir al resto del mismo grupo_id. */
export function expandirTorneosMismoGrupoParaAgrupado<
  T extends { id?: string; grupo_id?: string | null },
>(filtrados: T[], universo: T[]): T[] {
  const grupoIds = new Set(
    filtrados
      .map((t) => (t.grupo_id ? String(t.grupo_id) : ""))
      .filter(Boolean),
  );
  if (!grupoIds.size) return filtrados;

  const idsIn = new Set(filtrados.map((t) => t.id).filter(Boolean));
  const extra = universo.filter(
    (t) =>
      t.grupo_id &&
      grupoIds.has(String(t.grupo_id)) &&
      t.id &&
      !idsIn.has(t.id),
  );
  if (!extra.length) return filtrados;
  return [...filtrados, ...extra];
}

export interface TorneoCategoriaEvento {
  id: string;
  nombre?: string | null;
  nivel?: string | null;
  categoria?: string | null;
  rama?: string | null;
  estado?: string | null;
  es_prueba?: boolean | null;
}

/** Etiqueta corta para selector CLI-5 (nivel + rama). */
export function etiquetaCategoriaEventoTorneo(torneo: {
  nombre?: string | null;
  nivel?: string | null;
  categoria?: string | null;
  rama?: string | null;
}): string {
  const nivel = String(torneo.nivel || "").trim();
  const categoria = String(torneo.categoria || "").trim();
  const rama = ramaCorta(torneo.rama);
  if (nivel && categoria) return `${nivel} ${categoria}`;
  if (nivel && rama) return `${nivel} ${rama}`;
  if (nivel) return nivel;
  const desdeNombre = nombreBaseTorneo(
    torneo.nombre,
    torneo.nivel,
    torneo.rama,
  );
  if (desdeNombre && desdeNombre !== (torneo.nombre || "").trim()) {
    return desdeNombre;
  }
  return String(torneo.nombre || torneo.categoria || "Categoría").trim();
}

export function resolverParesReplicar(
  origen: { nivel?: string | null; rama?: string | null },
  opciones: {
    niveles?: string[];
    ramas?: string[];
    pares?: Array<{ nivel?: string; rama?: string }>;
  },
): Array<{ nivel: string; rama: string }> {
  const nivelOrigen = String(origen.nivel || "").trim();
  const ramaOrigen = origen.rama || "Masculina";

  if (Array.isArray(opciones.pares) && opciones.pares.length > 0) {
    const vistos = new Set<string>();
    const out: Array<{ nivel: string; rama: string }> = [];
    for (const par of opciones.pares) {
      const nivel = String(par.nivel || "").trim();
      const rama = String(par.rama || "").trim();
      if (!nivel || !rama) continue;
      if (nivel === nivelOrigen && rama === ramaOrigen) continue;
      const clave = `${rama}|${nivel}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      out.push({ nivel, rama });
    }
    return out;
  }

  const niveles = (opciones.niveles || [])
    .map((n) => String(n || "").trim())
    .filter(Boolean);
  let ramasDestino = (opciones.ramas || [])
    .map((r) => String(r || "").trim())
    .filter(Boolean);
  if (ramasDestino.length === 0) ramasDestino = [ramaOrigen];

  const pares: Array<{ nivel: string; rama: string }> = [];
  for (const rama of ramasDestino) {
    for (const nivel of niveles) {
      if (rama === ramaOrigen && nivel === nivelOrigen) continue;
      pares.push({ rama, nivel });
    }
  }
  return pares;
}

export function ordenarTorneosCategoriaEvento<T extends TorneoCategoriaEvento>(
  torneos: T[],
): T[] {
  return [...torneos].sort((a, b) => {
    const porRama = ordenRama(a.rama) - ordenRama(b.rama);
    if (porRama !== 0) return porRama;
    const porNivel = ordenNivel(b.nivel) - ordenNivel(a.nivel);
    if (porNivel !== 0) return porNivel;
    return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es");
  });
}

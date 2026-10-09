export interface TorneoAgrupable {
  id?: string;
  nombre?: string | null;
  nivel?: string | null;
  rama?: string | null;
  grupo_id?: string | null;
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

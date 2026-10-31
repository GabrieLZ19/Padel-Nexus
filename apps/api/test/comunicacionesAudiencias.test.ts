import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function leerArchivo(subpath: string): string {
  const p1 = path.resolve(subpath);
  if (fs.existsSync(p1)) return fs.readFileSync(p1, "utf8");
  const p2 = path.resolve("apps/api", subpath);
  if (fs.existsSync(p2)) return fs.readFileSync(p2, "utf8");
  const p3 = path.resolve(subpath.replace(/^apps\/api\//, ""));
  if (fs.existsSync(p3)) return fs.readFileSync(p3, "utf8");
  throw new Error(`No se encontró el archivo: ${subpath}`);
}

describe("Comunicaciones - Audiencias múltiples y filtro de torneo", () => {
  it("resolverJugadoresAsociacion soporta 'todas' y selección múltiple", () => {
    const code = leerArchivo(
      "apps/api/src/services/comunicaciones-audiencia.service.ts",
    );
    assert.ok(
      code.includes('filter((id) => id && id !== "todas")') ||
        code.includes('filter((id) => id !== "todas")'),
      "Debe permitir la opción 'todas' sin exigir un ID único",
    );
    assert.ok(
      code.includes('.in("asociacion_id", targetAsocIds)'),
      "Debe consultar con el operador IN para soportar múltiples asociaciones",
    );
  });

  it("resolverJugadoresClub soporta 'todos' y selección múltiple", () => {
    const code = leerArchivo(
      "apps/api/src/services/comunicaciones-audiencia.service.ts",
    );
    assert.ok(
      code.includes('filter((id) => id && id !== "todos")') ||
        code.includes('filter((id) => id !== "todos")'),
      "Debe permitir la opción 'todos' sin exigir un ID único",
    );
    assert.ok(
      code.includes('.in("club_id", targetClubIds)'),
      "Debe consultar con el operador IN para soportar múltiples clubes",
    );
  });

  it("audiencia inscritos_torneo no filtra por licencia y exige entidad afiliada", () => {
    const code = leerArchivo(
      "apps/api/src/services/comunicaciones-audiencia.service.ts",
    );
    assert.ok(
      code.includes("case \"inscritos_torneo\":\n        // El jugador ya está inscripto según la condición del torneo; no se filtra por licencia.\n        return this.resolverInscritosTorneo(filtros);"),
      "inscritos_torneo no debe aplicar aplicarFiltroLicencia",
    );
    assert.ok(
      code.includes("!torneo.asociacion_id && !torneo.federacion_id"),
      "Debe exigir que el torneo pertenezca a una asociación o federación afiliada",
    );
  });
});

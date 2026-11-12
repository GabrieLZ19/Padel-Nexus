import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("ENT-6 listas manuales — agregar miembros", () => {
  it("expone POST /listas/:id/miembros y agregarMiembros en servicio", () => {
    const rutas = fuente("apps/api/src/routes/comunicaciones.routes.ts");
    const servicio = fuente("apps/api/src/services/comunicaciones.service.ts");
    assert.match(rutas, /\/listas\/:id\/miembros/);
    assert.match(servicio, /static async agregarMiembros/);
    assert.match(servicio, /filtrarMiembrosPorAlcance/);
  });

  it("buscarContactos prioriza jugadores (rol usuario)", () => {
    const servicio = fuente("apps/api/src/services/comunicaciones.service.ts");
    assert.match(servicio, /solo_jugadores/);
    assert.match(servicio, /\.eq\("rol", "usuario"\)/);
    assert.match(servicio, /orBusquedaContactosAdmin/);
  });

  it("UI permite agregar seleccionados a lista en edición", () => {
    const panel = fuente("apps/web/components/comunicaciones/ComunicacionesPanel.tsx");
    const service = fuente("apps/web/utils/services/comunicaciones.ts");
    assert.match(panel, /agregarMiembrosLista/);
    assert.match(panel, /Agregar seleccionados a la lista/);
    assert.match(service, /agregarMiembrosLista/);
  });

  it("audiencia expone filtrarMiembrosPorAlcance público", () => {
    const src = fuente(
      "apps/api/src/services/comunicaciones-audiencia.service.ts",
    );
    assert.match(src, /static async filtrarMiembrosPorAlcance/);
  });

  it("actualizar lista manual ignora filtros dinámicos en el payload", () => {
    const servicio = fuente("apps/api/src/services/comunicaciones.service.ts");
    assert.match(
      servicio,
      /actual\.tipo === "dinamica"[\s\S]*patch\.filtros = payload\.filtros/,
    );
    assert.equal(
      servicio.includes('throw new Error("Solo las listas dinámicas admiten filtros.")'),
      false,
    );

    const panel = fuente("apps/web/components/comunicaciones/ComunicacionesPanel.tsx");
    assert.match(panel, /listaTipo === "dinamica"/);
    assert.equal(panel.includes("filtros: listaTipo ==="), false);
  });
});

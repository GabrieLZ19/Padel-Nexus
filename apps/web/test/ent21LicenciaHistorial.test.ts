import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-21 · historial y UX de licencia en CRM", () => {
  it("ficha muestra fecha, hora y autor en historial", () => {
    const ficha = readFileSync(
      path.join(RAIZ, "app/dashboard/jugadores/[id]/page.tsx"),
      "utf8",
    );
    assert.match(ficha, /fechaHoraLatinaArgentina/);
    assert.match(ficha, /etiquetaAccionHistorialLicencia/);
    assert.match(ficha, /fechaLatina\(currentLicencia\.fecha_vencimiento\)/);
    assert.match(ficha, /confirmarReactivar/);
  });

  it("listado exige motivo de 3 caracteres y confirma reactivar", () => {
    const listado = readFileSync(
      path.join(RAIZ, "app/dashboard/jugadores/page.tsx"),
      "utf8",
    );
    assert.match(listado, /inputMinLength=\{3\}/);
    assert.match(listado, /reactivarLicencia/);
    assert.match(listado, /¿Reactivar licencia\?/);
    assert.match(listado, /Licencia reactivada/);
  });
});

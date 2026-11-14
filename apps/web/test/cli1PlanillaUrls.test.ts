import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(RAIZ, "public/plantillas/inscripciones");

describe("CLI-1 descarga de planillas", () => {
  it("plantillas oficiales en public", () => {
    assert.ok(existsSync(path.join(PUBLIC, "PLANILLA - FED NACIONAL.xls")));
    assert.ok(
      existsSync(path.join(PUBLIC, "PLANILLA - CLUB - ASOC PCIAL.xls")),
    );
  });

  it("utils apuntan a archivos y nombres de descarga", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "utils/inscripcionPlanilla.ts"),
      "utf8",
    );
    assert.match(fuente, /PLANILLA - FED NACIONAL\.xls/);
    assert.match(fuente, /PLANILLA - CLUB - ASOC PCIAL\.xls/);
    assert.match(
      fuente,
      /Planilla de inscripción · Federación Nacional\.xls/,
    );
    assert.match(
      fuente,
      /Planilla de inscripción · Clubes y asociaciones\.xls/,
    );
    assert.match(fuente, /PAREJAS/);
    assert.match(fuente, /LCOALIDAD\|LOCALIDAD\.\*PROVINCIA/);
  });
});

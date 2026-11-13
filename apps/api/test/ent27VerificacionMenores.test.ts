import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { exponeIdentidadVerificacionPublica } from "../src/utils/verificacionLicenciaPublica.ts";

const RAIZ_API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_MONO = path.resolve(RAIZ_API, "../..");

describe("ENT-27 verificación pública y menores", () => {
  it("expone identidad de menor solo con consulta autorizada", () => {
    assert.equal(exponeIdentidadVerificacionPublica(true, false), false);
    assert.equal(exponeIdentidadVerificacionPublica(true, true), true);
    assert.equal(exponeIdentidadVerificacionPublica(false, false), true);
  });

  it("verificar pública usa auth opcional y flag identidad_reservada_menor", () => {
    const rutas = readFileSync(
      path.join(RAIZ_API, "src/routes/sitioPublico.routes.ts"),
      "utf8",
    );
    assert.match(
      rutas,
      /optionalAuthenticate,\s*\n\s*verificarLicenciaPublica/,
    );
    const svc = readFileSync(
      path.join(RAIZ_API, "src/services/licencia.service.ts"),
      "utf8",
    );
    assert.match(svc, /identidad_reservada_menor/);
    assert.match(svc, /esRolAccesoCrm/);
    const verificar = readFileSync(
      path.join(RAIZ_MONO, "apps/web/app/(public)/verificar/[usuarioId]/page.tsx"),
      "utf8",
    );
    assert.match(verificar, /identidad_reservada_menor/);
  });
});

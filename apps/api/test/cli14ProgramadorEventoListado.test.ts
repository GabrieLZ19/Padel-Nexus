import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("CLI-14 evento agrupado y programador maestro", () => {
  it("programador maestro visible con grupo formal aunque haya una sola categoría", () => {
    const cmp = readFileSync(
      path.join(RAIZ, "../web/components/torneos/TorneoFilasAgrupadas.tsx"),
      "utf8",
    );
    assert.match(cmp, /eventoProgramacionHref && grupo\.id/);
    assert.doesNotMatch(cmp, /categorias >= 2/);
  });

  it("listado API agrupa sin duplicar torneos con grupo_id", () => {
    const util = readFileSync(
      path.join(RAIZ, "src/utils/gruposTorneo.ts"),
      "utf8",
    );
    assert.match(util, /if \(torneo\.grupo_id\) continue/);
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(svc, /agrupar\)/);
    assert.match(svc, /armarGruposTorneo/);
  });
});
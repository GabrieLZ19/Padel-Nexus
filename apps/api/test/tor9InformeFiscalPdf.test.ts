import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-9 API devuelve fiscal emisor en crear informe", () => {
  it("registrarIncidencia incluye fiscales con nombre y apellido", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/fiscal-panel.service.ts"),
      "utf8",
    );
    const idx = svc.indexOf("conversacion_id: notifResult");
    assert.ok(idx > 0);
    const bloque = svc.slice(idx, idx + 280);
    assert.match(bloque, /fiscales:\s*\{/);
    assert.match(bloque, /nombre: fiscal\.nombre/);
    assert.match(bloque, /apellido: fiscal\.apellido/);
  });
});

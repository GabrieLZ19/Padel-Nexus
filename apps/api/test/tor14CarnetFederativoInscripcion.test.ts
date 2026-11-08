import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-14 mensaje inscripción sin sigla FAP", () => {
  it("rechazo por carnet usa copy R5 en inscripcion.service", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.equal(svc.includes("licencia FAP vigente"), false);
    assert.match(
      svc,
      /se requiere carnet federativo vigente para este torneo/,
    );
  });
});

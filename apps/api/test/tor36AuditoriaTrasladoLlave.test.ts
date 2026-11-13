import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-36 auditoría de pareja desplazada en llave", () => {
  it("liberar duplicados devuelve cambios para auditoría secundaria", () => {
    const dup = readFileSync(
      path.join(RAIZ, "src/utils/edicionLlaveDuplicados.ts"),
      "utf8",
    );
    assert.match(dup, /cambiosAuditoria/);
    assert.match(dup, /CambioSecundarioLlaveAuditoria/);
  });

  it("actualizarEquiposPartido registra cruces secundarios afectados", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("static async actualizarEquiposPartido"),
      svc.indexOf("static async gestionarParejaLlave"),
    );
    assert.match(bloque, /cambiosLlaveSecundarios/);
    assert.match(bloque, /registrarAuditoriaCambioParejaPartido/);
  });
});

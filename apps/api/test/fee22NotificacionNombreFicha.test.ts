import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const API = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-22 notificaciones con nombres desde ficha", () => {
  it("registrarInscripcion usa nombreJ1Persistido en notificaciones", () => {
    const svc = readFileSync(
      path.join(API, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    const bloque = svc.slice(
      svc.indexOf("nombreJ1Persistido = formatNombreCompleto"),
      svc.indexOf("return inscripcionInsertada"),
    );
    assert.match(bloque, /jugadoresTexto[\s\S]*nombreJ1Persistido/);
    assert.match(bloque, /nombreJ2Persistido/);
    assert.doesNotMatch(bloque, /jugador1Nombre \|\| solicitante/);
    assert.match(bloque, /Fuiste inscripto junto a \$\{nombreJ1Persistido\}/);
  });
});
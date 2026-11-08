import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { formatearFechaHoraArgentina } from "../utils/fechaArgentina.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("ENT-8 historial de campañas — hora 24 h Argentina", () => {
  it("ComunicacionesPanel usa formatearFechaHoraArgentina en el historial", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/comunicaciones/ComunicacionesPanel.tsx"),
      "utf8",
    );
    assert.match(fuente, /formatearFechaHoraArgentina\(c\.created_at\)/);
    assert.equal(
      fuente.includes('toLocaleString("es-AR")'),
      false,
      "toLocaleString es-AR muestra hora en 12 h sin a.m./p.m.",
    );
  });

  it("16:15 hora Argentina no se muestra como 04:15", () => {
    const label = formatearFechaHoraArgentina("2026-11-06T19:15:00.000Z");
    assert.match(label, /16:15/);
    assert.equal(label.includes("04:15"), false);
  });
});

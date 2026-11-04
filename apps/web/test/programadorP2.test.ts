import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { formatearFechaHoraArgentina } from "../utils/fechaArgentina.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("P2 programador visual", () => {
  it("no fuerza horaInicio 08:00 en el query del board", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/programador/useProgramadorBoard.ts"),
      "utf8",
    );
    assert.equal(fuente.includes('horaInicio: "08:00"'), false);
    assert.match(fuente, /horaInicio: ""/);
    assert.match(
      fuente,
      /\.\.\.\(config\.horaInicio \? \{ horaInicio: config\.horaInicio \} : \{\}\)/,
    );
  });

  it("hidrata descanso_modo desde el board", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/programador/useProgramadorBoard.ts"),
      "utf8",
    );
    assert.match(fuente, /descanso_modo/);
    assert.match(fuente, /descansoModo: descansoValido/);
  });

  it("las alertas formatean fecha_partido en hora Argentina", () => {
    const fuente = readFileSync(
      path.join(RAIZ, "components/torneos/programador/ConflictosPanel.tsx"),
      "utf8",
    );
    assert.match(fuente, /formatearFechaHoraArgentina/);
    assert.equal(
      fuente.includes('.replace("T", " ").slice(0, 16)'),
      false,
    );

    // 00:00 AR = 03:00 UTC
    const label = formatearFechaHoraArgentina("2026-11-28T03:00:00.000Z");
    assert.match(label, /00:00/);
    assert.equal(label.includes("03:00"), false);
  });
});

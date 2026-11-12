import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resumenBloqueoAgenda } from "../../web/utils/bloqueoDisponibilidad.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("RES-14 motivo de bloqueo — sin title case CSS", () => {
  it("resumenBloqueoAgenda conserva el motivo tal como se guardó", () => {
    assert.equal(
      resumenBloqueoAgenda("torneo", "mantenimiento de redes"),
      "Torneo · mantenimiento de redes",
    );
    assert.equal(
      resumenBloqueoAgenda("otro", "clase de pádel escolar"),
      "Otro · clase de pádel escolar",
    );
  });

  it("agenda de reservas del club no usa capitalize en la celda de bloqueo", () => {
    const pagina = readFileSync(
      path.join(RAIZ, "web/app/club/reservas/page.tsx"),
      "utf8",
    );
    assert.match(pagina, /resumenBloqueoAgenda/);
    assert.doesNotMatch(
      pagina,
      /bloqueo[\s\S]{0,400}capitalize/,
      "La celda de bloqueo no debe aplicar capitalize",
    );
  });
});

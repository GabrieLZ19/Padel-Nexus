import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { FapBracketMatch } from "../src/utils/fapBracketTypes.ts";
import {
  LlaveConflictoError,
} from "../src/utils/edicionLlaveDuplicados.ts";
import {
  debeOmitirValidacionMatrizFapAlta,
  PLACEHOLDER_INSCRIPCION_ALTA_LLAVE,
  prevalidarAltaEnSlotLlaveFap,
  proyectarNextTrasAltaPendiente,
} from "../src/utils/edicionLlaveFap.ts";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-50 rollback y prevalidación alta en llave", () => {
  it("proyectarNextTrasAltaPendiente usa placeholder cuando falta equipo", () => {
    const r = proyectarNextTrasAltaPendiente(null, null, null, null, true, false);
    assert.equal(r.nextA, PLACEHOLDER_INSCRIPCION_ALTA_LLAVE);
    assert.equal(r.nextB, null);
  });

  it("prevalidar permite alta en hueco W* cuando aplica materialización bye", () => {
    const matrix: FapBracketMatch[] = [
      { matchNo: 16, a: "1A", b: "2B", winnerTo: 19 },
      { matchNo: 19, a: "1A", b: "W16", winnerTo: 22 },
    ];
    const spec = matrix[1];
    const { nextA, nextB } = proyectarNextTrasAltaPendiente(
      "insc-1a",
      null,
      null,
      null,
      false,
      true,
    );
    assert.ok(
      debeOmitirValidacionMatrizFapAlta(
        spec,
        19,
        matrix,
        "insc-1a",
        null,
        nextA,
        nextB,
        "b",
      ),
    );
    assert.doesNotThrow(() =>
      prevalidarAltaEnSlotLlaveFap(
        spec,
        19,
        matrix,
        "insc-1a",
        null,
        null,
        null,
        false,
        true,
        undefined,
      ),
    );
  });

  it("prevalidarAltaEnSlotLlaveFap rechaza alta en Gan. vs 3C sin materialización", () => {
    const matrix: FapBracketMatch[] = [
      { matchNo: 16, a: "1A", b: "2B" },
      { matchNo: 19, a: "W16", b: "3C" },
    ];
    const spec = matrix[1];
    assert.throws(
      () =>
        prevalidarAltaEnSlotLlaveFap(
          spec,
          19,
          matrix,
          null,
          null,
          null,
          null,
          false,
          true,
        ),
      (err: unknown) => {
        assert.ok(err instanceof LlaveConflictoError);
        return true;
      },
    );
  });

  it("prevalidarAltaEnSlotLlaveFap rechaza alta en lado W* sin materialización", () => {
    const matrix: FapBracketMatch[] = [
      { matchNo: 16, a: "1A", b: "2B" },
      { matchNo: 19, a: "W16", b: "3C" },
    ];
    const spec = matrix[1];
    assert.throws(
      () =>
        prevalidarAltaEnSlotLlaveFap(
          spec,
          19,
          matrix,
          null,
          null,
          null,
          null,
          true,
          false,
        ),
      (err: unknown) => {
        assert.ok(err instanceof LlaveConflictoError);
        return true;
      },
    );
  });

  it("torneo.service usa rollback sin cancelarInscripcion", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/torneo.service.ts"),
      "utf8",
    );
    assert.match(svc, /prevalidarAltaEnSlotLlaveFap/);
    assert.match(svc, /revertirInscripcionAltaLlave/);
    assert.doesNotMatch(
      svc,
      /catch \(error\)[\s\S]*cancelarInscripcion/,
    );
  });

  it("inscripcion.service expone revertir sin assertPasoJugadoresEditable", () => {
    const svc = readFileSync(
      path.join(RAIZ, "src/services/inscripcion.service.ts"),
      "utf8",
    );
    assert.match(svc, /revertirInscripcionAltaLlave/);
    const bloque = svc.slice(
      svc.indexOf("revertirInscripcionAltaLlave"),
      svc.indexOf("static async cancelarInscripcion"),
    );
    assert.doesNotMatch(bloque, /assertPasoJugadoresEditable/);
  });
});
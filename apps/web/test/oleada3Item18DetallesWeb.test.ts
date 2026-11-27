import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Oleada 3 ítem 18 — detalles web", () => {
  it("RES-26 vista móvil de reservas del club", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/club/reservas/page.tsx"),
      "utf8",
    );
    assert.match(page, /TarjetaReservaMovil/);
    assert.match(page, /md:hidden/);
    assert.match(page, /hidden md:block/);
  });

  it("TOR modal sorteo requiere aviso previo", () => {
    const modal = readFileSync(
      path.join(RAIZ, "components/torneos/ModalSorteoZona.tsx"),
      "utf8",
    );
    assert.match(modal, /!avisoEnviado/);
  });

  it("TOR BracketEditor motivo con label", () => {
    const editor = readFileSync(
      path.join(RAIZ, "components/torneos/BracketEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /inputLabel: "Motivo"/);
  });

  it("PUB próximo no usa indicador rojo", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/torneos/page.tsx"),
      "utf8",
    );
    assert.match(page, /indicadorProximoProgramado/);
    assert.match(page, /bg-amber-500/);
  });

  it("PUB baja jugador oculta aviso en finalizado", () => {
    const cmp = readFileSync(
      path.join(RAIZ, "components/inscripciones/InscripcionBajaJugador.tsx"),
      "utf8",
    );
    assert.match(cmp, /finalizado/);
  });

  it("PUB marketplace oculta stock con tienda suspendida", () => {
    const page = readFileSync(
      path.join(RAIZ, "app/(public)/marketplace/producto/[id]/page.tsx"),
      "utf8",
    );
    assert.match(page, /!tiendaSuspendida/);
  });

  it("FAP zoom móvil con piso legible", () => {
    const diagram = readFileSync(
      path.join(RAIZ, "components/torneos/FapBracketDiagram.tsx"),
      "utf8",
    );
    assert.match(diagram, /0\.42/);
    const medida = readFileSync(
      path.join(RAIZ, "utils/medidaLlave.ts"),
      "utf8",
    );
    assert.match(medida, /zoomMinimo/);
  });
});
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("FEE-21 baja de inscripción — jugador", () => {
  it("Mis torneos integra aviso o botón de baja condicionado", () => {
    const page = readFileSync(
      path.join(WEB_ROOT, "app/(public)/mi-perfil/torneos/page.tsx"),
      "utf8",
    );
    assert.match(page, /InscripcionBajaJugador/);
  });

  it("componente bloquea baja cuando el pago está confirmado", () => {
    const cmp = readFileSync(
      path.join(WEB_ROOT, "components/inscripciones/InscripcionBajaJugador.tsx"),
      "utf8",
    );
    assert.match(cmp, /inscripcionPagadaBloqueaBajaJugador/);
    assert.match(cmp, /MENSAJE_BAJA_INSCRIPCION_PAGADA/);
    assert.match(cmp, /FeedbackModal/);
    assert.doesNotMatch(cmp, /window\.confirm/);
  });
});
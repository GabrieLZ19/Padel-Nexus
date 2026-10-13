import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWizardPasoReadOnly,
  pasoBloqueadoPorAlcance,
  textoBannerModoLectura,
} from "../../web/components/torneos/wizard/stepLocks";
import {
  estadoAlPublicarProgramacion,
  puedeCargarResultadoOficial,
} from "../src/utils/estadoCompetencia";

describe("paso a En curso al publicar", () => {
  it("publicar pasa Programado a En curso y no reabre un finalizado", () => {
    assert.equal(estadoAlPublicarProgramacion("Programado"), "En curso");
    assert.equal(estadoAlPublicarProgramacion("En curso"), null);
    assert.equal(estadoAlPublicarProgramacion("Finalizado"), null);
    assert.equal(estadoAlPublicarProgramacion("Cerrado"), null);
  });

  it("un resultado no habilita la carga antes de publicar", () => {
    assert.equal(puedeCargarResultadoOficial("Programado"), false);
    assert.equal(puedeCargarResultadoOficial("En curso"), true);
    assert.equal(puedeCargarResultadoOficial("Finalizado"), true);
  });

  it("En curso deja cuadros editables y resultados habilitados", () => {
    assert.equal(isWizardPasoReadOnly("En curso", "draws"), false);
    assert.equal(isWizardPasoReadOnly("En curso", "matches"), false);
    assert.equal(isWizardPasoReadOnly("Programado", "draws"), false);
    assert.equal(isWizardPasoReadOnly("Programado", "matches"), true);
    assert.equal(isWizardPasoReadOnly("Finalizado", "matches"), true);
    assert.equal(
      pasoBloqueadoPorAlcance(
        { estado: "Programado", solo_lectura: true, puede_cargar_resultados: true },
        "matches",
      ),
      true,
    );
    assert.equal(
      pasoBloqueadoPorAlcance(
        { estado: "En curso", solo_lectura: true, puede_cargar_resultados: true },
        "matches",
      ),
      false,
    );
    assert.equal(
      pasoBloqueadoPorAlcance(
        { estado: "En curso", solo_lectura: true, puede_cargar_resultados: false },
        "matches",
      ),
      true,
    );
    assert.match(textoBannerModoLectura("Programado"), /publicar la programación/);
    assert.match(textoBannerModoLectura("En curso"), /auditoría/);
  });
});

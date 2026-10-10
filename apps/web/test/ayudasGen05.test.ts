import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("GEN-05 ayudas sin repetir", () => {
  it("el paso 1 no repite el alcance elegido y deja un solo aviso", () => {
    const paso = fuente("components/torneos/wizard/Paso1Datos.tsx");
    for (const frase of [
      "Alcance Nacional:",
      "Alcance Local",
      "se aplica el reglamento",
      "organiza la Federación",
      "Los partidos comienzan directamente",
      "Se juegan primero zonas",
    ]) {
      assert.equal(paso.includes(frase), false, frase);
    }
    const avisos = paso.match(/<p className="text-sm text-gray-400/g) ?? [];
    assert.equal(avisos.length, 1);
  });

  it("Jugadores dice una sola vez cómo editar el vencimiento", () => {
    const frase = "El vencimiento individual se edita en la fecha de cada jugador.";
    const pagina = fuente("app/dashboard/jugadores/page.tsx");
    const tarjeta = fuente("components/licencias/LicenciaVencimientoEditor.tsx");
    assert.equal(pagina.split(frase).length - 1, 1);
    assert.equal(tarjeta.includes("Clic para editar vencimiento individual"), false);
  });

  it("Resultados no repite el aviso de sede en cada partido", () => {
    const fila = fuente("components/torneos/LiveArbitrajeRow.tsx");
    const paso = fuente("components/torneos/wizard/Paso9Arbitraje.tsx");
    assert.equal(fila.includes("Sin sede/horario"), false);
    assert.equal(fila.includes("definí en el programador"), false);
    assert.equal(paso.includes("Tocá el encabezado"), false);
    assert.equal(paso.split("se definen en el programador").length - 1, 1);
    assert.equal(paso.includes("partidos.some(partidoSinSedeNiHorario)"), true);
  });
});

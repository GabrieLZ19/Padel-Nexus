import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = path.resolve(WEB, "../api");

function fuente(raiz: string, relativo: string): string {
  return readFileSync(path.join(raiz, relativo), "utf8");
}

describe("GEN-10 filas y tablero", () => {
  it("Torneos e Inscripciones abren con 25 filas y permiten 10, 25 o 50", () => {
    for (const pagina of [
      "app/dashboard/torneos/page.tsx",
      "app/dashboard/inscripciones/page.tsx",
    ]) {
      const texto = fuente(WEB, pagina);
      assert.match(texto, /PAGE_SIZE_INICIAL = 25/);
      assert.match(texto, /\[10, 25, 50\]/);
    }
  });

  it("el tablero no espera el padrón completo ni las inscripciones de cada torneo", () => {
    const tablero = fuente(WEB, "components/dashboard/DashboardFederacion.tsx");
    const listado = fuente(API, "src/services/torneo.service.ts");
    const licencias = fuente(API, "src/services/licencia.service.ts");
    assert.match(tablero, /getResumenTablero\(/);
    assert.equal(tablero.includes("ClubesService.getAll"), false);
    const antesDelTope = listado.split("query.limit(5000)")[0] || "";
    assert.equal(antesDelTope.includes("inscripciones(usuario_id)"), false);
    assert.match(licencias, /resumenDesdeTablaLicencias/);
  });
});

describe("GEN-11 error en el campo", () => {
  it("el paso 1 marca solo el campo vacío y guardar no abre una ventana", () => {
    const paso = fuente(WEB, "components/torneos/wizard/Paso1Datos.tsx");
    assert.equal(
      paso.includes(
        "Completá nombre, fecha de inicio, fecha de finalización y centro de cómputos",
      ),
      false,
    );
    assert.match(paso, /Completá la fecha de finalización/);
    assert.match(paso, /sileo\.success/);
    assert.equal(paso.includes("¡Cambios guardados!"), false);
    const categorias = fuente(WEB, "components/torneos/wizard/Paso3Categorias.tsx");
    const cierre = fuente(WEB, "components/torneos/wizard/Paso7Cierre.tsx");
    assert.equal(categorias.includes("¡Cambios guardados!"), false);
    assert.equal(cierre.includes("¡Configuración guardada!"), false);
    assert.match(categorias, /sileo\.success/);
    assert.match(cierre, /sileo\.success/);
  });
});

describe("GEN-12 teclado", () => {
  it("el desplegable se alcanza con Tab y los cierres tienen nombre", () => {
    const dropdown = fuente(WEB, "components/ui/CustomDropdown.tsx");
    assert.match(dropdown, /aria-haspopup="listbox"/);
    assert.match(dropdown, /onKeyDown/);
    assert.match(fuente(WEB, "components/torneos/TorneoModal.tsx"), /aria-label="Cerrar"/);
    assert.match(fuente(WEB, "components/ui/FeedbackModal.tsx"), /aria-label="Cerrar"/);
    assert.match(fuente(WEB, "app/layout.tsx"), /theme="dark"/);
  });
});

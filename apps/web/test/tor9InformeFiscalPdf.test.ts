import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("TOR-9 PDF informe preliminar — fiscal actuante", () => {
  it("helper nombreFiscalInformePdf exportado en generador PDF", () => {
    const util = readFileSync(
      path.join(RAIZ, "utils/informePreliminarPdf.ts"),
      "utf8",
    );
    assert.match(util, /export function nombreFiscalInformePdf/);
    assert.match(
      util,
      /\[fiscales\.apellido, fiscales\.nombre\]\.filter\(Boolean\)\.join\(", "\)/,
    );
  });

  it("ficha jugador no hardcodea Fiscal actuante", () => {
    const pagina = readFileSync(
      path.join(
        RAIZ,
        "app/dashboard/fiscal/torneos/[id]/jugadores/[jugadorId]/page.tsx",
      ),
      "utf8",
    );
    assert.match(pagina, /nombreFiscalInformePdf/);
    assert.doesNotMatch(pagina, /fiscalNombre:\s*"Fiscal actuante"/);
  });

  it("emision indica espera prolongada al usuario", () => {
    const pagina = readFileSync(
      path.join(
        RAIZ,
        "app/dashboard/fiscal/torneos/[id]/jugadores/[jugadorId]/page.tsx",
      ),
      "utf8",
    );
    assert.match(pagina, /Registrando informe y preparando PDF/);
  });
});

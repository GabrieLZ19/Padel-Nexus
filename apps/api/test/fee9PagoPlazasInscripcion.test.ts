import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildInscripcionExternalReference,
  parseMercadoPagoExternalReference,
} from "../src/config/mercadopago.ts";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("FEE-9 pago por plaza inscripción", () => {
  it("external_reference codifica plazas", () => {
    assert.equal(
      buildInscripcionExternalReference("abc", [1]),
      "inscripcion:abc:plaza-1",
    );
    assert.equal(
      buildInscripcionExternalReference("abc", [1, 2]),
      "inscripcion:abc:plazas-1-2",
    );
    const parsed = parseMercadoPagoExternalReference(
      "inscripcion:abc:plazas-1-2",
    );
    assert.equal(parsed.canal, "inscripcion");
    assert.equal(parsed.id, "abc");
    assert.deepEqual(parsed.plazas, [1, 2]);
  });

  it("servicio inscripcionPlazaPago existe", () => {
    const src = readFileSync(
      `${root}src/services/inscripcionPlazaPago.service.ts`,
      "utf8",
    );
    assert.match(src, /inscripcion_plazas_pago/);
    assert.match(src, /sincronizarEstadoInscripcion/);
  });

  it("crearPreferenciaPago acepta alcance", () => {
    const src = readFileSync(`${root}src/services/inscripcion.service.ts`, "utf8");
    assert.match(src, /alcance\?: "mi_plaza" \| "todas_pendientes"/);
    assert.match(src, /buildInscripcionExternalReference/);
  });

  it("ruta plazas-pago registrada", () => {
    const routes = readFileSync(`${root}src/routes/inscripcion.routes.ts`, "utf8");
    assert.match(routes, /plazas-pago/);
  });
});
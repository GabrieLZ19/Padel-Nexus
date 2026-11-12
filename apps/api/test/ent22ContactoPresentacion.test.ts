import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  emailContactoVisible,
  lugarResidenciaVisible,
} from "../src/utils/contactoPresentacion.ts";
import { provinciaCanonicaArgentina } from "../src/utils/provinciaRanking.ts";

const API_RAIZ = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const WEB_RAIZ = path.resolve(API_RAIZ, "../web");

describe("ENT-22 contactos CRM — email interno y provincia", () => {
  it("trata preinscripto@padelnexus.local como sin email", () => {
    assert.equal(
      emailContactoVisible("preinscripto+90000002@padelnexus.local"),
      null,
    );
    assert.equal(emailContactoVisible("qa@example.com"), null);
    assert.equal(emailContactoVisible("jugador@gmail.com"), "jugador@gmail.com");
  });

  it("canonicaliza residencia en mayúsculas", () => {
    assert.equal(provinciaCanonicaArgentina("NEUQUEN"), "Neuquén");
    assert.equal(provinciaCanonicaArgentina("BUENOS AIRES"), "Buenos Aires");
    assert.equal(lugarResidenciaVisible("NEUQUEN"), "Neuquén");
  });

  it("campañas excluyen correos técnicos del canal email", () => {
    const canales = readFileSync(
      path.join(API_RAIZ, "src/services/comunicaciones-canales.service.ts"),
      "utf8",
    );
    assert.match(canales, /emailContactoVisible/);
    const crm = readFileSync(
      path.join(API_RAIZ, "src/services/crm-contactos.service.ts"),
      "utf8",
    );
    assert.match(crm, /presentarPerfilContacto/);
    const panel = readFileSync(
      path.join(WEB_RAIZ, "components/crm/JugadoresContactosPanel.tsx"),
      "utf8",
    );
    assert.match(panel, /Sin email/);
  });
});

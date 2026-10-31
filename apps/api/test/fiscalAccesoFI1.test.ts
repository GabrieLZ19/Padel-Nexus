import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  esRolFiscal,
  esRolAccesoCrm,
  ROLES_FISCAL,
  ROLES_ACCESO_CRM,
} from "../src/constants/roles";

function leerArchivo(subpath: string): string {
  const p1 = path.resolve(subpath);
  if (fs.existsSync(p1)) return fs.readFileSync(p1, "utf8");
  const p2 = path.resolve("apps/api", subpath);
  if (fs.existsSync(p2)) return fs.readFileSync(p2, "utf8");
  const p3 = path.resolve(subpath.replace(/^apps\/api\//, ""));
  if (fs.existsSync(p3)) return fs.readFileSync(p3, "utf8");
  throw new Error(`No se encontró el archivo: ${subpath}`);
}

describe("FI1 - Roles y acceso para Fiscales (Backend)", () => {
  it("UsuariosController define 'fiscal' en ROLES_CREABLES", () => {
    const code = leerArchivo("apps/api/src/controllers/usuarios.controller.ts");
    assert.ok(
      code.includes('"fiscal"'),
      "ROLES_CREABLES debe contener el rol 'fiscal'",
    );
    assert.ok(
      code.includes("if (rol === \"fiscal\")"),
      "Debe contemplar vinculacion automatica con ficha de fiscales cuando rol es fiscal",
    );
  });

  it("FiscalesService asigna rol 'fiscal' tanto en Supabase Auth como en perfiles al habilitar acceso", () => {
    const code = leerArchivo("apps/api/src/services/fiscal.service.ts");
    assert.ok(
      code.includes('app_metadata: { rol: "fiscal" }'),
      "Al crear usuario en Auth debe asignar app_metadata rol 'fiscal'",
    );
    assert.ok(
      code.includes('rol: "fiscal"'),
      "Al guardar en perfiles debe persistir rol 'fiscal'",
    );
  });

  it("esRolFiscal identifica correctamente el rol 'fiscal'", () => {
    assert.strictEqual(esRolFiscal("fiscal"), true);
    assert.strictEqual(esRolFiscal("usuario"), false);
    assert.strictEqual(esRolFiscal("admin"), false);
    assert.strictEqual(esRolFiscal(null), false);
    assert.strictEqual(esRolFiscal(undefined), false);
  });

  it("el rol 'fiscal' tiene acceso al CRM (ROLES_ACCESO_CRM)", () => {
    assert.ok(
      ROLES_ACCESO_CRM.includes("fiscal"),
      "El rol 'fiscal' debe estar incluido en ROLES_ACCESO_CRM.",
    );
    assert.strictEqual(esRolAccesoCrm("fiscal"), true);
  });

  it("ROLES_FISCAL contiene exactamente 'fiscal'", () => {
    assert.deepStrictEqual(ROLES_FISCAL, ["fiscal"]);
  });
});

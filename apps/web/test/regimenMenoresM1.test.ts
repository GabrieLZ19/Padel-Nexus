import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function leerArchivo(subpath: string): string {
  return fs.readFileSync(path.resolve("apps/web", subpath), "utf8");
}

describe("M1 - Régimen de menores y fiscales (Frontend)", () => {
  it("Ajustes de perfil muestra fecha de nacimiento de solo lectura como dato oficial", () => {
    const code = leerArchivo("app/(public)/mi-perfil/ajustes/page.tsx");
    assert.ok(
      code.includes("Fecha de Nacimiento (Ficha Oficial)"),
      "Debe indicar Ficha Oficial en la etiqueta de fecha de nacimiento",
    );
    assert.ok(
      code.includes('title="La fecha de nacimiento la modifica la federación"'),
      "El input de fecha debe ser de solo lectura y advertir que lo modifica la federación",
    );
    assert.ok(
      code.includes("Dato oficial. No se edita desde acá."),
      "Debe incluir aclaración de que es dato oficial no editable",
    );
  });

  it("Ajustes de perfil permite solicitar cambio de fecha_nacimiento", () => {
    const code = leerArchivo("app/(public)/mi-perfil/ajustes/page.tsx");
    assert.ok(
      code.includes('value: "fecha_nacimiento"'),
      "El modal de solicitud de cambio debe incluir la opción fecha_nacimiento",
    );
    assert.ok(
      code.includes('campo !== "fecha_nacimiento"'),
      "enviarPedido debe permitir enviar solicitudes de cambio de fecha_nacimiento",
    );
  });

  it("Página de consentimiento parental formatea el markdown y renderiza encabezados y negritas", () => {
    const code = leerArchivo(
      "app/(public)/consentimiento-parental/[token]/page.tsx",
    );
    assert.ok(
      code.includes("renderMarkdownLite"),
      "Debe incluir función de renderizado de markdown",
    );
    assert.ok(
      code.includes("dangerouslySetInnerHTML"),
      "Debe inyectar el HTML parseado para que no se vean marcas de markdown sin formatear",
    );
    assert.ok(
      !code.includes("whitespace-pre-wrap"),
      "No debe usar pre-wrap crudo que muestra marcas sin formatear",
    );
  });

  it("Página de consentimiento parental incluye checkbox de comunicaciones comerciales desactivado por defecto", () => {
    const code = leerArchivo(
      "app/(public)/consentimiento-parental/[token]/page.tsx",
    );
    assert.ok(
      code.includes("const [comercial, setComercial] = useState(false);"),
      "El consentimiento comercial debe estar desactivado por defecto (false)",
    );
    assert.ok(
      code.includes("autoriza_comunicaciones_comerciales: comercial"),
      "Debe enviar autoriza_comunicaciones_comerciales al backend",
    );
    assert.ok(
      code.includes("comunicaciones comerciales"),
      "Debe mostrar la etiqueta de comunicaciones comerciales en el formulario",
    );
  });
});

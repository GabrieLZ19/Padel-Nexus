import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { esEmailPlaceholderPlanilla } from "../src/utils/inscripcionPlanilla.ts";
import {
  construirPatchPerfilPadronFap,
  contieneCaracterReemplazo,
  decodificarHtmlPadronFap,
  parsePadronFapHtml,
  type DatosLimpiosPadronFap,
  type PerfilExistentePadron,
} from "../src/utils/padronFapHtml.ts";

const raizApi = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function leer(rel: string): string {
  return readFileSync(path.join(raizApi, rel), "utf8");
}

function armarHtmlPadron(params: {
  meta?: string;
  filas: Array<{
    n: number;
    nombre: string;
    apellido: string;
    nivel: string;
    dni: string;
    nacimiento: string;
    licencia: string;
    provincia: string;
    ciudad: string;
  }>;
}): string {
  const rows = params.filas
    .map(
      (f) => `
      <tr>
        <td align=center>${f.n}</td>
        <td>${f.nombre}</td>
        <td>${f.apellido}</td>
        <td>${f.nivel}</td>
        <td>${f.dni}</td>
        <td>${f.nacimiento}</td>
        <td>${f.licencia}</td>
        <td>ACTIVA</td>
        <td>2026</td>
        <td>${f.provincia}</td>
        <td>${f.ciudad}</td>
        <td>Club Alta Barda</td>
        <td>Neuquen</td>
      </tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>${params.meta ?? ""}</head>
<body>
<table>
${rows}
</table>
</body>
</html>`;
}

describe("ENT-42 — Importación padrón FAP en Latin-1 y saneamiento seguro", () => {
  it("decodifica correctamente HTML en Latin-1 (ISO-8859-1) preservando ñ y tildes", () => {
    const html = armarHtmlPadron({
      meta: '<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">',
      filas: [
        {
          n: 1,
          nombre: "José María",
          apellido: "Muñoz",
          nivel: "Caballeros Quinta",
          dni: "30123456",
          nacimiento: "1990-05-12",
          licencia: "FAP 45123",
          provincia: "Neuquén",
          ciudad: "Neuquén",
        },
        {
          n: 2,
          nombre: "Sofía",
          apellido: "Agüero",
          nivel: "Damas Cuarta",
          dni: "35987654",
          nacimiento: "1994-11-02",
          licencia: "FAP 45124",
          provincia: "Córdoba",
          ciudad: "Río Cuarto",
        },
      ],
    });

    const latin1Buffer = Buffer.from(html, "latin1");
    const filas = parsePadronFapHtml(latin1Buffer);

    assert.equal(filas.length, 2);
    assert.equal(filas[0].nombre, "José María");
    assert.equal(filas[0].apellido, "Muñoz");
    assert.equal(filas[0].provincia, "Neuquén");
    assert.equal(filas[0].ciudad, "Neuquén");
    assert.equal(contieneCaracterReemplazo(filas[0].apellido), false);
    assert.equal(filas[1].nombre, "Sofía");
    assert.equal(filas[1].apellido, "Agüero");
    assert.equal(filas[1].provincia, "Córdoba");
    assert.equal(filas[1].ciudad, "Río Cuarto");
  });

  it("detecta bytes Latin-1 incluso sin meta charset declarado", () => {
    const html = armarHtmlPadron({
      filas: [
        {
          n: 1,
          nombre: "Martín",
          apellido: "Muñoz",
          nivel: "Caballeros Sexta",
          dni: "31222333",
          nacimiento: "1991-03-20",
          licencia: "FAP 77889",
          provincia: "Neuquén",
          ciudad: "San Martín de los Andes",
        },
      ],
    });

    const bufferSinMeta = Buffer.from(html, "latin1");
    const decoded = decodificarHtmlPadronFap(bufferSinMeta);
    assert.match(decoded, /Muñoz/);
    assert.match(decoded, /Neuquén/);
    assert.equal(contieneCaracterReemplazo(decoded), false);

    const filas = parsePadronFapHtml(bufferSinMeta);
    assert.equal(filas[0].apellido, "Muñoz");
    assert.equal(filas[0].ciudad, "San Martín de los Andes");
    assert.equal(filas[0].provincia, "Neuquén");
  });

  it("soporta archivos UTF-8 (con y sin BOM) y entidades HTML básicas", () => {
    const html = armarHtmlPadron({
      meta: '<meta charset="utf-8">',
      filas: [
        {
          n: 1,
          nombre: "Luc&iacute;a",
          apellido: "Pe&ntilde;a",
          nivel: "Damas Sexta",
          dni: "38111222",
          nacimiento: "1996-01-15",
          licencia: "FAP 99001",
          provincia: "Neuqu&#233;n",
          ciudad: "Plottier",
        },
      ],
    });

    const utf8SinBom = Buffer.from(html, "utf8");
    const utf8ConBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8SinBom]);

    for (const buf of [utf8SinBom, utf8ConBom]) {
      const filas = parsePadronFapHtml(buf);
      assert.equal(filas.length, 1);
      assert.equal(filas[0].nombre, "Lucía");
      assert.equal(filas[0].apellido, "Peña");
      assert.equal(filas[0].provincia, "Neuquén");
    }
  });

  describe("saneamiento seguro de perfiles existentes", () => {
    const datosLimpios: DatosLimpiosPadronFap = {
      nombre: "José",
      apellido: "Muñoz",
      categoria_padel: "5ª",
      sexo: "masculino",
      fecha_nacimiento: "1990-05-12",
      lugar_residencia: "Neuquén, Neuquén",
    };

    const baseProvisoria: PerfilExistentePadron = {
      id: "perfil-1",
      nombre: "Jos\uFFFD",
      apellido: "Mu\uFFFDoz",
      email: "preinscripto+30123456@padelnexus.local",
      telefono: null,
      categoria_padel: "5ª",
      lugar_residencia: "Neuqu\uFFFDn, Neuqu\uFFFDn",
      fecha_nacimiento: "1990-05-12",
      sexo: "masculino",
      pendiente_activacion: true,
    };

    it("actualiza nombre, apellido y lugar_residencia con U+FFFD en fichas con pendiente_activacion=true", () => {
      const patch = construirPatchPerfilPadronFap(baseProvisoria, datosLimpios, {
        sanearAcentos: true,
        esEmailPlaceholder: esEmailPlaceholderPlanilla,
      });

      assert.equal(patch.nombre, "José");
      assert.equal(patch.apellido, "Muñoz");
      assert.equal(patch.lugar_residencia, "Neuquén, Neuquén");
      assert.equal(patch.pendiente_activacion, true);
    });

    it("restaura tildes faltantes en fichas provisorias sin ediciones manuales previas", () => {
      const sinTildes: PerfilExistentePadron = {
        ...baseProvisoria,
        nombre: "Jose",
        apellido: "Munoz",
        lugar_residencia: "Neuquen, Neuquen",
      };

      const patch = construirPatchPerfilPadronFap(sinTildes, datosLimpios, {
        sanearAcentos: true,
        esEmailPlaceholder: esEmailPlaceholderPlanilla,
      });

      assert.equal(patch.nombre, "José");
      assert.equal(patch.apellido, "Muñoz");
      assert.equal(patch.lugar_residencia, "Neuquén, Neuquén");
    });

    it("NUNCA sobreescribe fichas activadas (pendiente_activacion=false) aunque tengan U+FFFD", () => {
      const activada: PerfilExistentePadron = {
        ...baseProvisoria,
        email: "jose.munoz@gmail.com",
        telefono: "+5492994001122",
        pendiente_activacion: false,
      };

      const patch = construirPatchPerfilPadronFap(activada, datosLimpios, {
        sanearAcentos: true,
        esEmailPlaceholder: esEmailPlaceholderPlanilla,
      });

      assert.deepEqual(patch, {});
    });

    it("NO sobreescribe campos sin U+FFFD en fichas provisorias editadas manualmente", () => {
      const editadaPorAdmin: PerfilExistentePadron = {
        ...baseProvisoria,
        nombre: "Jose",
        apellido: "Munoz",
        lugar_residencia: "Cipolletti, Rio Negro",
        email: "jose.munoz@gmail.com",
        telefono: null,
        pendiente_activacion: true,
      };

      const patch = construirPatchPerfilPadronFap(editadaPorAdmin, datosLimpios, {
        sanearAcentos: true,
        esEmailPlaceholder: esEmailPlaceholderPlanilla,
      });

      assert.deepEqual(patch, {});
    });

    it("NO sobreescribe texto modificado manualmente a otro valor distinto aunque siga con email placeholder", () => {
      const textoEditado: PerfilExistentePadron = {
        ...baseProvisoria,
        nombre: "Jose Luis",
        apellido: "Muñoz",
        lugar_residencia: "Cipolletti, Río Negro",
        pendiente_activacion: true,
      };

      const patch = construirPatchPerfilPadronFap(textoEditado, datosLimpios, {
        sanearAcentos: true,
        esEmailPlaceholder: esEmailPlaceholderPlanilla,
      });

      assert.deepEqual(patch, {});
    });

    it("corrige solo el campo con U+FFFD si la ficha provisoria ya tiene contacto cargado", () => {
      const provisoriaConMailYNombreRoto: PerfilExistentePadron = {
        ...baseProvisoria,
        nombre: "Jose Luis",
        apellido: "Mu\uFFFDoz",
        lugar_residencia: "Cipolletti, Río Negro",
        email: "jose.munoz@gmail.com",
        pendiente_activacion: true,
      };

      const patch = construirPatchPerfilPadronFap(
        provisoriaConMailYNombreRoto,
        datosLimpios,
        {
          sanearAcentos: true,
          esEmailPlaceholder: esEmailPlaceholderPlanilla,
        },
      );

      assert.deepEqual(patch, { apellido: "Muñoz" });
    });

    it("sin sanearAcentos mantiene comportamiento no destructivo estándar", () => {
      const patch = construirPatchPerfilPadronFap(baseProvisoria, datosLimpios, {
        sanearAcentos: false,
        esEmailPlaceholder: esEmailPlaceholderPlanilla,
      });

      assert.deepEqual(patch, {});
    });
  });

  it("script importPadronFap lee el archivo como Buffer y usa decodificarHtmlPadronFap", () => {
    const src = leer("src/scripts/importPadronFap.ts");

    assert.match(src, /decodificarHtmlPadronFap/);
    assert.match(src, /construirPatchPerfilPadronFap/);
    assert.match(src, /--sanear-acentos/);
    assert.doesNotMatch(src, /readFileSync\(filePath,\s*["']utf8["']\)/);
  });
});

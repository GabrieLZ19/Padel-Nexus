import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fuente(relativo: string): string {
  return readFileSync(path.join(RAIZ, relativo), "utf8");
}

describe("Móvil - Limpieza de textos de ayuda y visibilidad de contadores con etiqueta", () => {
  it("Jugadores en móvil muestra contadores con etiquetas completas y contenedor scrolleable", () => {
    const pagina = fuente("app/dashboard/jugadores/page.tsx");

    // Verifica que el contenedor de contadores permita scroll horizontal en mobile
    assert.match(pagina, /overflow-x-auto/);

    // Verifica que cada botón de estadística no trunque su etiqueta y sea whitespace-nowrap
    assert.match(pagina, /whitespace-nowrap/);
    assert.match(pagina, /shrink-0/);

    // Verifica que los botones de vista (Jugadores / Configuración) se separen limpiamente en mobile
    assert.match(pagina, /self-start xl:self-auto/);
  });

  it("Jugadores oculta el texto de ayuda del encabezado detrás de un ícono de información con tooltip", () => {
    const pagina = fuente("app/dashboard/jugadores/page.tsx");

    // No debe haber un <p> directo en el header compitiendo con el título
    assert.equal(
      pagina.includes('<p className="truncate text-xs text-gray-400">'),
      false,
    );

    // Debe existir un ícono Info con tooltip
    assert.match(pagina, /<Info className="size-4"/);
    assert.match(
      pagina,
      /El vencimiento individual se edita en la fecha de cada jugador\./,
    );
  });

  it("AfiliacionModal oculta el texto explicativo y usa ícono Info con tooltip en el título", () => {
    const modal = fuente("components/perfil/AfiliacionModal.tsx");

    // No debe tener el texto explicativo expuesto directamente como párrafo
    assert.equal(
      modal.includes(
        '<p className="text-sm text-gray-400 mt-1">\n              No hace falta afiliarte a un club para jugar.',
      ),
      false,
    );

    // Debe contener el ícono Info con tooltip
    assert.match(modal, /<Info className="size-4"/);
    assert.match(
      modal,
      /No hace falta afiliarte a un club para jugar\. El pase cambia la asociación que te representa\./,
    );
  });

  it("Mi perfil en versión pública oculta la frase larga y usa ícono Info con tooltip", () => {
    const perfil = fuente("app/(public)/mi-perfil/page.tsx");

    assert.equal(
      perfil.includes("Sin asociación activa. No hace falta afiliarte a un club para jugar."),
      false,
    );
    assert.match(perfil, /Sin asociación activa/);
    assert.match(perfil, /<Info className="size-3\.5"/);
  });
});

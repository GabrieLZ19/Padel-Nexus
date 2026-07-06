import { test, expect, Page } from "@playwright/test";

// Helper para interactuar con CustomDropdown
async function selectCustomDropdown(
  page: Page,
  labelText: string,
  optionText: string,
) {
  const labelEl = page.locator("label", { hasText: labelText }).first();
  const parentDiv = labelEl.locator("..");
  const dropdownTrigger = parentDiv.locator(".relative > div").first();
  await dropdownTrigger.click();
  await page.locator(`div.cursor-pointer:has-text("${optionText}")`).first().click();
}

test.describe.serial("Flujo del Jugador (Ficha Federativa)", () => {
  const uid = Date.now();
  const playerEmail = `federado${uid}@example.com`;
  const playerPassword = "TestPass123!";
  const letters = "abcdefghij";
  const uidAlpha = uid.toString().split("").map(digit => letters[parseInt(digit)]).join("");

  test.beforeAll(async ({ browser }) => {
    // Registrar el usuario de prueba antes de correr los tests
    const page = await browser.newPage();
    await page.goto("/signup");
    
    // Completar campos separados de Nombre y Apellido
    await page.fill('input[placeholder="Nombre"]', "Jugador");
    await page.fill('input[placeholder="Apellido"]', uidAlpha);
    
    await page.fill('input[placeholder="Ej: 40.234.567"]', "11.111.111");
    await page.fill('input[placeholder="Ej: +54 9 351..."]', "+54 9 351 1234567");

    // Provincia de residencia CustomDropdown
    const residenciaDropdown = page.locator("label", { hasText: "Provincia de residencia" }).locator("..").locator(".relative");
    await residenciaDropdown.click();
    await page.locator("div", { hasText: /^Buenos Aires$/ }).first().click();

    const categoriaDropdown = page.locator("label", { hasText: "Categoría Padel" }).locator("..").locator(".relative");
    await categoriaDropdown.click();
    await page.locator("div", { hasText: /^6ª Categoría$/ }).first().click();

    const ladoDropdown = page.locator("label", { hasText: "Lado Preferido" }).locator("..").locator(".relative");
    await ladoDropdown.click();
    await page.locator("div", { hasText: /^Ambos$/ }).first().click();

    await page.fill('input[placeholder="tu@email.com"]', playerEmail);
    
    // Contraseñas
    const passInput = page.locator('label', { hasText: /^Contraseña/ }).locator('..').locator('input');
    await passInput.fill(playerPassword);
    
    const confirmPassInput = page.locator('label', { hasText: /^Confirmar Contraseña/ }).locator('..').locator('input');
    await confirmPassInput.fill(playerPassword);
    await page.click('button:has-text("Crear cuenta de jugador")');
    await expect(page.locator("text=¡Registro completado!")).toBeVisible({ timeout: 15000 });
    await page.close();
  });

  // Helper local para iniciar sesión
  async function loginAsPlayer(page: Page) {
    await page.goto("/login");
    await page.fill('input[placeholder="ejemplo@padelnexus.com"]', playerEmail);
    await page.fill('input[placeholder="••••••••"]', playerPassword);
    await page.click('button:has-text("Iniciar Sesión")');
    
    // Esperamos a que salga de la página de login para confirmar que entró
    await expect(page).not.toHaveURL(/.*login.*/, { timeout: 15000 });
  }

  test("Actualizar configuración del perfil y rellenar datos faltantes", async ({ page }) => {
    await loginAsPlayer(page);

    // Navegar a Ajustes
    await page.goto("/mi-perfil/ajustes");
    await expect(page.locator("h1", { hasText: "Configuración de Perfil" })).toBeVisible({ timeout: 10000 });

    // Modificar DNI y Teléfono (usamos uid para asegurar DNI único)
    const dniUnico = uid.toString().slice(-8);
    const dniInput = page.locator('label:has-text("DNI")').locator('..').locator('input');
    await dniInput.clear();
    await dniInput.fill(dniUnico);

    const telInput = page.locator('input[type="tel"]');
    await telInput.clear();
    await telInput.fill("+5491100001111");

    // Guardar Ajustes
    await page.click('button:has-text("Guardar Ajustes")');

    // Verificar el feedback
    await expect(page.locator("text=Ficha Actualizada")).toBeVisible({ timeout: 10000 });
  });

  test("Solicitar el alta de licencia federativa", async ({ page }) => {
    await loginAsPlayer(page);

    // Ir al panel principal del jugador
    await page.goto("/mi-perfil");
    await expect(page.locator("text=Licencia Federativa")).toBeVisible({ timeout: 10000 });

    // Click en Solicitar Alta
    await page.click('button:has-text("Solicitar Alta")');

    // Se abre el modal "Solicitar Licencia"
    await expect(page.locator("h2", { hasText: "Solicitar Licencia" })).toBeVisible({ timeout: 5000 });

    // Llenar el DNI (sin puntos)
    const dniInput = page.locator('input[placeholder="Ej: 35123456"]');
    await dniInput.clear();
    await dniInput.fill("22222222");

    // Seleccionar Provincia y Club
    await selectCustomDropdown(page, "Provincia", "Buenos Aires");
    
    // Esperar a que el dropdown de clubes se habilite
    await page.waitForTimeout(1000); 
    
    // Seleccionar el primer club de prueba que se haya creado en Buenos Aires (admin.spec.ts lo crea)
    // Buscamos el dropdown de Club o Centro Deportivo
    const clubLabel = page.locator("label", { hasText: "Club o Centro Deportivo" }).first();
    const clubDiv = clubLabel.locator("..");
    const clubTrigger = clubDiv.locator(".relative > div").first();
    await clubTrigger.click();

    // Seleccionamos la primera opción disponible que no sea "No hay opciones disponibles"
    const firstOption = page.locator('div.cursor-pointer').filter({ hasNotText: "No hay opciones disponibles" }).first();
    
    // Si no hay clubes, el test fallará aquí, lo cual es correcto porque el Admin debería haber creado uno
    await firstOption.click();

    // Click en "Enviar Solicitud"
    await page.click('button:has-text("Enviar Solicitud")');

    // Verificar el feedback de éxito
    await expect(page.locator("text=¡Solicitud enviada!")).toBeVisible({ timeout: 10000 });
  });
});

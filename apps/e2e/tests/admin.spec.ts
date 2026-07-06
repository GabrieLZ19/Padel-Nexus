import { test, expect, Page } from "@playwright/test";

// ════════════════════════════════════════════════════════════════════════════
// HELPER — Login como admin y navegar al dashboard
// ════════════════════════════════════════════════════════════════════════════
async function loginAsAdmin(page: Page) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@padelnexus.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Password123!";

  await page.goto("/login");
  await expect(page.locator("h2", { hasText: "Bienvenido" })).toBeVisible({
    timeout: 15000,
  });

  await page.fill('input[placeholder="ejemplo@padelnexus.com"]', adminEmail);
  await page.fill('input[placeholder="••••••••"]', adminPassword);
  await page.click('button:has-text("Iniciar Sesión")');
  await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
}

// Helper para interactuar con CustomDropdown (no es un <select> nativo)
async function selectCustomDropdown(
  page: Page,
  labelText: string,
  optionText: string,
) {
  // Buscar el label, luego encontrar el contenedor padre que tiene el dropdown
  const labelEl = page.locator("label", { hasText: labelText }).first();
  // El dropdown está en un sibling del label (dentro del mismo parent div)
  const parentDiv = labelEl.locator("..");
  const dropdownTrigger = parentDiv.locator(".relative > div").first();
  await dropdownTrigger.click();

  // Esperar a que la lista de opciones aparezca y seleccionar
  await page.locator(`div.cursor-pointer:has-text("${optionText}")`).first().click();
}

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 2 — GESTIÓN DE CLUBES
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("2. Gestión de Clubes (Admin)", () => {
  const clubName = `Club E2E Test ${Date.now()}`;

  test("Crear un club desde el dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/clubes");

    // Esperar a que cargue la página de clubes
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    // Click en "Agregar club" (texto real del botón)
    await page.click('button:has-text("Agregar club")');

    // Verificar que se abrió el modal: titulo "Nuevo Club"
    await expect(page.locator("h2", { hasText: "Nuevo Club" })).toBeVisible({
      timeout: 5000,
    });

    // Completar el formulario del modal (placeholders reales de ClubModal)
    await page.fill('input[placeholder="Ej: Padel Center"]', clubName);
    await page.fill('input[placeholder="Ciudad / Barrio"]', "Capital");

    await selectCustomDropdown(page, "Provincia", "Buenos Aires");

    // Cantidad de canchas (input numérico)
    const canchasInput = page.locator('input[type="number"]');
    await canchasInput.clear();
    await canchasInput.fill("4");

    // Click en "Guardar Club" (botón real)
    await page.click('button:has-text("Guardar Club")');

    // Verificar que el modal se cerró y el club aparece en la grilla
    await expect(page.locator(`text=${clubName}`).first()).toBeVisible({
      timeout: 10000,
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 3 — GESTIÓN DE TORNEOS
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("3. Gestión de Torneos (Admin)", () => {
  const torneoName = `Torneo E2E Test ${Date.now()}`;

  test("Crear un torneo FAP desde el dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/torneos");

    // Esperar a que cargue la página
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    // Click en "Nuevo torneo" (texto real con Plus icon)
    await page.click('button:has-text("Nuevo torneo")');

    // Verificar que se abrió el modal: titulo "Configurar Torneo"
    await expect(
      page.locator("h2", { hasText: "Configurar Torneo" }),
    ).toBeVisible({ timeout: 5000 });

    // Nombre del torneo (placeholder real)
    await page.fill('input[placeholder="Ej: Master Series BA"]', torneoName);

    // Fecha de inicio (input type=date)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toISOString().split("T")[0];
    await page.fill('input[type="date"]', dateStr);

    // Precio de inscripción (placeholder real)
    await page.fill('input[placeholder="Ej: 24000"]', "15000");

    // Premios (placeholders reales)
    await page.fill('input[placeholder="Ej: $180.000 + Trofeo"]', "$100.000");

    // Click en "Publicar Torneo" (texto real del botón para crear)
    await page.click('button:has-text("Publicar Torneo")');

    // Verificar que el torneo aparece en la tabla
    await expect(page.locator(`text=${torneoName}`).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("Acceder al detalle del torneo creado", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/torneos");

    // Esperar a que la tabla cargue
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    // Click en el botón "Centro de Control" del primer torneo visible
    const controlButton = page.locator('button:has-text("Centro de Control")').first();
    if (await controlButton.isVisible()) {
      await controlButton.click();
    } else {
      // Alternativamente, click en el nombre del torneo en la fila
      await page.locator("table tbody tr").first().click();
    }

    // Debería navegar al detalle /dashboard/torneos/[id]
    await expect(page).toHaveURL(/.*dashboard\/torneos\/.*/, { timeout: 10000 });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 4 — INSCRIPCIONES Y PAGOS
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("4. Gestión de Inscripciones (Admin)", () => {
  test("Acceder a la página de inscripciones", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/inscripciones");

    // Verificar que la página de inscripciones carga correctamente
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    // Verificar que las tabs existen
    await expect(page.locator("text=Todas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pendientes", exact: true })).toBeVisible();
    await expect(page.locator("text=Confirmadas")).toBeVisible();
  });

  test("Filtrar inscripciones por tab de estado", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/inscripciones");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    // Click en la tab "Pendientes"
    await page.locator("text=Pendientes").first().click();
    // La tabla debería refrescarse (no verificamos cantidad porque la BD está limpia)

    // Click en la tab "Confirmadas"
    await page.locator("text=Confirmadas").first().click();

    // Click en la tab "Todas" de nuevo
    await page.locator("text=Todas").first().click();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 5 — NAVEGACIÓN GENERAL DEL DASHBOARD
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("5. Navegación del Dashboard", () => {
  test("Dashboard principal carga correctamente", async ({ page }) => {
    await loginAsAdmin(page);

    // El dashboard principal debería tener las tarjetas de KPIs
    // Verificar que al menos hay contenido visible
    await expect(page.locator("body")).toBeVisible();

    // Verificar que el layout del dashboard está presente (sidebar con links)
    await expect(page.locator("nav")).toBeVisible({ timeout: 10000 });
  });

  test("Navegar a Jugadores", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/jugadores");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  });

  test("Navegar a Clubes", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/clubes");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  });

  test("Navegar a Torneos", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/torneos");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  });

  test("Navegar a Inscripciones", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/inscripciones");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  });
});

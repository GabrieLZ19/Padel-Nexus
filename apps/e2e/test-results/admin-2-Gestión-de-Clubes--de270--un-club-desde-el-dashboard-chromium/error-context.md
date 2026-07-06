# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> 2. Gestión de Clubes (Admin) >> Crear un club desde el dashboard
- Location: tests\admin.spec.ts:45:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Club E2E Test 1782488413880').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=Club E2E Test 1782488413880').first()

```

```yaml
- complementary:
  - img "Padel Nexus"
  - text: padelnexus ADMIN CRM
  - navigation:
    - link "Dashboard":
      - /url: /dashboard
    - link "Torneos":
      - /url: /dashboard/torneos
    - link "Inscripciones":
      - /url: /dashboard/inscripciones
    - link "Clubes":
      - /url: /dashboard/clubes
    - link "Jugadores":
      - /url: /dashboard/jugadores
    - link "Marketplace":
      - /url: /dashboard/marketplace
    - link "Moderación":
      - /url: /dashboard/moderacion
    - link "Estadísticas":
      - /url: /dashboard/estadisticas
    - link "Chat interno":
      - /url: /dashboard/chat
  - text: CENTRAL, Administrador admin@padelnexus.com
  - button "Cerrar sesión"
- main:
  - heading "Clubes adheridos" [level=1]
  - paragraph: 0 clubes en la red · 0 pendientes de aprobación
  - button "Agregar club"
  - heading "No hay clubes registrados" [level=3]
  - heading "Nuevo Club" [level=2]
  - paragraph: Completá los datos del complejo deportivo
  - button
  - text: Nombre del Complejo
  - 'textbox "Ej: Padel Center"': Club E2E Test 1782488413880
  - text: Provincia Buenos Aires Localidad
  - textbox "Ciudad / Barrio": Capital
  - text: Cantidad de Canchas
  - spinbutton: "4"
  - text: Estado Activo
  - button "Guardar Club"
  - button
  - heading "Acceso denegado" [level=3]
  - paragraph: "No pudimos guardar el club. Detalle: Requiere uno de estos roles: superadmin, admin_federacion, admin_provincial"
  - button "Entendido"
- alert
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test";
  2   | 
  3   | // ════════════════════════════════════════════════════════════════════════════
  4   | // HELPER — Login como admin y navegar al dashboard
  5   | // ════════════════════════════════════════════════════════════════════════════
  6   | async function loginAsAdmin(page: Page) {
  7   |   const adminEmail = process.env.ADMIN_EMAIL || "admin@padelnexus.com";
  8   |   const adminPassword = process.env.ADMIN_PASSWORD || "Password123!";
  9   | 
  10  |   await page.goto("/login");
  11  |   await expect(page.locator("h2", { hasText: "Bienvenido" })).toBeVisible({
  12  |     timeout: 15000,
  13  |   });
  14  | 
  15  |   await page.fill('input[placeholder="ejemplo@padelnexus.com"]', adminEmail);
  16  |   await page.fill('input[placeholder="••••••••"]', adminPassword);
  17  |   await page.click('button:has-text("Iniciar Sesión")');
  18  |   await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
  19  | }
  20  | 
  21  | // Helper para interactuar con CustomDropdown (no es un <select> nativo)
  22  | async function selectCustomDropdown(
  23  |   page: Page,
  24  |   labelText: string,
  25  |   optionText: string,
  26  | ) {
  27  |   // Buscar el label, luego encontrar el contenedor padre que tiene el dropdown
  28  |   const labelEl = page.locator("label", { hasText: labelText }).first();
  29  |   // El dropdown está en un sibling del label (dentro del mismo parent div)
  30  |   const parentDiv = labelEl.locator("..");
  31  |   const dropdownTrigger = parentDiv.locator(".relative > div").first();
  32  |   await dropdownTrigger.click();
  33  | 
  34  |   // Esperar a que la lista de opciones aparezca y seleccionar
  35  |   await page.locator(`div.cursor-pointer:has-text("${optionText}")`).first().click();
  36  | }
  37  | 
  38  | // ════════════════════════════════════════════════════════════════════════════
  39  | // FLUJO 2 — GESTIÓN DE CLUBES
  40  | // ════════════════════════════════════════════════════════════════════════════
  41  | 
  42  | test.describe.serial("2. Gestión de Clubes (Admin)", () => {
  43  |   const clubName = `Club E2E Test ${Date.now()}`;
  44  | 
  45  |   test("Crear un club desde el dashboard", async ({ page }) => {
  46  |     await loginAsAdmin(page);
  47  |     await page.goto("/dashboard/clubes");
  48  | 
  49  |     // Esperar a que cargue la página de clubes
  50  |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  51  | 
  52  |     // Click en "Agregar club" (texto real del botón)
  53  |     await page.click('button:has-text("Agregar club")');
  54  | 
  55  |     // Verificar que se abrió el modal: titulo "Nuevo Club"
  56  |     await expect(page.locator("h2", { hasText: "Nuevo Club" })).toBeVisible({
  57  |       timeout: 5000,
  58  |     });
  59  | 
  60  |     // Completar el formulario del modal (placeholders reales de ClubModal)
  61  |     await page.fill('input[placeholder="Ej: Padel Center"]', clubName);
  62  |     await page.fill('input[placeholder="Ciudad / Barrio"]', "Capital");
  63  | 
  64  |     await selectCustomDropdown(page, "Provincia", "Buenos Aires");
  65  | 
  66  |     // Cantidad de canchas (input numérico)
  67  |     const canchasInput = page.locator('input[type="number"]');
  68  |     await canchasInput.clear();
  69  |     await canchasInput.fill("4");
  70  | 
  71  |     // Click en "Guardar Club" (botón real)
  72  |     await page.click('button:has-text("Guardar Club")');
  73  | 
  74  |     // Verificar que el modal se cerró y el club aparece en la grilla
> 75  |     await expect(page.locator(`text=${clubName}`).first()).toBeVisible({
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  76  |       timeout: 10000,
  77  |     });
  78  |   });
  79  | });
  80  | 
  81  | // ════════════════════════════════════════════════════════════════════════════
  82  | // FLUJO 3 — GESTIÓN DE TORNEOS
  83  | // ════════════════════════════════════════════════════════════════════════════
  84  | 
  85  | test.describe.serial("3. Gestión de Torneos (Admin)", () => {
  86  |   const torneoName = `Torneo E2E Test ${Date.now()}`;
  87  | 
  88  |   test("Crear un torneo FAP desde el dashboard", async ({ page }) => {
  89  |     await loginAsAdmin(page);
  90  |     await page.goto("/dashboard/torneos");
  91  | 
  92  |     // Esperar a que cargue la página
  93  |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  94  | 
  95  |     // Click en "Nuevo torneo" (texto real con Plus icon)
  96  |     await page.click('button:has-text("Nuevo torneo")');
  97  | 
  98  |     // Verificar que se abrió el modal: titulo "Configurar Torneo"
  99  |     await expect(
  100 |       page.locator("h2", { hasText: "Configurar Torneo" }),
  101 |     ).toBeVisible({ timeout: 5000 });
  102 | 
  103 |     // Nombre del torneo (placeholder real)
  104 |     await page.fill('input[placeholder="Ej: Master Series BA"]', torneoName);
  105 | 
  106 |     // Fecha de inicio (input type=date)
  107 |     const tomorrow = new Date();
  108 |     tomorrow.setDate(tomorrow.getDate() + 7);
  109 |     const dateStr = tomorrow.toISOString().split("T")[0];
  110 |     await page.fill('input[type="date"]', dateStr);
  111 | 
  112 |     // Precio de inscripción (placeholder real)
  113 |     await page.fill('input[placeholder="Ej: 24000"]', "15000");
  114 | 
  115 |     // Premios (placeholders reales)
  116 |     await page.fill('input[placeholder="Ej: $180.000 + Trofeo"]', "$100.000");
  117 | 
  118 |     // Click en "Publicar Torneo" (texto real del botón para crear)
  119 |     await page.click('button:has-text("Publicar Torneo")');
  120 | 
  121 |     // Verificar que el torneo aparece en la tabla
  122 |     await expect(page.locator(`text=${torneoName}`).first()).toBeVisible({
  123 |       timeout: 10000,
  124 |     });
  125 |   });
  126 | 
  127 |   test("Acceder al detalle del torneo creado", async ({ page }) => {
  128 |     await loginAsAdmin(page);
  129 |     await page.goto("/dashboard/torneos");
  130 | 
  131 |     // Esperar a que la tabla cargue
  132 |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  133 | 
  134 |     // Click en el botón "Centro de Control" del primer torneo visible
  135 |     const controlButton = page.locator('button:has-text("Centro de Control")').first();
  136 |     if (await controlButton.isVisible()) {
  137 |       await controlButton.click();
  138 |     } else {
  139 |       // Alternativamente, click en el nombre del torneo en la fila
  140 |       await page.locator("table tbody tr").first().click();
  141 |     }
  142 | 
  143 |     // Debería navegar al detalle /dashboard/torneos/[id]
  144 |     await expect(page).toHaveURL(/.*dashboard\/torneos\/.*/, { timeout: 10000 });
  145 |   });
  146 | });
  147 | 
  148 | // ════════════════════════════════════════════════════════════════════════════
  149 | // FLUJO 4 — INSCRIPCIONES Y PAGOS
  150 | // ════════════════════════════════════════════════════════════════════════════
  151 | 
  152 | test.describe.serial("4. Gestión de Inscripciones (Admin)", () => {
  153 |   test("Acceder a la página de inscripciones", async ({ page }) => {
  154 |     await loginAsAdmin(page);
  155 |     await page.goto("/dashboard/inscripciones");
  156 | 
  157 |     // Verificar que la página de inscripciones carga correctamente
  158 |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  159 | 
  160 |     // Verificar que las tabs existen
  161 |     await expect(page.locator("text=Todas")).toBeVisible();
  162 |     await expect(page.locator("text=Pendientes")).toBeVisible();
  163 |     await expect(page.locator("text=Confirmadas")).toBeVisible();
  164 |   });
  165 | 
  166 |   test("Filtrar inscripciones por tab de estado", async ({ page }) => {
  167 |     await loginAsAdmin(page);
  168 |     await page.goto("/dashboard/inscripciones");
  169 |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  170 | 
  171 |     // Click en la tab "Pendientes"
  172 |     await page.locator("text=Pendientes").first().click();
  173 |     // La tabla debería refrescarse (no verificamos cantidad porque la BD está limpia)
  174 | 
  175 |     // Click en la tab "Confirmadas"
```
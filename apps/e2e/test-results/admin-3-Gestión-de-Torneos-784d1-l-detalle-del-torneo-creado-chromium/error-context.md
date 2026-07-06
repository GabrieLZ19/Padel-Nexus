# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> 3. Gestión de Torneos (Admin) >> Acceder al detalle del torneo creado
- Location: tests\admin.spec.ts:127:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*dashboard\/torneos\/.*/
Received string:  "http://localhost:3000/dashboard/torneos"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    23 × unexpected value "http://localhost:3000/dashboard/torneos"

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
  - heading "Gestión de torneos" [level=1]
  - paragraph: 1 torneos en total
  - button "Nuevo torneo"
  - button "Todos"
  - button "Activos"
  - button "Borradores"
  - button "Finalizados"
  - textbox "Buscar torneo..."
  - table:
    - rowgroup:
      - row "Torneo Sede / Fecha Inscriptos Estado Acciones":
        - columnheader "Torneo"
        - columnheader "Sede / Fecha"
        - columnheader "Inscriptos"
        - columnheader "Estado"
        - columnheader "Acciones"
    - rowgroup:
      - row "Torneo E2E Test 1782488432398 5ª · Masculino Sede a confirmar 03 de jul de 2026 0 / 16 Borrador":
        - cell "Torneo E2E Test 1782488432398 5ª · Masculino"
        - cell "Sede a confirmar 03 de jul de 2026"
        - cell "0 / 16"
        - cell "Borrador"
        - cell:
          - button "Centro de Control (Cuadros y Llaves)"
          - button "Editar Torneo"
          - button "Eliminar Torneo"
  - text: Mostrando 1 de 1 resultados
  - button "Primera" [disabled]
  - button "Anterior" [disabled]
  - button "1"
  - button "Siguiente" [disabled]
  - button "Última" [disabled]
- alert
```

# Test source

```ts
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
  75  |     await expect(page.locator(`text=${clubName}`).first()).toBeVisible({
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
> 144 |     await expect(page).toHaveURL(/.*dashboard\/torneos\/.*/, { timeout: 10000 });
      |                        ^ Error: expect(page).toHaveURL(expected) failed
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
  176 |     await page.locator("text=Confirmadas").first().click();
  177 | 
  178 |     // Click en la tab "Todas" de nuevo
  179 |     await page.locator("text=Todas").first().click();
  180 |   });
  181 | });
  182 | 
  183 | // ════════════════════════════════════════════════════════════════════════════
  184 | // FLUJO 5 — NAVEGACIÓN GENERAL DEL DASHBOARD
  185 | // ════════════════════════════════════════════════════════════════════════════
  186 | 
  187 | test.describe.serial("5. Navegación del Dashboard", () => {
  188 |   test("Dashboard principal carga correctamente", async ({ page }) => {
  189 |     await loginAsAdmin(page);
  190 | 
  191 |     // El dashboard principal debería tener las tarjetas de KPIs
  192 |     // Verificar que al menos hay contenido visible
  193 |     await expect(page.locator("body")).toBeVisible();
  194 | 
  195 |     // Verificar que el layout del dashboard está presente (sidebar con links)
  196 |     await expect(page.locator("nav")).toBeVisible({ timeout: 10000 });
  197 |   });
  198 | 
  199 |   test("Navegar a Jugadores", async ({ page }) => {
  200 |     await loginAsAdmin(page);
  201 |     await page.goto("/dashboard/jugadores");
  202 |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  203 |   });
  204 | 
  205 |   test("Navegar a Clubes", async ({ page }) => {
  206 |     await loginAsAdmin(page);
  207 |     await page.goto("/dashboard/clubes");
  208 |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  209 |   });
  210 | 
  211 |   test("Navegar a Torneos", async ({ page }) => {
  212 |     await loginAsAdmin(page);
  213 |     await page.goto("/dashboard/torneos");
  214 |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  215 |   });
  216 | 
  217 |   test("Navegar a Inscripciones", async ({ page }) => {
  218 |     await loginAsAdmin(page);
  219 |     await page.goto("/dashboard/inscripciones");
  220 |     await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  221 |   });
  222 | });
  223 | 
```
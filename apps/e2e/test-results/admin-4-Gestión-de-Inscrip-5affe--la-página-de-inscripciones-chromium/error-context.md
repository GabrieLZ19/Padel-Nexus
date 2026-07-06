# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> 4. Gestión de Inscripciones (Admin) >> Acceder a la página de inscripciones
- Location: tests\admin.spec.ts:153:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Pendientes')
Expected: visible
Error: strict mode violation: locator('text=Pendientes') resolved to 2 elements:
    1) <div class="text-sm font-medium text-gray-400">Pendientes de validación</div> aka getByText('Pendientes de validación')
    2) <button class="whitespace-nowrap rounded-lg px-5 py-2 text-sm font-bold transition-all text-gray-400 hover:text-white">Pendientes</button> aka getByRole('button', { name: 'Pendientes' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Pendientes')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e5]:
        - img "Padel Nexus" [ref=e7]
        - generic [ref=e8]:
          - generic [ref=e9]: padelnexus
          - generic [ref=e10]: ADMIN CRM
      - navigation [ref=e11]:
        - link "Dashboard" [ref=e12] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e13]:
            - img [ref=e14]
            - generic [ref=e19]: Dashboard
        - link "Torneos" [ref=e20] [cursor=pointer]:
          - /url: /dashboard/torneos
          - generic [ref=e21]:
            - img [ref=e22]
            - generic [ref=e28]: Torneos
        - link "Inscripciones" [ref=e29] [cursor=pointer]:
          - /url: /dashboard/inscripciones
          - generic [ref=e30]:
            - img [ref=e31]
            - generic [ref=e34]: Inscripciones
        - link "Clubes" [ref=e35] [cursor=pointer]:
          - /url: /dashboard/clubes
          - generic [ref=e36]:
            - img [ref=e37]
            - generic [ref=e41]: Clubes
        - link "Jugadores" [ref=e42] [cursor=pointer]:
          - /url: /dashboard/jugadores
          - generic [ref=e43]:
            - img [ref=e44]
            - generic [ref=e49]: Jugadores
        - link "Marketplace" [ref=e50] [cursor=pointer]:
          - /url: /dashboard/marketplace
          - generic [ref=e51]:
            - img [ref=e52]
            - generic [ref=e55]: Marketplace
        - link "Moderación" [ref=e56] [cursor=pointer]:
          - /url: /dashboard/moderacion
          - generic [ref=e57]:
            - img [ref=e58]
            - generic [ref=e60]: Moderación
        - link "Estadísticas" [ref=e61] [cursor=pointer]:
          - /url: /dashboard/estadisticas
          - generic [ref=e62]:
            - img [ref=e63]
            - generic [ref=e65]: Estadísticas
        - link "Chat interno" [ref=e66] [cursor=pointer]:
          - /url: /dashboard/chat
          - generic [ref=e67]:
            - img [ref=e68]
            - generic [ref=e70]: Chat interno
      - generic [ref=e71]:
        - img [ref=e73]
        - generic [ref=e76]:
          - generic [ref=e77]: CENTRAL, Administrador
          - generic [ref=e78]: admin@padelnexus.com
        - button "Cerrar sesión" [ref=e79]:
          - img [ref=e80]
    - main [ref=e83]:
      - generic [ref=e85]:
        - generic [ref=e86]:
          - generic [ref=e87]:
            - heading "Inscripciones y reservas" [level=1] [ref=e88]
            - paragraph [ref=e89]: Control de pagos y validaciones
          - button "Exportar CSV" [disabled] [ref=e90]:
            - img [ref=e91]
            - text: Exportar CSV
        - generic [ref=e94]:
          - generic [ref=e95]:
            - img [ref=e97]
            - generic [ref=e99]: "0"
            - generic [ref=e100]: Pendientes de validación
          - generic [ref=e101]:
            - img [ref=e103]
            - generic [ref=e106]: "0"
            - generic [ref=e107]: Pagos confirmados
          - generic [ref=e108]:
            - img [ref=e110]
            - generic [ref=e114]: "0"
            - generic [ref=e115]: Pagos rechazados
          - generic [ref=e116]:
            - img [ref=e118]
            - generic [ref=e121]: $ 0
            - generic [ref=e122]: Recaudado (Aprobado)
        - generic [ref=e123]:
          - generic [ref=e126]:
            - generic [ref=e127]: Todos los torneos
            - img [ref=e128]
          - generic [ref=e130]:
            - button "Todas" [ref=e131]
            - button "Pendientes" [ref=e132]
            - button "Confirmadas" [ref=e133]
            - button "Rechazadas" [ref=e134]
          - generic [ref=e135]:
            - img [ref=e136]
            - textbox "Buscar dupla o torneo..." [ref=e139]
        - table [ref=e142]:
          - rowgroup [ref=e143]:
            - row [ref=e144]:
              - columnheader [ref=e145]
              - columnheader [ref=e147]
              - columnheader [ref=e149]
              - columnheader [ref=e151]
              - columnheader [ref=e153]
              - columnheader [ref=e155]
          - rowgroup [ref=e157]:
            - row [ref=e158]:
              - cell [ref=e159]
              - cell [ref=e162]
              - cell [ref=e165]
              - cell [ref=e167]
              - cell [ref=e169]
              - cell [ref=e171]
            - row [ref=e173]:
              - cell [ref=e174]
              - cell [ref=e177]
              - cell [ref=e180]
              - cell [ref=e182]
              - cell [ref=e184]
              - cell [ref=e186]
            - row [ref=e188]:
              - cell [ref=e189]
              - cell [ref=e192]
              - cell [ref=e195]
              - cell [ref=e197]
              - cell [ref=e199]
              - cell [ref=e201]
            - row [ref=e203]:
              - cell [ref=e204]
              - cell [ref=e207]
              - cell [ref=e210]
              - cell [ref=e212]
              - cell [ref=e214]
              - cell [ref=e216]
            - row [ref=e218]:
              - cell [ref=e219]
              - cell [ref=e222]
              - cell [ref=e225]
              - cell [ref=e227]
              - cell [ref=e229]
              - cell [ref=e231]
        - generic [ref=e233]:
          - generic [ref=e234]: Mostrando 0 de 0 resultados
          - generic [ref=e235]:
            - button "Primera" [disabled] [ref=e236]
            - button "Anterior" [disabled] [ref=e237]
            - button "1" [ref=e239]
            - button "Siguiente" [disabled] [ref=e240]
            - button "Última" [disabled] [ref=e241]
  - button "Open Next.js Dev Tools" [ref=e247] [cursor=pointer]:
    - img [ref=e248]
  - alert [ref=e251]
```

# Test source

```ts
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
> 162 |     await expect(page.locator("text=Pendientes")).toBeVisible();
      |                                                   ^ Error: expect(locator).toBeVisible() failed
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
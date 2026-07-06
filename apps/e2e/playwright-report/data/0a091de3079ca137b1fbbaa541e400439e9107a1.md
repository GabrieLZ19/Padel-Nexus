# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user.spec.ts >> Flujo del Jugador (Ficha Federativa) >> Actualizar configuración del perfil y rellenar datos faltantes
- Location: tests\user.spec.ts:64:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=¡Registro completado!')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('text=¡Registro completado!')

```

```yaml
- img "Padel Nexus"
- heading "Sumate a la red" [level=2]
- heading "Padel Nexus" [level=1]
- paragraph: Conectando jugadores con los circuitos oficiales FAP.
- heading "Crear cuenta" [level=2]
- paragraph: Ingresá tus datos de jugador federado.
- paragraph: Por favor, corregí los errores en los campos marcados.
- text: Datos Personales
- textbox "Nombre": Jugador
- textbox "Apellido": "1782488524712"
- paragraph: El apellido no es válido (mín. 2 letras, sin números).
- text: DNI (Obligatorio FAP)
- 'textbox "Ej: 40.234.567"': 11.111.111
- text: Teléfono
- 'textbox "Ej: +54 9 351..."': +54 9 351 1234567
- text: Provincia de residencia Buenos Aires Categoría Padel 6ª Categoría Lado Preferido Ambos Email
- textbox "tu@email.com": federado1782488524712@example.com
- text: Contraseña
- textbox "••••••••": TestPass123!
- button "Crear cuenta de jugador"
- paragraph:
  - text: ¿Ya tenés una cuenta?
  - link "Iniciá sesión acá":
    - /url: /login
- alert
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test";
  2   | 
  3   | // Helper para interactuar con CustomDropdown
  4   | async function selectCustomDropdown(
  5   |   page: Page,
  6   |   labelText: string,
  7   |   optionText: string,
  8   | ) {
  9   |   const labelEl = page.locator("label", { hasText: labelText }).first();
  10  |   const parentDiv = labelEl.locator("..");
  11  |   const dropdownTrigger = parentDiv.locator(".relative > div").first();
  12  |   await dropdownTrigger.click();
  13  |   await page.locator(`div.cursor-pointer:has-text("${optionText}")`).first().click();
  14  | }
  15  | 
  16  | test.describe.serial("Flujo del Jugador (Ficha Federativa)", () => {
  17  |   const uid = Date.now();
  18  |   const playerEmail = `federado${uid}@example.com`;
  19  |   const playerPassword = "TestPass123!";
  20  | 
  21  |   test.beforeAll(async ({ browser }) => {
  22  |     // Registrar el usuario de prueba antes de correr los tests
  23  |     const page = await browser.newPage();
  24  |     await page.goto("/signup");
  25  |     
  26  |     // Completar campos separados de Nombre y Apellido
  27  |     await page.fill('input[placeholder="Nombre"]', "Jugador");
  28  |     await page.fill('input[placeholder="Apellido"]', String(uid));
  29  |     
  30  |     await page.fill('input[placeholder="Ej: 40.234.567"]', "11.111.111");
  31  |     await page.fill('input[placeholder="Ej: +54 9 351..."]', "+54 9 351 1234567");
  32  | 
  33  |     // Provincia de residencia CustomDropdown
  34  |     const residenciaDropdown = page.locator("label", { hasText: "Provincia de residencia" }).locator("..").locator(".relative");
  35  |     await residenciaDropdown.click();
  36  |     await page.locator("div", { hasText: /^Buenos Aires$/ }).first().click();
  37  | 
  38  |     const categoriaDropdown = page.locator("label", { hasText: "Categoría Padel" }).locator("..").locator(".relative");
  39  |     await categoriaDropdown.click();
  40  |     await page.locator("div", { hasText: /^6ª Categoría$/ }).first().click();
  41  | 
  42  |     const ladoDropdown = page.locator("label", { hasText: "Lado Preferido" }).locator("..").locator(".relative");
  43  |     await ladoDropdown.click();
  44  |     await page.locator("div", { hasText: /^Ambos$/ }).first().click();
  45  | 
  46  |     await page.fill('input[placeholder="tu@email.com"]', playerEmail);
  47  |     await page.fill('input[placeholder="••••••••"]', playerPassword);
  48  |     await page.click('button:has-text("Crear cuenta de jugador")');
> 49  |     await expect(page.locator("text=¡Registro completado!")).toBeVisible({ timeout: 15000 });
      |                                                              ^ Error: expect(locator).toBeVisible() failed
  50  |     await page.close();
  51  |   });
  52  | 
  53  |   // Helper local para iniciar sesión
  54  |   async function loginAsPlayer(page: Page) {
  55  |     await page.goto("/login");
  56  |     await page.fill('input[placeholder="ejemplo@padelnexus.com"]', playerEmail);
  57  |     await page.fill('input[placeholder="••••••••"]', playerPassword);
  58  |     await page.click('button:has-text("Iniciar Sesión")');
  59  |     
  60  |     // Esperamos a que salga de la página de login para confirmar que entró
  61  |     await expect(page).not.toHaveURL(/.*login.*/, { timeout: 15000 });
  62  |   }
  63  | 
  64  |   test("Actualizar configuración del perfil y rellenar datos faltantes", async ({ page }) => {
  65  |     await loginAsPlayer(page);
  66  | 
  67  |     // Navegar a Ajustes
  68  |     await page.goto("/mi-perfil/ajustes");
  69  |     await expect(page.locator("h1", { hasText: "Configuración de Perfil" })).toBeVisible({ timeout: 10000 });
  70  | 
  71  |     // Modificar DNI y Teléfono (usamos uid para asegurar DNI único)
  72  |     const dniUnico = uid.toString().slice(-8);
  73  |     const dniInput = page.locator('label:has-text("DNI")').locator('..').locator('input');
  74  |     await dniInput.clear();
  75  |     await dniInput.fill(dniUnico);
  76  | 
  77  |     const telInput = page.locator('input[type="tel"]');
  78  |     await telInput.clear();
  79  |     await telInput.fill("+5491100001111");
  80  | 
  81  |     // Guardar Ajustes
  82  |     await page.click('button:has-text("Guardar Ajustes")');
  83  | 
  84  |     // Verificar el feedback
  85  |     await expect(page.locator("text=Ficha Actualizada")).toBeVisible({ timeout: 10000 });
  86  |   });
  87  | 
  88  |   test("Solicitar el alta de licencia federativa", async ({ page }) => {
  89  |     await loginAsPlayer(page);
  90  | 
  91  |     // Ir al panel principal del jugador
  92  |     await page.goto("/mi-perfil");
  93  |     await expect(page.locator("text=Licencia Federativa")).toBeVisible({ timeout: 10000 });
  94  | 
  95  |     // Click en Solicitar Alta
  96  |     await page.click('button:has-text("Solicitar Alta")');
  97  | 
  98  |     // Se abre el modal "Solicitar Licencia"
  99  |     await expect(page.locator("h2", { hasText: "Solicitar Licencia" })).toBeVisible({ timeout: 5000 });
  100 | 
  101 |     // Llenar el DNI (sin puntos)
  102 |     const dniInput = page.locator('input[placeholder="Ej: 35123456"]');
  103 |     await dniInput.clear();
  104 |     await dniInput.fill("22222222");
  105 | 
  106 |     // Seleccionar Provincia y Club
  107 |     await selectCustomDropdown(page, "Provincia", "Buenos Aires");
  108 |     
  109 |     // Esperar a que el dropdown de clubes se habilite
  110 |     await page.waitForTimeout(1000); 
  111 |     
  112 |     // Seleccionar el primer club de prueba que se haya creado en Buenos Aires (admin.spec.ts lo crea)
  113 |     // Buscamos el dropdown de Club o Centro Deportivo
  114 |     const clubLabel = page.locator("label", { hasText: "Club o Centro Deportivo" }).first();
  115 |     const clubDiv = clubLabel.locator("..");
  116 |     const clubTrigger = clubDiv.locator(".relative > div").first();
  117 |     await clubTrigger.click();
  118 | 
  119 |     // Seleccionamos la primera opción disponible que no sea "No hay opciones disponibles"
  120 |     const firstOption = page.locator('div.cursor-pointer').filter({ hasNotText: "No hay opciones disponibles" }).first();
  121 |     
  122 |     // Si no hay clubes, el test fallará aquí, lo cual es correcto porque el Admin debería haber creado uno
  123 |     await firstOption.click();
  124 | 
  125 |     // Click en "Enviar Solicitud"
  126 |     await page.click('button:has-text("Enviar Solicitud")');
  127 | 
  128 |     // Verificar el feedback de éxito
  129 |     await expect(page.locator("text=¡Solicitud enviada!")).toBeVisible({ timeout: 10000 });
  130 |   });
  131 | });
  132 | 
```
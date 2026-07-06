# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> 1. Autenticación >> Registro de usuario local desde /signup
- Location: tests\auth.spec.ts:14:7

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
- textbox "Apellido": "1782488473129"
- paragraph: El apellido no es válido (mín. 2 letras, sin números).
- text: DNI (Obligatorio FAP)
- 'textbox "Ej: 40.234.567"': 99.999.999
- text: Teléfono
- 'textbox "Ej: +54 9 351..."': +54 9 351 1234567
- text: Provincia de residencia Buenos Aires Categoría Padel 5ª Categoría Lado Preferido Drive Email
- textbox "tu@email.com": testplayer1782488473129@example.com
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
  3   | // ════════════════════════════════════════════════════════════════════════════
  4   | // FLUJO 1 — AUTENTICACIÓN
  5   | // ════════════════════════════════════════════════════════════════════════════
  6   | 
  7   | test.describe.serial("1. Autenticación", () => {
  8   |   // Timestamp único para que cada corrida genere un usuario nuevo
  9   |   const uid = Date.now();
  10  |   const testEmail = `testplayer${uid}@example.com`;
  11  |   const testPassword = "TestPass123!";
  12  | 
  13  |   // ── 1A. REGISTRO LOCAL ──────────────────────────────────────────────────
  14  |   test("Registro de usuario local desde /signup", async ({ page }) => {
  15  |     await page.goto("/signup");
  16  | 
  17  |     // Verificar que cargó la página de registro
  18  |     await expect(page.locator("h2", { hasText: "Crear cuenta" })).toBeVisible({
  19  |       timeout: 15000,
  20  |     });
  21  | 
  22  |     // Completar formulario — Los placeholders reales del componente signup
  23  |     await page.fill('input[placeholder="Ej: 40.234.567"]', "99.999.999");
  24  |     await page.fill('input[placeholder="Ej: +54 9 351..."]', "+54 9 351 1234567");
  25  | 
  26  |     // Provincia de residencia CustomDropdown
  27  |     const residenciaDropdown = page.locator("label", { hasText: "Provincia de residencia" }).locator("..").locator(".relative");
  28  |     await residenciaDropdown.click();
  29  |     await page.locator("div", { hasText: /^Buenos Aires$/ }).first().click();
  30  | 
  31  |     // CustomDropdowns (Categoría Padel y Lado Preferido)
  32  |     // Abrir el primer dropdown (Categoría Padel) y seleccionar "5ª"
  33  |     const dropdowns = page.locator(".relative").filter({ has: page.locator("svg.lucide-chevron-down") });
  34  |     // Categoría Padel: click en el dropdown, luego click en la opción "5ª Categoría"
  35  |     const categoriaDropdown = page.locator("label", { hasText: "Categoría Padel" }).locator("..").locator(".relative");
  36  |     await categoriaDropdown.click();
  37  |     await page.locator("div", { hasText: /^5ª Categoría$/ }).first().click();
  38  | 
  39  |     // Lado Preferido: click en el dropdown, luego click en "Drive"
  40  |     const ladoDropdown = page.locator("label", { hasText: "Lado Preferido" }).locator("..").locator(".relative");
  41  |     await ladoDropdown.click();
  42  |     await page.locator("div", { hasText: /^Drive$/ }).first().click();
  43  | 
  44  |     // Datos de registro (divididos en Nombre y Apellido)
  45  |     await page.fill('input[placeholder="Nombre"]', "Jugador");
  46  |     await page.fill('input[placeholder="Apellido"]', String(uid));
  47  |     await page.fill('input[placeholder="tu@email.com"]', testEmail);
  48  |     await page.fill('input[placeholder="••••••••"]', testPassword);
  49  | 
  50  |     // Enviar formulario
  51  |     await page.click('button:has-text("Crear cuenta de jugador")');
  52  | 
  53  |     // Verificar mensaje de éxito: "¡Registro completado!"
> 54  |     await expect(page.locator("text=¡Registro completado!")).toBeVisible({
      |                                                              ^ Error: expect(locator).toBeVisible() failed
  55  |       timeout: 15000,
  56  |     });
  57  |   });
  58  | 
  59  |   // ── 1B. LOGIN DE USUARIO (El que acabamos de registrar) ────────────────
  60  |   test("Login de usuario local desde /login", async ({ page }) => {
  61  |     await page.goto("/login");
  62  | 
  63  |     // Verificar que cargó la página de login
  64  |     await expect(page.locator("h2", { hasText: "Bienvenido" })).toBeVisible({
  65  |       timeout: 15000,
  66  |     });
  67  | 
  68  |     // Usar el email y password del usuario recién registrado
  69  |     await page.fill('input[placeholder="ejemplo@padelnexus.com"]', testEmail);
  70  |     await page.fill('input[placeholder="••••••••"]', testPassword);
  71  | 
  72  |     await page.click('button:has-text("Iniciar Sesión")');
  73  | 
  74  |     // Un usuario normal debería ir a la página principal "/"
  75  |     await expect(page).not.toHaveURL(/.*dashboard.*/, { timeout: 15000 });
  76  |   });
  77  | 
  78  |   // ── 1C. LOGIN DE ADMIN ──────────────────────────────────────────────────
  79  |   test("Login de admin local desde /login", async ({ page }) => {
  80  |     const adminEmail = process.env.ADMIN_EMAIL || "admin@padelnexus.com";
  81  |     const adminPassword = process.env.ADMIN_PASSWORD || "Password123!";
  82  | 
  83  |     await page.goto("/login");
  84  | 
  85  |     await expect(page.locator("h2", { hasText: "Bienvenido" })).toBeVisible({
  86  |       timeout: 15000,
  87  |     });
  88  | 
  89  |     await page.fill('input[placeholder="ejemplo@padelnexus.com"]', adminEmail);
  90  |     await page.fill('input[placeholder="••••••••"]', adminPassword);
  91  | 
  92  |     await page.click('button:has-text("Iniciar Sesión")');
  93  | 
  94  |     // Admin debería ir al dashboard
  95  |     await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
  96  |   });
  97  | 
  98  |   // ── 1D. BOTÓN DE GOOGLE VISIBLE ─────────────────────────────────────────
  99  |   test("Botón de Google OAuth está presente en /login", async ({ page }) => {
  100 |     await page.goto("/login");
  101 |     await expect(page.locator("h2", { hasText: "Bienvenido" })).toBeVisible({
  102 |       timeout: 15000,
  103 |     });
  104 | 
  105 |     // Verificar que el botón de Google está visible
  106 |     const googleButton = page.locator('button:has-text("Continuar con Google")');
  107 |     await expect(googleButton).toBeVisible();
  108 | 
  109 |     // No hacemos click porque Google bloquea bots, pero verificamos que existe
  110 |   });
  111 | });
  112 | 
```
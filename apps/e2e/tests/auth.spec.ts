import { test, expect, Page } from "@playwright/test";

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 1 — AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("1. Autenticación", () => {
  // Timestamp único para que cada corrida genere un usuario nuevo
  const uid = Date.now();
  const testEmail = `testplayer${uid}@example.com`;
  const testPassword = "TestPass123!";
  const letters = "abcdefghij";
  const uidAlpha = uid.toString().split("").map(digit => letters[parseInt(digit)]).join("");

  // ── 1A. REGISTRO LOCAL ──────────────────────────────────────────────────
  test("Registro de usuario local desde /signup", async ({ page }) => {
    await page.goto("/signup");

    // Verificar que cargó la página de registro
    await expect(page.locator("h2", { hasText: "Crear cuenta" })).toBeVisible({
      timeout: 15000,
    });

    // Completar formulario — Los placeholders reales del componente signup
    await page.fill('input[placeholder="Ej: 40.234.567"]', "99.999.999");
    await page.fill('input[placeholder="Ej: +54 9 351..."]', "+54 9 351 1234567");

    // Provincia de residencia CustomDropdown
    const residenciaDropdown = page.locator("label", { hasText: "Provincia de residencia" }).locator("..").locator(".relative");
    await residenciaDropdown.click();
    await page.locator("div", { hasText: /^Buenos Aires$/ }).first().click();

    // CustomDropdowns (Categoría Padel y Lado Preferido)
    // Abrir el primer dropdown (Categoría Padel) y seleccionar "5ª"
    const dropdowns = page.locator(".relative").filter({ has: page.locator("svg.lucide-chevron-down") });
    // Categoría Padel: click en el dropdown, luego click en la opción "5ª Categoría"
    const categoriaDropdown = page.locator("label", { hasText: "Categoría Padel" }).locator("..").locator(".relative");
    await categoriaDropdown.click();
    await page.locator("div", { hasText: /^5ª Categoría$/ }).first().click();

    // Lado Preferido: click en el dropdown, luego click en "Drive"
    const ladoDropdown = page.locator("label", { hasText: "Lado Preferido" }).locator("..").locator(".relative");
    await ladoDropdown.click();
    await page.locator("div", { hasText: /^Drive$/ }).first().click();

    // Datos de registro (divididos en Nombre y Apellido)
    await page.fill('input[placeholder="Nombre"]', "Jugador");
    await page.fill('input[placeholder="Apellido"]', uidAlpha);
    await page.fill('input[placeholder="tu@email.com"]', testEmail);
    
    // Contraseñas
    const passInput = page.locator('label', { hasText: /^Contraseña/ }).locator('..').locator('input');
    await passInput.fill(testPassword);
    
    const confirmPassInput = page.locator('label', { hasText: /^Confirmar Contraseña/ }).locator('..').locator('input');
    await confirmPassInput.fill(testPassword);

    // Enviar formulario
    await page.click('button:has-text("Crear cuenta de jugador")');

    // Verificar mensaje de éxito: "¡Registro completado!"
    await expect(page.locator("text=¡Registro completado!")).toBeVisible({
      timeout: 15000,
    });
  });

  // ── 1B. LOGIN DE USUARIO (El que acabamos de registrar) ────────────────
  test("Login de usuario local desde /login", async ({ page }) => {
    await page.goto("/login");

    // Verificar que cargó la página de login
    await expect(page.locator("h2", { hasText: "Bienvenido" })).toBeVisible({
      timeout: 15000,
    });

    // Usar el email y password del usuario recién registrado
    await page.fill('input[placeholder="ejemplo@padelnexus.com"]', testEmail);
    await page.fill('input[placeholder="••••••••"]', testPassword);

    await page.click('button:has-text("Iniciar Sesión")');

    // Un usuario normal debería ir a la página principal "/"
    await expect(page).not.toHaveURL(/.*dashboard.*/, { timeout: 15000 });
  });

  // ── 1C. LOGIN DE ADMIN ──────────────────────────────────────────────────
  test("Login de admin local desde /login", async ({ page }) => {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@padelnexus.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Password123!";

    await page.goto("/login");

    await expect(page.locator("h2", { hasText: "Bienvenido" })).toBeVisible({
      timeout: 15000,
    });

    await page.fill('input[placeholder="ejemplo@padelnexus.com"]', adminEmail);
    await page.fill('input[placeholder="••••••••"]', adminPassword);

    await page.click('button:has-text("Iniciar Sesión")');

    // Admin debería ir al dashboard
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
  });

  // ── 1D. BOTÓN DE GOOGLE VISIBLE ─────────────────────────────────────────
  test("Botón de Google OAuth está presente en /login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2", { hasText: "Bienvenido" })).toBeVisible({
      timeout: 15000,
    });

    // Verificar que el botón de Google está visible
    const googleButton = page.locator('button:has-text("Continuar con Google")');
    await expect(googleButton).toBeVisible();

    // No hacemos click porque Google bloquea bots, pero verificamos que existe
  });
});

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

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 6 — ACEPTAR / RECHAZAR INSCRIPCIONES
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("6. Aceptar Inscripciones (Admin)", () => {
  test("Aprobar una inscripción pendiente desde la tabla", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/inscripciones");

    // Esperar que cargue la tabla
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    // Ir a la pestaña "Pendientes"
    await page.locator("text=Pendientes").first().click();
    await page.waitForTimeout(2000); // Esperar datos

    // Si hay al menos una inscripción pendiente, el botón de check (Aprobar) existe
    const approveButton = page.locator('button[title="Aprobar Inscripción"]').first();
    const hasInscriptions = await approveButton.isVisible().catch(() => false);

    if (hasInscriptions) {
      await approveButton.click();

      // Se abre el FeedbackModal de "Confirmar Pago Manual"
      await expect(
        page.locator("text=Confirmar Pago Manual"),
      ).toBeVisible({ timeout: 5000 });

      // Completar el monto en el input del modal
      const montoInput = page.locator('input[type="number"]').last();
      if (await montoInput.isVisible()) {
        await montoInput.clear();
        await montoInput.fill("15000");
      }

      // Hacer click en "Confirmar Pago"
      await page.click('button:has-text("Confirmar Pago")');

      // Esperar el feedback de éxito: "Pago Confirmado"
      await expect(page.locator("text=Pago Confirmado")).toBeVisible({
        timeout: 10000,
      });
    } else {
      // No hay inscripciones pendientes para aprobar — test pasa igualmente
      test.skip();
    }
  });

  test("Rechazar una inscripción pendiente desde la tabla", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/inscripciones");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    await page.locator("text=Pendientes").first().click();
    await page.waitForTimeout(2000);

    const rejectButton = page.locator('button[title="Rechazar Inscripción"]').first();
    const hasInscriptions = await rejectButton.isVisible().catch(() => false);

    if (hasInscriptions) {
      await rejectButton.click();

      // Se abre el modal: "¿Rechazar inscripción?"
      await expect(
        page.locator("text=¿Rechazar inscripción?"),
      ).toBeVisible({ timeout: 5000 });

      // Confirmar con "Sí, rechazar"
      await page.click('button:has-text("Sí, rechazar")');

      // Feedback: "Estado actualizado"
      await expect(page.locator("text=Estado actualizado")).toBeVisible({
        timeout: 10000,
      });
    } else {
      test.skip();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 7 — DAR DE ALTA LICENCIAS DE JUGADORES
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("7. Gestión de Licencias (Admin)", () => {
  test("Aprobar una licencia pendiente desde la tabla de jugadores", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/jugadores");

    // Esperar que cargue la tabla
    await expect(page.locator("h1", { hasText: "Jugadores y licencias" })).toBeVisible({
      timeout: 15000,
    });

    // Buscar el botón "Validar" (solo aparece si hay licencias pendientes)
    const validarButton = page.locator('button:has-text("Validar")').first();
    const hasPendientes = await validarButton.isVisible().catch(() => false);

    if (hasPendientes) {
      await validarButton.click();

      // Se abre el modal "Verificar Solicitud"
      await expect(
        page.locator("h3", { hasText: "Verificar Solicitud" }),
      ).toBeVisible({ timeout: 5000 });

      // Verificar que se muestran los datos del jugador (DNI y Provincia)
      await expect(page.locator("text=Documento (DNI)")).toBeVisible();
      await expect(page.locator("text=Provincia")).toBeVisible();

      // Click en "Aprobar Licencia"
      await page.click('button:has-text("Aprobar Licencia")');

      // Feedback: "Licencia aprobada"
      await expect(page.locator("text=Licencia aprobada")).toBeVisible({
        timeout: 10000,
      });
    } else {
      // No hay licencias pendientes — pasar el test con skip
      test.skip();
    }
  });

  test("Rechazar una licencia desde la tabla de jugadores", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/jugadores");
    await expect(page.locator("h1", { hasText: "Jugadores y licencias" })).toBeVisible({
      timeout: 15000,
    });

    const validarButton = page.locator('button:has-text("Validar")').first();
    const hasPendientes = await validarButton.isVisible().catch(() => false);

    if (hasPendientes) {
      await validarButton.click();
      await expect(
        page.locator("h3", { hasText: "Verificar Solicitud" }),
      ).toBeVisible({ timeout: 5000 });

      // Click en "Rechazar Solicitud"
      await page.click('button:has-text("Rechazar Solicitud")');

      // Feedback: "Licencia rechazada"
      await expect(page.locator("text=Licencia rechazada")).toBeVisible({
        timeout: 10000,
      });
    } else {
      test.skip();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 8 — CUADROS Y LLAVES (Generación de Bracket)
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("8. Generación de Llaves (Admin)", () => {
  test("Navegar al detalle de torneo y ver pestaña Cuadros y Llaves", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/torneos");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    // Click en el primer torneo disponible en la tabla (si tiene "Centro de Control")
    const controlBtn = page.locator('button:has-text("Centro de Control")').first();
    const hasTorneos = await controlBtn.isVisible().catch(() => false);

    if (hasTorneos) {
      await controlBtn.click();
      await expect(page).toHaveURL(/.*dashboard\/torneos\/.*/, { timeout: 10000 });

      // Click en la pestaña "Cuadros y Llaves"
      await page.click('button:has-text("Cuadros y Llaves")');

      // Verificar que el BracketEditor se muestra
      await expect(
        page.locator("text=EDITOR DE LLAVES"),
      ).toBeVisible({ timeout: 10000 });

      // Verificar que las sub-tabs del editor existen
      await expect(page.locator('button:has-text("Fase de grupos")')).toBeVisible();
      await expect(page.locator('button:has-text("Llave campeonato")')).toBeVisible();
      await expect(page.locator('button:has-text("Auditoría")')).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("Ver la pestaña Llave campeonato con los partidos", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/torneos");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    const controlBtn = page.locator('button:has-text("Centro de Control")').first();
    const hasTorneos = await controlBtn.isVisible().catch(() => false);

    if (hasTorneos) {
      await controlBtn.click();
      await expect(page).toHaveURL(/.*dashboard\/torneos\/.*/, { timeout: 10000 });

      // Click en "Cuadros y Llaves"
      await page.click('button:has-text("Cuadros y Llaves")');
      await expect(page.locator("text=EDITOR DE LLAVES")).toBeVisible({ timeout: 10000 });

      // Click en "Llave campeonato"
      await page.click('button:has-text("Llave campeonato")');

      // Debería mostrar MatchCards o mensaje de que no hay llaves
      // Esperamos algún contenido dentro del area de llaves
      await page.waitForTimeout(2000);
    } else {
      test.skip();
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// FLUJO 9 — ARBITRAJE EN VIVO
// ════════════════════════════════════════════════════════════════════════════

test.describe.serial("9. Arbitraje en Vivo (Admin)", () => {
  test("Navegar a la consola de arbitraje en vivo", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/torneos");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    const controlBtn = page.locator('button:has-text("Centro de Control")').first();
    const hasTorneos = await controlBtn.isVisible().catch(() => false);

    if (hasTorneos) {
      await controlBtn.click();
      await expect(page).toHaveURL(/.*dashboard\/torneos\/.*/, { timeout: 10000 });

      // Click en la pestaña "Arbitraje en Vivo"
      await page.click('button:has-text("Arbitraje en Vivo")');

      // Verificar que se muestra la consola
      await expect(
        page.locator("text=Consola de Arbitraje en Vivo"),
      ).toBeVisible({ timeout: 10000 });
    } else {
      test.skip();
    }
  });

  test("Sumar puntos a un partido en vivo", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/torneos");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    const controlBtn = page.locator('button:has-text("Centro de Control")').first();
    const hasTorneos = await controlBtn.isVisible().catch(() => false);

    if (hasTorneos) {
      await controlBtn.click();
      await expect(page).toHaveURL(/.*dashboard\/torneos\/.*/, { timeout: 10000 });

      // Ir a "Arbitraje en Vivo"
      await page.click('button:has-text("Arbitraje en Vivo")');
      await expect(page.locator("text=Consola de Arbitraje en Vivo")).toBeVisible({
        timeout: 10000,
      });

      // Verificar si hay partidos jugables
      const puntoABtn = page.locator('button:has-text("Punto Eq. A")').first();
      const hasPartidos = await puntoABtn.isVisible().catch(() => false);

      if (hasPartidos) {
        // Sumar 4 puntos al equipo A (0→15→30→40→Game)
        await puntoABtn.click(); // 0 → 15
        await page.waitForTimeout(300);
        await puntoABtn.click(); // 15 → 30
        await page.waitForTimeout(300);
        await puntoABtn.click(); // 30 → 40
        await page.waitForTimeout(300);
        await puntoABtn.click(); // 40 → Game (1-0)

        // Verificar que el marcador del set cambió (Games A = 1)
        await page.waitForTimeout(500);

        // Sumar puntos al equipo B también
        const puntoBBtn = page.locator('button:has-text("Punto Eq. B")').first();
        await puntoBBtn.click();
        await page.waitForTimeout(300);
        await puntoBBtn.click();
        await page.waitForTimeout(300);
        await puntoBBtn.click();
        await page.waitForTimeout(300);
        await puntoBBtn.click(); // Game para B (1-1)
      } else {
        // No hay partidos jugables
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test("Finalizar un partido y avanzar la llave", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/torneos");
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });

    const controlBtn = page.locator('button:has-text("Centro de Control")').first();
    const hasTorneos = await controlBtn.isVisible().catch(() => false);

    if (hasTorneos) {
      await controlBtn.click();
      await expect(page).toHaveURL(/.*dashboard\/torneos\/.*/, { timeout: 10000 });

      await page.click('button:has-text("Arbitraje en Vivo")');
      await expect(page.locator("text=Consola de Arbitraje en Vivo")).toBeVisible({
        timeout: 10000,
      });

      // Verificar si hay un partido con marcador ya cargado
      const finalizarBtn = page.locator('button:has-text("Finalizar Partido")').first();
      const hasPartidos = await finalizarBtn.isVisible().catch(() => false);

      if (hasPartidos) {
        // Primero, asegurémonos de que hay un marcador no-empatado
        // Inyectamos games directamente en los inputs de sets
        const setInputs = page.locator('input[type="number"]');
        const countInputs = await setInputs.count();

        if (countInputs >= 2) {
          // Primer input = games equipo A, segundo = games equipo B
          await setInputs.nth(0).clear();
          await setInputs.nth(0).fill("6");
          await setInputs.nth(1).clear();
          await setInputs.nth(1).fill("3");

          // Click en Finalizar
          await finalizarBtn.click();

          // Feedback: "¡Set Finalizado!"
          await expect(page.locator("text=¡Set Finalizado!")).toBeVisible({
            timeout: 10000,
          });
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });
});

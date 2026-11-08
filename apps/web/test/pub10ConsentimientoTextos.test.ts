import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RAIZ_WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ_API = path.resolve(RAIZ_WEB, "../api");

describe("PUB-10 textos consentimiento parental", () => {
  it("confirmación: autorizaciones desde cuenta del menor", () => {
    const page = readFileSync(
      path.join(
        RAIZ_WEB,
        "app/(public)/consentimiento-parental/[token]/page.tsx",
      ),
      "utf8",
    );
    assert.match(page, /Mi panel/);
    assert.match(page, /Ver autorizaciones/);
    assert.doesNotMatch(page, /cuenta del responsable/);
  });

  it("registro menor: no promete envío automático por correo", () => {
    const signup = readFileSync(
      path.join(RAIZ_WEB, "app/(auth)/signup/page.tsx"),
      "utf8",
    );
    assert.match(signup, /no se envía automáticamente por correo/);
  });

  it("login API: alinea mensaje con enlace compartido al registrarse", () => {
    const auth = readFileSync(
      path.join(RAIZ_API, "src/services/auth.service.ts"),
      "utf8",
    );
    assert.match(auth, /enlace que compartiste al registrarte/);
    assert.doesNotMatch(auth, /enlace enviado por correo/);
  });
});

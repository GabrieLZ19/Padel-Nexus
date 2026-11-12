import {
  esEmailPlaceholderPlanilla,
  esResidenciaPlaceholder,
} from "./inscripcionPlanilla";
import { provinciaCanonicaArgentina } from "./provinciaRanking";

/** Email visible en CRM y comunicaciones; oculta cuentas técnicas de planilla. */
export function emailContactoVisible(
  email: string | null | undefined,
): string | null {
  if (esEmailPlaceholderPlanilla(email)) return null;
  const e = String(email || "").trim();
  return e || null;
}

/** Residencia con provincia canónica cuando aplica. */
export function lugarResidenciaVisible(
  lugar: string | null | undefined,
): string | null {
  const v = String(lugar || "").trim();
  if (!v || esResidenciaPlaceholder(v)) return null;
  return provinciaCanonicaArgentina(v) ?? v;
}

export function presentarPerfilContacto<
  T extends { email?: string | null; lugar_residencia?: string | null },
>(perfil: T): T {
  return {
    ...perfil,
    email: emailContactoVisible(perfil.email),
    lugar_residencia: lugarResidenciaVisible(perfil.lugar_residencia),
  };
}

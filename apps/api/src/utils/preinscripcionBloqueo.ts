import { supabaseAdmin } from "../config/supabase";

const MAX_INTENTOS_FALLIDOS = 5;
const BLOQUEO_MINUTOS = 15;

function normalizarDni(dni: string): string {
  return String(dni || "").replace(/\D/g, "");
}

export async function assertDniNoBloqueadoPreinscripcion(
  dni: string,
): Promise<void> {
  const dniLimpio = normalizarDni(dni);
  if (!dniLimpio) return;

  const { data, error } = await supabaseAdmin
    .from("preinscripcion_verificacion_bloqueos")
    .select("bloqueado_hasta")
    .eq("dni", dniLimpio)
    .maybeSingle();

  if (error) {
    console.error("preinscripcion bloqueo lectura:", error.message);
    return;
  }

  if (!data?.bloqueado_hasta) return;

  const hasta = new Date(data.bloqueado_hasta).getTime();
  if (Number.isNaN(hasta) || hasta <= Date.now()) return;

  throw new Error(
    "Demasiados intentos fallidos. Esperá unos minutos antes de volver a verificar.",
  );
}

export async function registrarIntentoFallidoPreinscripcion(
  dni: string,
): Promise<void> {
  const dniLimpio = normalizarDni(dni);
  if (!dniLimpio) return;

  const { data: actual } = await supabaseAdmin
    .from("preinscripcion_verificacion_bloqueos")
    .select("intentos_fallidos, bloqueado_hasta")
    .eq("dni", dniLimpio)
    .maybeSingle();

  const previos = actual?.intentos_fallidos ?? 0;
  const nuevos = previos + 1;
  const bloqueado =
    nuevos >= MAX_INTENTOS_FALLIDOS
      ? new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000).toISOString()
      : actual?.bloqueado_hasta ?? null;

  const { error } = await supabaseAdmin
    .from("preinscripcion_verificacion_bloqueos")
    .upsert(
      {
        dni: dniLimpio,
        intentos_fallidos: nuevos,
        bloqueado_hasta: bloqueado,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dni" },
    );

  if (error) {
    console.error("preinscripcion bloqueo escritura:", error.message);
  }
}

export async function reiniciarIntentosPreinscripcion(dni: string): Promise<void> {
  const dniLimpio = normalizarDni(dni);
  if (!dniLimpio) return;

  await supabaseAdmin
    .from("preinscripcion_verificacion_bloqueos")
    .upsert(
      {
        dni: dniLimpio,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dni" },
    );
}

/**
 * Importa el padrón FAP (HTML export) como fichas provisorias sin teléfono ni mail personal.
 *
 * Uso:
 *   pnpm --filter api import:padron-fap -- "ruta/al/jugadores.html"
 *   pnpm --filter api import:padron-fap -- "ruta.html" --limit 100
 *   pnpm --filter api import:padron-fap -- "ruta.html" --dry-run
 *   pnpm --filter api import:padron-fap -- "ruta.html" --retry-log errores.jsonl
 */
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_LICENCIA } from "../constants/fap";
import { capitalizarNombre } from "../utils/formatoTexto";
import { esEmailPlaceholderPlanilla } from "../utils/inscripcionPlanilla";
import { parsePadronFapHtml } from "../utils/padronFapHtml";
import {
  emailPlaceholderPadronFap,
  lugarResidenciaDesdePadronFap,
  normalizarNroLicenciaFap,
  parseNivelFapFicha,
} from "../utils/padronFapNivel";
import {
  LICENCIA_CONFIG_DEFAULT,
  calcularFechaVencimientoLicencia,
} from "../utils/licenciaConfig";

type Existente = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  categoria_padel: string | null;
  lugar_residencia: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
};

type Resumen = {
  totalFilas: number;
  procesados: number;
  creados: number;
  actualizados: number;
  licenciasCreadas: number;
  omitidos: number;
  errores: number;
};

const CONCURRENCY = 4;
const PAUSA_MS = 40;

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const limitIdx = argv.indexOf("--limit");
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1]
      ? Number(argv[limitIdx + 1])
      : undefined;
  const retryIdx = argv.indexOf("--retry-log");
  const retryLog =
    retryIdx >= 0 && argv[retryIdx + 1]
      ? path.resolve(argv[retryIdx + 1])
      : undefined;
  const fileArg = argv.find((a) => !a.startsWith("--") && a.endsWith(".html"));
  if (!fileArg) {
    throw new Error(
      "Indicá la ruta al HTML exportado (ej. jugadores.xls (5).html).",
    );
  }
  return { dryRun, limit, retryLog, filePath: path.resolve(fileArg) };
}

function dniesDesdeLogErrores(logPath: string): Set<string> {
  const text = fs.readFileSync(logPath, "utf8");
  const set = new Set<string>();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const row = JSON.parse(t) as { dni?: string };
      if (row.dni) set.add(String(row.dni));
    } catch {
      /* línea inválida */
    }
  }
  return set;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cargarExistentesPorDni(): Promise<Map<string, Existente>> {
  const map = new Map<string, Existente>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, dni, nombre, apellido, email, categoria_padel, lugar_residencia, fecha_nacimiento, sexo",
      )
      .not("dni", "is", null)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Error cargando perfiles: ${error.message}`);
    if (!data?.length) break;

    for (const row of data) {
      const dni = String(row.dni || "").replace(/\D/g, "");
      if (dni.length >= 7) {
        map.set(dni, row as Existente);
      }
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return map;
}

async function cargarNrosLicenciaOcupados(): Promise<Set<string>> {
  const set = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select("nro_licencia")
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Error cargando licencias: ${error.message}`);
    if (!data?.length) break;

    for (const row of data) {
      if (row.nro_licencia) set.add(String(row.nro_licencia));
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return set;
}

async function asegurarLicencia(
  usuarioId: string,
  nroLicencia: string,
  fechaVencimiento: string,
  meta: { instPrimaria: string; representacion: string },
  licenciasOcupadas: Set<string>,
  dryRun: boolean,
): Promise<boolean> {
  if (licenciasOcupadas.has(nroLicencia)) {
    const { data: existente } = await supabaseAdmin
      .from("licencias")
      .select("id, usuario_id")
      .eq("nro_licencia", nroLicencia)
      .maybeSingle();

    if (existente?.usuario_id === usuarioId) return false;
    if (existente) {
      throw new Error(
        `nro_licencia ${nroLicencia} ya pertenece a otro usuario.`,
      );
    }
  }

  const { data: delUsuario } = await supabaseAdmin
    .from("licencias")
    .select("id, nro_licencia")
    .eq("usuario_id", usuarioId)
    .limit(1)
    .maybeSingle();

  if (delUsuario) return false;

  if (dryRun) return true;

  const { error } = await supabaseAdmin.from("licencias").insert({
    usuario_id: usuarioId,
    nro_licencia: nroLicencia,
    estado: FAP_ESTADOS_LICENCIA.ACTIVA,
    fecha_emision: new Date().toISOString().slice(0, 10),
    fecha_vencimiento: fechaVencimiento,
    datos_solicitud: {
      origen: "padron_fap",
      inst_primaria: meta.instPrimaria || null,
      representacion: meta.representacion || null,
    },
  });

  if (error) throw new Error(error.message);
  licenciasOcupadas.add(nroLicencia);
  return true;
}

async function crearFicha(
  fila: ReturnType<typeof parsePadronFapHtml>[number],
  fechaVencimiento: string,
  licenciasOcupadas: Set<string>,
) {
  const { sexo, categoria_padel } = parseNivelFapFicha(fila.nivel);
  const nombre = capitalizarNombre(fila.nombre);
  const apellido = capitalizarNombre(fila.apellido);
  const email = emailPlaceholderPadronFap(fila.dni);
  const lugar = lugarResidenciaDesdePadronFap(fila.ciudad, fila.provincia);
  const nroLicencia = normalizarNroLicenciaFap(fila.licenciaRaw);

  const passwordTemporal = randomBytes(24).toString("hex");
  const { data: authUser, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: passwordTemporal,
      email_confirm: true,
      user_metadata: {
        origen: "padron_fap",
        pendiente_activacion: true,
        dni: fila.dni,
      },
    });

  if (authError || !authUser.user) {
    throw new Error(authError?.message || "createUser falló");
  }

  const userId = authUser.user.id;
  const { error: perfilError } = await supabaseAdmin.from("perfiles").upsert(
    {
      id: userId,
      email,
      dni: fila.dni,
      nombre,
      apellido,
      telefono: null,
      lugar_residencia: lugar,
      categoria_padel,
      lado_preferido: "indistinto",
      fecha_nacimiento: fila.fechaNacimiento || null,
      sexo,
      rol: "usuario",
      pendiente_activacion: true,
    },
    { onConflict: "id" },
  );

  if (perfilError) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(perfilError.message);
  }

  if (nroLicencia) {
    await asegurarLicencia(
      userId,
      nroLicencia,
      fechaVencimiento,
      {
        instPrimaria: fila.instPrimaria,
        representacion: fila.representacion,
      },
      licenciasOcupadas,
      false,
    );
  }
}

async function actualizarFicha(
  existente: Existente,
  fila: ReturnType<typeof parsePadronFapHtml>[number],
  fechaVencimiento: string,
  licenciasOcupadas: Set<string>,
  dryRun: boolean,
): Promise<"actualizado" | "licencia" | "omitido"> {
  const { sexo, categoria_padel } = parseNivelFapFicha(fila.nivel);
  const nombre = capitalizarNombre(fila.nombre);
  const apellido = capitalizarNombre(fila.apellido);
  const lugar = lugarResidenciaDesdePadronFap(fila.ciudad, fila.provincia);
  const nroLicencia = normalizarNroLicenciaFap(fila.licenciaRaw);

  const patch: Record<string, unknown> = {};
  if (!existente.nombre && nombre) patch.nombre = nombre;
  if (!existente.apellido && apellido) patch.apellido = apellido;
  if (!existente.categoria_padel) patch.categoria_padel = categoria_padel;
  if (!existente.sexo) patch.sexo = sexo;
  if (!existente.fecha_nacimiento && fila.fechaNacimiento) {
    patch.fecha_nacimiento = fila.fechaNacimiento;
  }
  if (
    !existente.lugar_residencia ||
    existente.lugar_residencia === "A completar"
  ) {
    patch.lugar_residencia = lugar;
  }
  if (
    existente.email &&
    esEmailPlaceholderPlanilla(existente.email) &&
    Object.keys(patch).length > 0
  ) {
    patch.pendiente_activacion = true;
  }

  let accion: "actualizado" | "omitido" = "omitido";

  if (Object.keys(patch).length > 0) {
    if (!dryRun) {
      const { error } = await supabaseAdmin
        .from("perfiles")
        .update(patch)
        .eq("id", existente.id);
      if (error) throw new Error(error.message);
    }
    accion = "actualizado";
  }

  if (nroLicencia) {
    const licenciaNueva = await asegurarLicencia(
      existente.id,
      nroLicencia,
      fechaVencimiento,
      {
        instPrimaria: fila.instPrimaria,
        representacion: fila.representacion,
      },
      licenciasOcupadas,
      dryRun,
    );
    if (licenciaNueva) return "licencia";
  }

  return accion;
}

function nroLicenciaFromFila(
  fila: ReturnType<typeof parsePadronFapHtml>[number],
): string | null {
  return normalizarNroLicenciaFap(fila.licenciaRaw);
}

async function procesarLote(
  filas: ReturnType<typeof parsePadronFapHtml>,
  existentes: Map<string, Existente>,
  fechaVencimiento: string,
  licenciasOcupadas: Set<string>,
  dryRun: boolean,
  resumen: Resumen,
  logErrores: fs.WriteStream,
) {
  for (let i = 0; i < filas.length; i += CONCURRENCY) {
    const slice = filas.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (fila) => {
        try {
          resumen.procesados++;
          const existente = existentes.get(fila.dni);
          if (existente) {
            const r = await actualizarFicha(
              existente,
              fila,
              fechaVencimiento,
              licenciasOcupadas,
              dryRun,
            );
            if (r === "actualizado") resumen.actualizados++;
            else if (r === "licencia") resumen.licenciasCreadas++;
            else resumen.omitidos++;
            return;
          }

          if (!dryRun) {
            await crearFicha(fila, fechaVencimiento, licenciasOcupadas);
          }
          resumen.creados++;
          if (nroLicenciaFromFila(fila)) resumen.licenciasCreadas++;
        } catch (err) {
          resumen.errores++;
          const msg = err instanceof Error ? err.message : String(err);
          logErrores.write(
            JSON.stringify({ dni: fila.dni, fila: fila.fila, error: msg }) +
              "\n",
          );
        }
      }),
    );

    if ((i + CONCURRENCY) % 200 === 0 || i + CONCURRENCY >= filas.length) {
      console.log(
        `[padron-fap] ${resumen.procesados}/${filas.length} | +${resumen.creados} nuevos | ${resumen.errores} errores`,
      );
    }
    await sleep(PAUSA_MS);
  }
}

async function main() {
  const { dryRun, limit, retryLog, filePath } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo: ${filePath}`);
  }

  console.log(`[padron-fap] Leyendo ${filePath}`);
  const html = fs.readFileSync(filePath, "utf8");
  let filas = parsePadronFapHtml(html);
  if (retryLog) {
    const solo = dniesDesdeLogErrores(retryLog);
    filas = filas.filter((f) => solo.has(f.dni));
    console.log(`[padron-fap] Reintento: ${filas.length} DNI desde ${retryLog}`);
  }
  if (limit && limit > 0) filas = filas.slice(0, limit);

  console.log(
    `[padron-fap] ${filas.length} jugadores únicos por DNI${dryRun ? " (dry-run)" : ""}`,
  );

  const fechaVencimiento = calcularFechaVencimientoLicencia(
    LICENCIA_CONFIG_DEFAULT,
  );
  console.log(`[padron-fap] fecha_vencimiento licencia: ${fechaVencimiento}`);

  const [existentes, licenciasOcupadas] = await Promise.all([
    cargarExistentesPorDni(),
    cargarNrosLicenciaOcupados(),
  ]);

  const logPath = path.join(
    process.cwd(),
    `padron-fap-import-${Date.now()}.jsonl`,
  );
  const logErrores = fs.createWriteStream(logPath, { flags: "a" });

  const resumen: Resumen = {
    totalFilas: filas.length,
    procesados: 0,
    creados: 0,
    actualizados: 0,
    licenciasCreadas: 0,
    omitidos: 0,
    errores: 0,
  };

  await procesarLote(
    filas,
    existentes,
    fechaVencimiento,
    licenciasOcupadas,
    dryRun,
    resumen,
    logErrores,
  );

  logErrores.end();
  console.log("[padron-fap] Finalizado:", resumen);
  console.log(`[padron-fap] Log errores: ${logPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
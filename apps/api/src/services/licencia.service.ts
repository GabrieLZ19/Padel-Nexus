import { supabaseAdmin } from "../config/supabase";
import { MercadoPagoConfig, Preference } from "mercadopago";
import {
  buildMercadoPagoBackUrls,
  getMercadoPagoAccessToken,
  isMercadoPagoConfigured,
  resolveMercadoPagoInitPoint,
} from "../config/mercadopago";
import { NotificacionService } from "./notificacion.service";
import { LicenciaOrganizacionService } from "./licenciaOrganizacion.service";
import {
  calcularVencimientoTrasPagoMensual,
  descripcionVigenciaLicencia,
  periodoDesdeFecha,
} from "../utils/licenciaConfig";
import { esRolAccesoCrm } from "../constants/roles";
import { resumirLicenciasPorJugador } from "../utils/resumenLicencias";
import { fechaLatina } from "../utils/fechaArgentina";
import { enmascararDni } from "../utils/enmascararDni";
import {
  aplicarEstadoEfectivoLicencia,
  estadoEfectivoLicencia,
  jugadorCoincideEstadoLicencia,
  normalizarEstadoAlmacenadoLicencia,
  reconciliarEstadoAlmacenadoConVencimiento,
  normalizarPerfilLicencias,
  resolverEstadoLicenciaPublica,
  type EstadoLicenciaPublica,
} from "../utils/estadoLicencia";
import {
  exponeIdentidadVerificacionPublica,
  mensajeVerificacionLicenciaPublica,
} from "../utils/verificacionLicenciaPublica";
import { fechaHoyArgentina } from "../utils/fechaArgentina";
import {
  orBusquedaJugadoresLicencias,
  patronIlikeSql,
  terminoIlikePostgrest,
} from "../utils/postgrestBusqueda";
import {
  montoLicenciaDesdeSolicitud,
  permitirMockMercadoPagoLicencia,
  resolverDatosTransferenciaLicencia,
  textoInstruccionesPagoLicencia,
  transferenciaLicenciaDisponible,
} from "../utils/licenciaPago";

export type { EstadoLicenciaPublica };

export type VerificacionLicenciaPublica = {
  valida: boolean;
  estado: EstadoLicenciaPublica;
  nombre: string | null;
  apellido: string | null;
  titular: string | null;
  dni_parcial: string | null;
  nro_licencia: string | null;
  fecha_vencimiento: string | null;
  fecha_vencimiento_texto: string | null;
  mensaje: string | null;
  /** True si el titular es menor y la consulta no es de personal autorizado. */
  identidad_reservada_menor: boolean;
};

function respuestaLicenciaNoValida(
  mensaje = "Licencia no válida.",
): VerificacionLicenciaPublica {
  return {
    valida: false,
    estado: "no_valida",
    nombre: null,
    apellido: null,
    titular: null,
    dni_parcial: null,
    nro_licencia: null,
    fecha_vencimiento: null,
    fecha_vencimiento_texto: null,
    mensaje,
    identidad_reservada_menor: false,
  };
}

function normalizarTexto(input?: string | null): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const MAX_IDS_BUSQUEDA_NRO_LICENCIA = 500;

async function usuarioIdsPorBusquedaNroLicencia(
  search: string,
): Promise<string[]> {
  const pattern = patronIlikeSql(search);
  const { data, error } = await supabaseAdmin
    .from("licencias")
    .select("usuario_id")
    .ilike("nro_licencia", pattern)
    .limit(MAX_IDS_BUSQUEDA_NRO_LICENCIA);

  if (error) {
    console.error("Busqueda nro_licencia (ENT-3):", error.message);
    return [];
  }

  return [
    ...new Set(
      (data || [])
        .map((row) => String(row.usuario_id || "").trim())
        .filter(Boolean),
    ),
  ];
}

export class LicenciaService {
  /**
   * Lista licencias paginadas. Si el actor es admin_provincial, filtra
   * a su asociación / provincia (asociacion_id o lugar_residencia).
   * Si no existe asociación para su provincia, igual lista por
   * `lugar_residencia` (no rompe con 500).
   */
  static async obtenerLicencias(
    page: number,
    limit: number,
    search?: string,
    estado?: string,
    actor?: { id: string; rol: string },
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let alcanceProvincial: {
      asociacionId: string | null;
      provincia: string;
    } | null = null;

    if (actor?.rol === "admin_provincial") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("lugar_residencia")
        .eq("id", actor.id)
        .maybeSingle();

      const provincia = (perfil?.lugar_residencia || "").trim();
      if (!provincia) {
        throw new Error(
          "Tu perfil no tiene provincia asignada. Contactá a la federación.",
        );
      }

      const { data: asoc } = await supabaseAdmin
        .from("asociaciones")
        .select("id, provincia")
        .ilike("provincia", provincia)
        .limit(1)
        .maybeSingle();

      alcanceProvincial = {
        asociacionId: asoc?.id ?? null,
        provincia: asoc?.provincia ?? provincia,
      };
    }

    let query = supabaseAdmin
      .from("perfiles")
      .select(
        "*, licencias:licencias!fk_licencias_usuario!inner(*), afiliaciones:afiliaciones!fk_afiliaciones_usuario(id, entidad, estado, fecha_vencimiento)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    const hoyArgentina = fechaHoyArgentina();
    if (estado === "Activa") {
      query = query
        .eq("licencias.estado", "Activa")
        .gte("licencias.fecha_vencimiento", hoyArgentina);
    } else if (estado === "Vencida") {
      query = query.or(
        `licencias.estado.eq.Vencida,and(licencias.estado.eq.Activa,licencias.fecha_vencimiento.lt.${hoyArgentina})`,
      );
    } else if (estado) {
      query = query.eq("licencias.estado", estado);
    }

    if (search?.trim()) {
      const quoted = terminoIlikePostgrest(search);
      const idsNro = await usuarioIdsPorBusquedaNroLicencia(search);
      query = query.or(orBusquedaJugadoresLicencias(quoted, idsNro));
    }

    // Filtro DB seguro: solo por lugar_residencia del perfil.
    // El match por asociacion_id se refuerza en memoria (PostgREST no
    // permite bien or() mezclando columna de padre + hija embebida).
    if (alcanceProvincial) {
      // Traemos un lote amplio y paginamos en memoria tras el refuerzo
      // (acentos + asociacion_id). Volúmenes provinciales son chicos.
      query = query.ilike(
        "lugar_residencia",
        `%${alcanceProvincial.provincia}%`,
      );
    }

    const rangeTo = alcanceProvincial ? 499 : to;
    const rangeFrom = alcanceProvincial ? 0 : from;

    const { data, error, count } = await query.range(rangeFrom, rangeTo);
    if (error) {
      console.error("🔴 Error al obtener licencias por perfil:", error);
      throw new Error(error.message || "Error al listar licencias");
    }

    let rows = data || [];

    if (alcanceProvincial) {
      const target = normalizarTexto(alcanceProvincial.provincia);
      const asocId = alcanceProvincial.asociacionId;

      if (asocId) {
        const { data: extra } = await supabaseAdmin
          .from("perfiles")
          .select(
            "*, licencias:licencias!fk_licencias_usuario!inner(*), afiliaciones:afiliaciones!fk_afiliaciones_usuario(id, entidad, estado, fecha_vencimiento)",
          )
          .eq("licencias.asociacion_id", asocId)
          .order("created_at", { ascending: false })
          .range(0, 499);

        const byId = new Map<string, (typeof rows)[number]>();
        for (const r of rows) byId.set(r.id, r);
        for (const r of extra || []) byId.set(r.id, r);
        rows = [...byId.values()];
      }

      rows = rows.filter((perfil) => {
        const licencias = Array.isArray(perfil.licencias)
          ? perfil.licencias
          : perfil.licencias
            ? [perfil.licencias]
            : [];
        if (
          asocId &&
          licencias.some(
            (l: { asociacion_id?: string | null }) =>
              l.asociacion_id === asocId,
          )
        ) {
          return true;
        }
        return normalizarTexto(perfil.lugar_residencia) === target;
      });

      if (estado) {
        rows = rows.filter((perfil) =>
          jugadorCoincideEstadoLicencia(
            normalizarPerfilLicencias(perfil),
            estado,
          ),
        );
      }

      rows = rows.map((perfil) => normalizarPerfilLicencias(perfil));

      const total = rows.length;
      const resumen = await LicenciaService.resumenEstados(
        search,
        alcanceProvincial,
      );
      return { data: rows.slice(from, to + 1), total, resumen };
    }

    rows = rows.map((perfil) => normalizarPerfilLicencias(perfil));

    const resumen = await LicenciaService.resumenEstados(search, null);
    return {
      data: rows,
      total: count || 0,
      resumen,
    };
  }

  /**
   * Cuenta jugadores por estado leyendo solo la tabla de licencias.
   * Evita recorrer todo el padrón de perfiles en cada apertura del tablero.
   */
  private static async resumenDesdeTablaLicencias() {
    const porJugador = new Map<
      string,
      { estado?: string | null; fecha_vencimiento?: string | null }[]
    >();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("licencias")
        .select("usuario_id, estado, fecha_vencimiento")
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message || "Error al resumir licencias");
      for (const row of data || []) {
        const id = String(row.usuario_id || "");
        if (!id) continue;
        const lista = porJugador.get(id) || [];
        const efectivo = aplicarEstadoEfectivoLicencia({
          estado: row.estado as string | null,
          fecha_vencimiento: row.fecha_vencimiento as string | null,
        });
        lista.push({
          estado: efectivo.estado,
          fecha_vencimiento: row.fecha_vencimiento as string | null,
        });
        porJugador.set(id, lista);
      }
      if (!data || data.length < pageSize) break;
    }
    return resumirLicenciasPorJugador(
      [...porJugador.values()].map((licencias) => ({ licencias })),
    );
  }

  /**
   * Cuenta jugadores por estado de licencia en todo el alcance, sin paginar
   * y sin el filtro de una pestaña. Es la misma cifra que muestra el listado.
   */
  private static async resumenEstados(
    search: string | undefined,
    alcanceProvincial: {
      asociacionId: string | null;
      provincia: string;
    } | null,
  ) {
    if (!search?.trim() && !alcanceProvincial) {
      return LicenciaService.resumenDesdeTablaLicencias();
    }

    const select =
      "id, lugar_residencia, licencias:licencias!fk_licencias_usuario!inner(estado, asociacion_id, fecha_vencimiento)";

    const filas: Array<{
      id: string;
      lugar_residencia?: string | null;
      licencias?:
        | { estado?: string | null; asociacion_id?: string | null }
        | { estado?: string | null; asociacion_id?: string | null }[];
    }> = [];
    const idsNro =
      search?.trim() ?
        await usuarioIdsPorBusquedaNroLicencia(search)
      : [];

    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      let query = supabaseAdmin.from("perfiles").select(select);
      if (search?.trim()) {
        const quoted = terminoIlikePostgrest(search);
        query = query.or(orBusquedaJugadoresLicencias(quoted, idsNro));
      }
      if (alcanceProvincial) {
        query = query.ilike(
          "lugar_residencia",
          `%${alcanceProvincial.provincia}%`,
        );
      }
      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw new Error(error.message || "Error al resumir licencias");
      filas.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }

    let rows = filas;
    if (alcanceProvincial) {
      const target = normalizarTexto(alcanceProvincial.provincia);
      const asocId = alcanceProvincial.asociacionId;
      if (asocId) {
        const { data: extra, error } = await supabaseAdmin
          .from("perfiles")
          .select(select)
          .eq("licencias.asociacion_id", asocId);
        if (error) throw new Error(error.message || "Error al resumir licencias");
        const byId = new Map(rows.map((row) => [row.id, row]));
        for (const row of extra || []) byId.set(row.id, row);
        rows = [...byId.values()];
      }

      rows = rows.filter((perfil) => {
        const licencias = Array.isArray(perfil.licencias)
          ? perfil.licencias
          : perfil.licencias
            ? [perfil.licencias]
            : [];
        if (
          asocId &&
          licencias.some((licencia) => licencia.asociacion_id === asocId)
        ) {
          return true;
        }
        return normalizarTexto(perfil.lugar_residencia) === target;
      });
    }

    return resumirLicenciasPorJugador(rows);
  }

  /**
   * Valida que un admin_provincial solo pueda operar sobre licencias
   * de su asociación / provincia.
   */
  static async assertPuedeGestionarLicencia(
    licenciaId: string,
    actor: { id: string; rol: string },
  ): Promise<void> {
    if (actor.rol !== "admin_provincial") return;

    const asoc =
      await LicenciaOrganizacionService.resolverAsociacionProvincial(actor.id);

    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("id, asociacion_id, datos_solicitud, usuario_id")
      .eq("id", licenciaId)
      .maybeSingle();

    if (error || !licencia) {
      throw new Error("Licencia no encontrada.");
    }

    if (licencia.asociacion_id && asoc.asociacionId === licencia.asociacion_id) {
      return;
    }

    const datos = (licencia.datos_solicitud || {}) as Record<string, unknown>;
    const provinciaSolicitud =
      typeof datos.provincia === "string" ? datos.provincia : "";

    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("lugar_residencia")
      .eq("id", licencia.usuario_id)
      .maybeSingle();

    const target = normalizarTexto(asoc.provincia);
    if (
      normalizarTexto(provinciaSolicitud) === target ||
      normalizarTexto(perfil?.lugar_residencia) === target
    ) {
      return;
    }

    throw new Error(
      "No podés gestionar licencias fuera de tu asociación provincial.",
    );
  }

  static async obtenerPorUsuario(usuario_id: string) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("usuario_id", usuario_id)
      .single();

    if (error || !data)
      throw new Error("Licencia no encontrada para este usuario.");

    const datos = (data.datos_solicitud || {}) as Record<string, unknown>;
    return aplicarEstadoEfectivoLicencia({
      ...data,
      precio_anual: Number(datos.precio_anual ?? 0),
      estado_pago: (datos.estado_pago as string) || "no_aplica",
    });
  }

  static async crearLicencia(
    usuario_id: string,
    nro_licencia: string,
    estado: string,
  ) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .insert([
        {
          usuario_id,
          nro_licencia,
          estado,
          fecha_emision: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async renovar(id: string) {
    const { data: licencia, error: readError } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", id)
      .single();

    if (readError || !licencia) {
      throw new Error("Licencia no encontrada para renovar.");
    }

    const fechaVencimiento =
      await LicenciaOrganizacionService.calcularVencimientoParaLicencia(
        licencia,
      );

    const { data, error } = await supabaseAdmin
      .from("licencias")
      .update({
        fecha_vencimiento: fechaVencimiento,
        estado: "Activa",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async verificar(usuario_id: string) {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select(
        "estado, nro_licencia, fecha_vencimiento, perfiles!fk_licencias_usuario(nombre, apellido)",
      )
      .eq("usuario_id", usuario_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) throw new Error("Licencia no encontrada");

    return aplicarEstadoEfectivoLicencia(data);
  }

  private static async obtenerLicenciaParaVerificacionPublica(
    uid: string,
    licenciaId?: string | null,
  ): Promise<{
    id: string;
    usuario_id: string;
    estado: string | null;
    nro_licencia: string | null;
    fecha_vencimiento: string | null;
    datos_solicitud: Record<string, unknown> | null;
    perfiles:
      | {
          nombre?: string | null;
          apellido?: string | null;
          dni?: string | null;
          es_menor?: boolean | null;
        }
      | null;
  } | null> {
    const selectConPerfil =
      "id, usuario_id, estado, nro_licencia, fecha_vencimiento, datos_solicitud, perfiles!fk_licencias_usuario(nombre, apellido, dni, es_menor)";

    let query = supabaseAdmin.from("licencias").select(selectConPerfil);
    if (licenciaId) {
      query = query
        .eq("id", String(licenciaId).trim())
        .eq("usuario_id", uid);
    } else {
      query = query
        .eq("usuario_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data && String(data.usuario_id) === uid) {
      const perfilRaw = data.perfiles as
        | {
            nombre?: string | null;
            apellido?: string | null;
            dni?: string | null;
            es_menor?: boolean | null;
          }
        | {
            nombre?: string | null;
            apellido?: string | null;
            dni?: string | null;
            es_menor?: boolean | null;
          }[]
        | null;
      const perfil = Array.isArray(perfilRaw) ? perfilRaw[0] : perfilRaw;
      return {
        id: String(data.id),
        usuario_id: String(data.usuario_id),
        estado: data.estado ?? null,
        nro_licencia: data.nro_licencia ?? null,
        fecha_vencimiento: data.fecha_vencimiento ?? null,
        datos_solicitud: (data.datos_solicitud as Record<string, unknown>) ?? null,
        perfiles: perfil ?? null,
      };
    }

    let queryBase = supabaseAdmin
      .from("licencias")
      .select(
        "id, usuario_id, estado, nro_licencia, fecha_vencimiento, datos_solicitud",
      );
    if (licenciaId) {
      queryBase = queryBase
        .eq("id", String(licenciaId).trim())
        .eq("usuario_id", uid);
    } else {
      queryBase = queryBase
        .eq("usuario_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    const { data: licenciaSola, error: errorSola } =
      await queryBase.maybeSingle();
    if (errorSola || !licenciaSola || String(licenciaSola.usuario_id) !== uid) {
      return null;
    }

    const { data: perfilSolo } = await supabaseAdmin
      .from("perfiles")
      .select("nombre, apellido, dni, es_menor")
      .eq("id", uid)
      .maybeSingle();

    return {
      id: String(licenciaSola.id),
      usuario_id: String(licenciaSola.usuario_id),
      estado: licenciaSola.estado ?? null,
      nro_licencia: licenciaSola.nro_licencia ?? null,
      fecha_vencimiento: licenciaSola.fecha_vencimiento ?? null,
      datos_solicitud:
        (licenciaSola.datos_solicitud as Record<string, unknown>) ?? null,
      perfiles: perfilSolo ?? null,
    };
  }

  /**
   * Verificación pública del carné (QR). No expone email ni DNI completo.
   */
  static async verificarPublica(
    usuarioId: string,
    licenciaId?: string | null,
    actor?: { rol?: string | null } | null,
  ): Promise<VerificacionLicenciaPublica> {
    const uid = String(usuarioId || "").trim();
    if (!uid) {
      return respuestaLicenciaNoValida("Identificador de jugador no válido.");
    }

    const data =
      await LicenciaService.obtenerLicenciaParaVerificacionPublica(
        uid,
        licenciaId,
      );

    if (!data) {
      return respuestaLicenciaNoValida();
    }

    const perfil = data.perfiles;

    const { estado, valida } = resolverEstadoLicenciaPublica(
      data.estado,
      data.fecha_vencimiento,
    );

    const fechaVencimiento = data.fecha_vencimiento
      ? String(data.fecha_vencimiento)
      : null;

    const esMenor = perfil?.es_menor === true;
    const consultaAutorizada = esRolAccesoCrm(actor?.rol);
    const mostrarIdentidad = exponeIdentidadVerificacionPublica(
      esMenor,
      consultaAutorizada,
    );
    const identidadReservadaMenor = esMenor && !mostrarIdentidad;
    const nombre = mostrarIdentidad
      ? perfil?.nombre?.trim() || null
      : null;
    const apellido = mostrarIdentidad
      ? perfil?.apellido?.trim() || null
      : null;
    const titular =
      apellido && nombre
        ? `${apellido.toUpperCase()}, ${nombre}`
        : apellido || nombre;

    return {
      valida,
      estado,
      nombre,
      apellido,
      titular,
      dni_parcial: mostrarIdentidad ? enmascararDni(perfil?.dni) : null,
      nro_licencia: data.nro_licencia ? String(data.nro_licencia) : null,
      fecha_vencimiento: fechaVencimiento,
      fecha_vencimiento_texto: fechaLatina(fechaVencimiento),
      mensaje: mensajeVerificacionLicenciaPublica(
        estado,
        data.datos_solicitud,
      ),
      identidad_reservada_menor: identidadReservadaMenor,
    };
  }

  private static async registrarAuditoriaLicencia(
    licenciaId: string,
    adminId: string | undefined,
    accion: string,
    detalles: Record<string, unknown>,
  ): Promise<void> {
    if (!adminId) return;
    const { error } = await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion,
      entidad_afectada: `licencia_id: ${licenciaId}`,
      detalles,
    });
    if (error) {
      console.error("No se pudo registrar auditoría de licencia:", error.message);
    }
  }

  static async listarHistorialLicencia(
    licenciaId: string,
    actor?: { id: string; rol: string },
  ) {
    if (actor) {
      await LicenciaService.assertPuedeGestionarLicencia(licenciaId, actor);
    }

    const { data, error } = await supabaseAdmin
      .from("logs_auditoria")
      .select("id, accion, detalles, created_at, usuario_id_admin")
      .eq("entidad_afectada", `licencia_id: ${licenciaId}`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      throw new Error("No se pudo cargar el historial de la licencia.");
    }

    const filas = data ?? [];
    const adminIds = [
      ...new Set(
        filas
          .map((r) => r.usuario_id_admin)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];

    const nombresAdmin = new Map<string, string>();
    if (adminIds.length > 0) {
      const { data: perfiles } = await supabaseAdmin
        .from("perfiles")
        .select("id, nombre, apellido, email")
        .in("id", adminIds);
      for (const p of perfiles ?? []) {
        const etiqueta = [p.nombre, p.apellido]
          .filter(Boolean)
          .join(" ")
          .trim();
        nombresAdmin.set(
          p.id,
          etiqueta || (typeof p.email === "string" ? p.email : "Administrador"),
        );
      }
    }

    return filas.map((fila) => ({
      ...fila,
      admin_nombre: fila.usuario_id_admin
        ? nombresAdmin.get(fila.usuario_id_admin) ?? null
        : null,
    }));
  }

  static async actualizarEstado(
    id: string,
    estado: string,
    fechaVencimientoOverride?: string,
    contexto?: { motivo?: string; adminId?: string },
  ) {
    // 1. Obtener la licencia actual para saber el estado previo y usuario
    const { data: licenciaPrevia, error: readError } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", id)
      .single();

    if (readError || !licenciaPrevia) {
      throw new Error("No se encontró la licencia para actualizar o el estado es inválido.");
    }

    const estadoPrevio = licenciaPrevia.estado;
    const estadoSolicitado = normalizarEstadoAlmacenadoLicencia(estado);
    const estadoPreviaNorm = normalizarEstadoAlmacenadoLicencia(estadoPrevio);
    const estadoEfectivoPrevio = estadoEfectivoLicencia(
      licenciaPrevia.estado,
      licenciaPrevia.fecha_vencimiento,
    );
    const esAprobacionInicial =
      estadoSolicitado === "Activa" && estadoPreviaNorm === "Pendiente";
    const esReactivacion =
      estadoSolicitado === "Activa" &&
      estadoEfectivoPrevio !== "Activa" &&
      estadoEfectivoPrevio !== "Pendiente";
    const usuario_id = licenciaPrevia.usuario_id;
    let data = { ...licenciaPrevia, estado };

    const motivoSuspension =
      estadoSolicitado === "Suspendida" && estadoPreviaNorm !== "Pendiente"
        ? contexto?.motivo?.trim() ?? ""
        : "";
    if (
      estadoSolicitado === "Suspendida" &&
      estadoPreviaNorm !== "Pendiente" &&
      motivoSuspension.length < 3
    ) {
      throw new Error(
        "Indicá el motivo de la suspensión (mínimo 3 caracteres).",
      );
    }

    const fechaVencimientoCalculada =
      await LicenciaOrganizacionService.calcularVencimientoParaLicencia(
        licenciaPrevia,
      );
    const fechaVencimiento =
      fechaVencimientoOverride || fechaVencimientoCalculada;

    // 2. Si es Rechazo (de Pendiente a Suspendida)
    if (estado === "Suspendida" && estadoPrevio === "Pendiente") {
      // Notificar al usuario sobre el rechazo
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Solicitud de alta rechazada",
        mensaje: "Tu solicitud de alta para la licencia deportiva fue rechazada. Puedes volver a iniciar el trámite desde tu perfil.",
        tipo: "error"
      });

      // Eliminar inmediatamente la fila de la base de datos
      const { error: deleteError } = await supabaseAdmin
        .from("licencias")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("🔴 Error al eliminar licencia rechazada:", deleteError);
        throw new Error("Error al eliminar la licencia rechazada.");
      }

      return data;
    }

    // 3. Si no es rechazo, actualizamos normalmente
    const updateData: Record<string, any> = { estado };

    if (motivoSuspension) {
      const datosSol = (licenciaPrevia.datos_solicitud || {}) as Record<
        string,
        unknown
      >;
      updateData.datos_solicitud = {
        ...datosSol,
        ultima_suspension: {
          motivo: motivoSuspension,
          fecha: new Date().toISOString(),
          admin_id: contexto?.adminId ?? null,
        },
      };
    }

    if (esAprobacionInicial || esReactivacion) {
      // Alta inicial o reactivación: emisión y vigencia según configuración
      updateData.fecha_emision = new Date().toISOString().split("T")[0];
      updateData.fecha_vencimiento = fechaVencimiento;
    } else if (fechaVencimientoOverride) {
      updateData.fecha_vencimiento = fechaVencimientoOverride;
      const solicitud = normalizarEstadoAlmacenadoLicencia(estado);
      const baseEstado =
        solicitud === "Suspendida" ? "Suspendida" : estadoPrevio;
      updateData.estado = reconciliarEstadoAlmacenadoConVencimiento(
        baseEstado,
        fechaVencimientoOverride,
      );
    } else if (estado === "Activa" && estadoPrevio === "Activa") {
      // Mismo estado, sin override de fecha → no tocar fechas
    }

    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from("licencias")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedData) {
      throw new Error("Error al actualizar el estado de la licencia.");
    }

    data = aplicarEstadoEfectivoLicencia(updatedData);

    // 4. Emitir notificaciones para otros cambios de estado
    if (esAprobacionInicial) {
      const vence = fechaLatina(data.fecha_vencimiento);
      const datosSolPago = (data.datos_solicitud || {}) as Record<
        string,
        unknown
      >;
      const montoPendiente = montoLicenciaDesdeSolicitud(datosSolPago);
      const pagoPendiente =
        String(datosSolPago.estado_pago || "") === "pendiente" &&
        montoPendiente > 0;
      const avisoPago = pagoPendiente
        ? ` Completá el pago de $${montoPendiente.toLocaleString("es-AR")} desde Mi panel.`
        : "";
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Licencia aprobada",
        mensaje: `¡Felicidades! Tu licencia N° ${data.nro_licencia} fue aprobada. Vence el ${vence}. Ya podés ver tu carnet digital.${avisoPago}`,
        tipo: "success",
        metadata: {
          nro_licencia: data.nro_licencia,
          licencia_id: data.id,
          fecha_vencimiento: data.fecha_vencimiento,
          estado_pago: datosSolPago.estado_pago ?? null,
        },
      });
    } else if (esReactivacion) {
      await LicenciaService.registrarAuditoriaLicencia(
        id,
        contexto?.adminId,
        "reactivar_licencia",
        {
          estado_previo: estadoEfectivoPrevio,
          estado_nuevo: "Activa",
          nro_licencia: data.nro_licencia,
          usuario_id,
        },
      );
      const vence = fechaLatina(data.fecha_vencimiento);
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Licencia reactivada",
        mensaje: `Tu licencia N° ${data.nro_licencia} fue reactivada. Vence el ${vence}. Ya podés usar tu carnet digital.`,
        tipo: "success",
        metadata: {
          nro_licencia: data.nro_licencia,
          licencia_id: data.id,
          fecha_vencimiento: data.fecha_vencimiento,
        },
      });
    } else if (
      estadoSolicitado === "Suspendida" &&
      estadoPreviaNorm !== "Pendiente"
    ) {
      await LicenciaService.registrarAuditoriaLicencia(
        id,
        contexto?.adminId,
        "suspender_licencia",
        {
          motivo: motivoSuspension,
          estado_previo: estadoPrevio,
          estado_nuevo: "Suspendida",
          nro_licencia: data.nro_licencia,
          usuario_id,
        },
      );
      await NotificacionService.crearNotificacion({
        usuario_id,
        titulo: "Licencia suspendida",
        mensaje: `Tu licencia N° ${data.nro_licencia} fue suspendida. Motivo: ${motivoSuspension}`,
        tipo: "error",
        metadata: {
          nro_licencia: data.nro_licencia,
          licencia_id: data.id,
          motivo: motivoSuspension,
        },
      });
    }

    const fechaAnteriorNorm = String(licenciaPrevia.fecha_vencimiento || "").split(
      "T",
    )[0];
    if (
      fechaVencimientoOverride &&
      contexto?.adminId &&
      fechaAnteriorNorm !== fechaVencimientoOverride
    ) {
      await LicenciaService.registrarAuditoriaLicencia(
        id,
        contexto?.adminId,
        "cambiar_vencimiento_licencia",
        {
          fecha_anterior: fechaAnteriorNorm || null,
          fecha_nueva: fechaVencimientoOverride,
          nro_licencia: data.nro_licencia,
          usuario_id,
        },
      );
    }

    // 5. Si se activa o se suspende, actualizamos la afiliación correspondiente
    if (data.datos_solicitud) {
      const datosSol = data.datos_solicitud as Record<string, unknown>;
      const clubId =
        typeof datosSol.club_id === "string" ? datosSol.club_id : null;

      if (clubId) {
        try {
          if (estado === "Activa") {
            const { AfiliacionService } = await import(
              "./afiliacion.service"
            );
            await AfiliacionService.upsertActivaPorClub({
              usuarioId: data.usuario_id,
              clubId,
              fechaVencimiento: data.fecha_vencimiento || fechaVencimiento,
            });
          } else if (estado === "Suspendida") {
            await supabaseAdmin
              .from("afiliaciones")
              .update({ estado: "suspendido" })
              .eq("usuario_id", data.usuario_id)
              .eq("club_id", clubId);
          }
        } catch (err) {
          console.error(
            "Error al registrar/actualizar afiliación en cambio de estado:",
            err,
          );
        }
      }
    }

    return data;
  }

  /**
   * Baja definitiva del carnet (distinto de suspender o rechazar solicitud pendiente).
   */
  static async darDeBajaLicencia(id: string) {
    const { data: licencia, error: readError } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", id)
      .single();

    if (readError || !licencia) {
      throw new Error("No se encontró la licencia.");
    }

    if (licencia.estado === "Pendiente") {
      throw new Error(
        "Para una solicitud pendiente usá «Rechazar solicitud» en el panel de validación.",
      );
    }

    const usuario_id = licencia.usuario_id;
    const nro = licencia.nro_licencia;

    await NotificacionService.crearNotificacion({
      usuario_id,
      titulo: "Licencia dada de baja",
      mensaje: `Tu licencia N° ${nro} fue dada de baja de forma definitiva. Podés iniciar un nuevo trámite desde tu perfil si corresponde.`,
      tipo: "error",
      metadata: { nro_licencia: nro, licencia_id: licencia.id },
    });

    const datosSol = licencia.datos_solicitud as Record<string, unknown> | null;
    const clubId =
      datosSol && typeof datosSol.club_id === "string" ? datosSol.club_id : null;
    if (clubId) {
      await supabaseAdmin
        .from("afiliaciones")
        .update({ estado: "suspendido" })
        .eq("usuario_id", usuario_id)
        .eq("club_id", clubId);
    }

    const { error: deleteError } = await supabaseAdmin
      .from("licencias")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw new Error("No se pudo dar de baja la licencia.");
    }

    return { id, usuario_id, nro_licencia: nro };
  }

  static async solicitar(usuario_id: string, datos: Record<string, unknown>) {
    const config =
      await LicenciaOrganizacionService.resolverConfigParaLicencia({
        datos_solicitud: datos,
        club_id: typeof datos.club_id === "string" ? datos.club_id : null,
      });

    const esMensual = config.frecuenciaPago === "mensual";
    const precio = esMensual
      ? Number(config.precioMensual || 0)
      : Number(config.precioAnual || 0);

    const datosConPago = {
      ...datos,
      precio_anual: Number(config.precioAnual || 0),
      precio_mensual: Number(config.precioMensual || 0),
      frecuencia_pago: config.frecuenciaPago,
      nombre_carne: config.nombreCarne,
      estado_pago: precio > 0 ? "pendiente" : "no_aplica",
      moneda: "ARS",
    };

    let asociacionId: string | null = null;
    const clubId = typeof datos.club_id === "string" ? datos.club_id : null;
    if (clubId) {
      const { data: club } = await supabaseAdmin
        .from("clubes")
        .select("asociacion_id")
        .eq("id", clubId)
        .maybeSingle();
      asociacionId = club?.asociacion_id ?? null;
    }
    if (!asociacionId && typeof datos.provincia === "string") {
      const { data: asoc } = await supabaseAdmin
        .from("asociaciones")
        .select("id")
        .ilike("provincia", datos.provincia.trim())
        .limit(1)
        .maybeSingle();
      asociacionId = asoc?.id ?? null;
    }

    const { data, error } = await supabaseAdmin
      .from("licencias")
      .insert([
        {
          usuario_id,
          estado: "Pendiente",
          nro_licencia: `PAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          datos_solicitud: datosConPago,
          club_id: clubId,
          asociacion_id: asociacionId,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);

    NotificacionService.notificarAdmins({
      titulo: "Nueva solicitud de licencia",
      mensaje: `${datos.nombre} ${datos.apellido} ha solicitado una nueva licencia deportiva.`,
      tipo: "info",
    }).catch((err) =>
      console.error("Error al notificar admins de nueva licencia:", err),
    );

    const etiqueta = esMensual ? "mensual" : "anual";
    const mensajePago =
      precio > 0
        ? `Completá el pago ${etiqueta} de $${precio.toLocaleString("es-AR")} para continuar con la revisión.`
        : "Un administrador revisará tu solicitud pronto.";

    NotificacionService.crearNotificacion({
      usuario_id,
      titulo: "Solicitud de licencia recibida",
      mensaje: `Tu carnet ${data.nro_licencia} quedó en estado pendiente. ${mensajePago}`,
      tipo: "info",
      metadata: {
        tipo: "licencia",
        licencia_id: data.id,
        nro_licencia: data.nro_licencia,
        precio_anual: Number(config.precioAnual || 0),
        precio_mensual: Number(config.precioMensual || 0),
        frecuencia_pago: config.frecuenciaPago,
      },
    }).catch((err) =>
      console.error("Error al notificar jugador de solicitud:", err),
    );

    return {
      ...data,
      precio_anual: Number(config.precioAnual || 0),
      precio_mensual: Number(config.precioMensual || 0),
      frecuencia_pago: config.frecuenciaPago,
      estado_pago: datosConPago.estado_pago,
    };
  }

  static async cotizar(params: {
    club_id?: string | null;
    provincia?: string | null;
  }) {
    const config =
      await LicenciaOrganizacionService.resolverConfigParaLicencia({
        datos_solicitud: {
          club_id: params.club_id || undefined,
          provincia: params.provincia || undefined,
        },
        club_id: params.club_id || null,
      });

    const transferencia = resolverDatosTransferenciaLicencia(config);
    return {
      precio_anual: Number(config.precioAnual || 0),
      precio_mensual: Number(config.precioMensual || 0),
      frecuencia_pago: config.frecuenciaPago,
      nombre_carne: config.nombreCarne,
      dia_cobro: config.diaCobro,
      moneda: "ARS",
      vigencia_modo: config.vigenciaModo,
      descripcion_vigencia: descripcionVigenciaLicencia(config),
      origen: config.origen,
      transferencia_disponible:
        transferenciaLicenciaDisponible(transferencia),
    };
  }

  private static async resolverPagoLicenciaJugador(
    licenciaId: string,
    usuarioId: string,
    opts?: { persistirMontos?: boolean },
  ) {
    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", licenciaId)
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !licencia) throw new Error("Licencia no encontrada.");

    const datos = (licencia.datos_solicitud || {}) as Record<string, unknown>;
    const config =
      await LicenciaOrganizacionService.resolverConfigParaLicencia(licencia);

    let precio = montoLicenciaDesdeSolicitud(datos, config);

    if (precio <= 0) {
      precio = montoLicenciaDesdeSolicitud(
        {
          frecuencia_pago: config.frecuenciaPago,
          precio_anual: config.precioAnual,
          precio_mensual: config.precioMensual,
        },
        config,
      );
    }

    if (precio > 0 && opts?.persistirMontos !== false) {
      const datosActualizados = {
        ...datos,
        precio_anual: Number(config.precioAnual || datos.precio_anual || 0),
        precio_mensual: Number(
          config.precioMensual || datos.precio_mensual || 0,
        ),
        frecuencia_pago:
          datos.frecuencia_pago || config.frecuenciaPago || "anual",
        estado_pago:
          datos.estado_pago === "pagado" ? "pagado" : "pendiente",
        moneda: "ARS",
      };
      await supabaseAdmin
        .from("licencias")
        .update({ datos_solicitud: datosActualizados })
        .eq("id", licenciaId);
      Object.assign(datos, datosActualizados);
    }

    if (precio <= 0) {
      throw new Error("Esta licencia no tiene un monto pendiente de pago.");
    }
    if (datos.estado_pago === "pagado") {
      throw new Error("El pago de esta licencia ya fue registrado.");
    }

    const transferencia = resolverDatosTransferenciaLicencia(config);
    const transferencia_disponible =
      transferenciaLicenciaDisponible(transferencia);
    const instrucciones = transferencia_disponible
      ? textoInstruccionesPagoLicencia({
          monto: precio,
          nroLicencia: String(licencia.nro_licencia || licenciaId),
          ...transferencia,
        })
      : null;

    return {
      licencia,
      precio,
      config,
      transferencia,
      transferencia_disponible,
      instrucciones,
    };
  }

  static async obtenerDatosTransferenciaLicencia(
    licenciaId: string,
    usuarioId: string,
  ) {
    const ctx = await LicenciaService.resolverPagoLicenciaJugador(
      licenciaId,
      usuarioId,
      { persistirMontos: false },
    );

    return {
      transferencia_disponible: ctx.transferencia_disponible,
      monto: ctx.precio,
      moneda: "ARS",
      referencia: ctx.licencia.nro_licencia,
      instrucciones: ctx.instrucciones,
      ...ctx.transferencia,
    };
  }

  static async crearPreferenciaPago(
    licenciaId: string,
    usuarioId: string,
    options?: { mobile?: boolean },
  ) {
    const {
      licencia,
      precio,
      transferencia,
      transferencia_disponible,
      instrucciones,
    } = await LicenciaService.resolverPagoLicenciaJugador(
      licenciaId,
      usuarioId,
    );

    const token = getMercadoPagoAccessToken();
    if (!isMercadoPagoConfigured()) {
      if (permitirMockMercadoPagoLicencia()) {
        console.warn(
          "MP Access Token no configurado. Simulando pago de licencia (solo dev).",
        );
        const mockPaymentId = `mock-licencia-${Date.now()}`;
        const actualizada = await LicenciaService.confirmarPagoLicencia(
          licenciaId,
          usuarioId,
          mockPaymentId,
          precio,
        );
        return {
          preferenceId: "mock-licencia-pref",
          initPoint: null,
          sandboxInitPoint: null,
          mockConfirmed: true,
          paymentId: mockPaymentId,
          licencia: actualizada,
          monto: precio,
          moneda: "ARS",
          referencia: licencia.nro_licencia,
          instrucciones,
          pagoAlternativo: false,
          transferencia_disponible,
          ...transferencia,
        };
      }

      return {
        preferenceId: null,
        initPoint: null,
        sandboxInitPoint: null,
        mockConfirmed: false,
        pagoAlternativo: true,
        monto: precio,
        moneda: "ARS",
        referencia: licencia.nro_licencia,
        instrucciones,
        transferencia_disponible,
        ...transferencia,
      };
    }

    const mpClient = new MercadoPagoConfig({ accessToken: token! });
    const preference = new Preference(mpClient);
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

    const backUrls = buildMercadoPagoBackUrls({
      mobile: options?.mobile,
      webPath: "/mi-perfil",
      mobileParams: { licencia_id: licenciaId },
    });

    const response = await preference.create({
      body: {
        items: [
          {
            id: licenciaId,
            title: `Licencia FAP ${licencia.nro_licencia}`,
            quantity: 1,
            unit_price: precio,
            currency_id: "ARS",
          },
        ],
        back_urls: backUrls,
        auto_return: backUrls.success.startsWith("https://")
          ? "approved"
          : undefined,
        external_reference: `licencia:${licenciaId}`,
        notification_url: `${backendUrl}/api/licencias/webhook/mercadopago`,
      },
    });

    return {
      preferenceId: response.id,
      initPoint: resolveMercadoPagoInitPoint(
        token!,
        response.init_point,
        response.sandbox_init_point,
      ),
      sandboxInitPoint: response.sandbox_init_point,
      mockConfirmed: false,
      pagoAlternativo: false,
      monto: precio,
      moneda: "ARS",
      referencia: licencia.nro_licencia,
      instrucciones,
      transferencia_disponible,
      ...transferencia,
    };
  }

  static async confirmarPagoLicencia(
    licenciaId: string,
    usuarioId: string,
    paymentId: string,
    monto?: number,
  ) {
    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", licenciaId)
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !licencia) throw new Error("Licencia no encontrada.");

    const previos = (licencia.datos_solicitud || {}) as Record<string, unknown>;
    const datos: Record<string, unknown> = {
      ...previos,
      estado_pago: "pagado",
      mp_payment_id: paymentId,
      fecha_pago: new Date().toISOString(),
      ...(monto != null ? { monto_pagado: monto } : {}),
    };

    const { data, error: updError } = await supabaseAdmin
      .from("licencias")
      .update({ datos_solicitud: datos })
      .eq("id", licenciaId)
      .select()
      .single();

    if (updError || !data) {
      throw new Error("No se pudo registrar el pago de la licencia.");
    }

    await NotificacionService.crearNotificacion({
      usuario_id: usuarioId,
      titulo: "Pago de licencia recibido",
      mensaje: `Registramos el pago de tu licencia ${data.nro_licencia}. Queda pendiente la aprobación de la federación.`,
      tipo: "success",
      metadata: {
        tipo: "licencia",
        licencia_id: data.id,
        nro_licencia: data.nro_licencia,
      },
    });

    NotificacionService.notificarAdmins({
      titulo: "Pago de licencia acreditado",
      mensaje: `El jugador pagó la licencia ${data.nro_licencia}. Revisá y aprobá el alta.`,
      tipo: "info",
      metadata: { licencia_id: data.id },
    }).catch(() => undefined);

    return {
      ...data,
      precio_anual: Number(datos.precio_anual || 0),
      estado_pago: "pagado",
    };
  }

  /**
   * Registra un pago manual (anual o mensual) y actualiza la vigencia.
   * Para frecuencia mensual: extiende fecha_vencimiento según dia_cobro.
   */
  static async registrarPago(
    licenciaId: string,
    payload: {
      monto?: number;
      periodo?: string;
      metodo?: string;
      notas?: string;
      mp_payment_id?: string;
    },
    adminId?: string,
  ) {
    const { data: licencia, error } = await supabaseAdmin
      .from("licencias")
      .select("*")
      .eq("id", licenciaId)
      .single();

    if (error || !licencia) throw new Error("Licencia no encontrada.");

    const config =
      await LicenciaOrganizacionService.resolverConfigParaLicencia(licencia);

    const ahora = new Date();
    const esMensual = config.frecuenciaPago === "mensual";
    const periodoDefault = periodoDesdeFecha(
      ahora,
      esMensual ? "mensual" : "anual",
    );
    const periodoValido = esMensual
      ? payload.periodo && /^\d{4}-\d{2}$/.test(payload.periodo)
      : payload.periodo && /^\d{4}$/.test(payload.periodo);
    const periodo = periodoValido ? String(payload.periodo) : periodoDefault;

    const montoDefault =
      config.frecuenciaPago === "mensual"
        ? Number(config.precioMensual || 0)
        : Number(config.precioAnual || 0);
    const monto =
      payload.monto != null ? Math.max(0, Number(payload.monto)) : montoDefault;

    const { data: pago, error: pagoError } = await supabaseAdmin
      .from("licencia_pagos")
      .insert({
        licencia_id: licenciaId,
        usuario_id: licencia.usuario_id,
        periodo,
        monto,
        estado: "pagado",
        metodo: payload.metodo || "manual",
        mp_payment_id: payload.mp_payment_id || null,
        registrado_por: adminId || null,
        notas: payload.notas || null,
        pagado_en: ahora.toISOString(),
      })
      .select()
      .single();

    if (pagoError) {
      if (pagoError.code === "23505") {
        throw new Error(
          `Ya existe un pago registrado para el período ${periodo}.`,
        );
      }
      if (
        pagoError.code === "23514" &&
        String(pagoError.message).includes("licencia_pagos_periodo_check")
      ) {
        throw new Error(
          esMensual
            ? "El período no es válido. Para licencias mensuales usá el formato AAAA-MM (ej. 2026-11)."
            : "El período no es válido. Para licencias anuales usá el año AAAA (ej. 2026).",
        );
      }
      throw new Error(pagoError.message);
    }

    // Extender vigencia según frecuencia.
    let fechaVencimiento: string;
    if (config.frecuenciaPago === "mensual") {
      fechaVencimiento = calcularVencimientoTrasPagoMensual(
        config.diaCobro,
        ahora,
      );
    } else {
      fechaVencimiento =
        await LicenciaOrganizacionService.calcularVencimientoParaLicencia(
          licencia,
          ahora,
        );
    }

    const datos = {
      ...((licencia.datos_solicitud || {}) as Record<string, unknown>),
      estado_pago: "pagado",
      fecha_pago: ahora.toISOString(),
      ultimo_periodo_pagado: periodo,
    };

    const updatePayload: Record<string, unknown> = {
      fecha_vencimiento: fechaVencimiento,
      datos_solicitud: datos,
    };
    // Si estaba vencida y pagó, reactivamos.
    if (licencia.estado === "Vencida") {
      updatePayload.estado = "Activa";
    }

    const { data: updated, error: updError } = await supabaseAdmin
      .from("licencias")
      .update(updatePayload)
      .eq("id", licenciaId)
      .select()
      .single();

    if (updError || !updated) {
      throw new Error("Pago registrado pero no se pudo actualizar la vigencia.");
    }

    await NotificacionService.crearNotificacion({
      usuario_id: licencia.usuario_id,
      titulo: "Pago de licencia registrado",
      mensaje: `Se registró el pago del período ${periodo} de tu licencia ${updated.nro_licencia}. Vigente hasta ${fechaLatina(fechaVencimiento)}.`,
      tipo: "success",
      metadata: {
        tipo: "licencia",
        licencia_id: updated.id,
        periodo,
      },
    }).catch(() => undefined);

    return {
      pago,
      licencia: updated,
      fecha_vencimiento: fechaVencimiento,
    };
  }

  static async listarPagos(licenciaId: string) {
    const { data, error } = await supabaseAdmin
      .from("licencia_pagos")
      .select(
        "id, licencia_id, usuario_id, periodo, monto, estado, metodo, mp_payment_id, notas, pagado_en, created_at, registrado_por",
      )
      .eq("licencia_id", licenciaId)
      .order("pagado_en", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
}

import { supabaseAdmin } from "../config/supabase";
import { normalizarPerfilLicencias } from "../utils/estadoLicencia";
import {
  buildPerfilUpdatePatch,
  normalizeFechaNacimiento,
} from "../utils/perfilPatch";
import {
  parseNombreCompleto,
  normalizarDni,
  esEmailPlaceholderPlanilla,
  sanitizarFilaPlanillaInscripcion,
  etiquetaFilaPlanillaExcel,
  resolverLugarResidenciaDesdePlanilla,
  type FilaPlanillaInscripcion,
} from "../utils/inscripcionPlanilla";
import {
  activacionPadronFapDisponible,
  cuentaPendienteActivacionApp,
  coincideEmailPreinscripcion,
  coincideUltimos4Telefono,
  metodosVerificacionPreinscripcion,
  type MetodoVerificacionPreinscripcion,
} from "../utils/preinscripcionVerificacion";
import {
  coincideFechaNacimientoPadron,
  coincidenLicenciasPadron,
  emailValidoPadronOtp,
  normalizarEmailPadronOtp,
  normalizarTelefonoPadronOtp,
  telefonoValidoPadronOtp,
} from "../utils/preinscripcionPadronFap";
import { enviarOtpActivacionPadronResend } from "../utils/preinscripcionOtpEmail";
import { crearOtpPadronFap, validarOtpPadronFap } from "../utils/preinscripcionOtpPadronStore";
import {
  assertDniNoBloqueadoPreinscripcion,
  registrarIntentoFallidoPreinscripcion,
  reiniciarIntentosPreinscripcion,
} from "../utils/preinscripcionBloqueo";
import { emitirTokenActivacionPreinscripcion } from "../utils/preinscripcionTokenActivacion";
import { randomBytes } from "crypto";
import { esVisibleEnSitioPublico } from "../utils/datoPrueba";
import { capitalizarNombre, normalizarNombrePerfil } from "../utils/formatoTexto";
import { sincronizarNombresInscripcionesJugador } from "../utils/sincronizarNombresInscripcionesJugador";
import { ErrorDniFichaDuplicado } from "../utils/errorDniFicha";
import { NotificacionService } from "./notificacion.service";
import {
  CATEGORIAS_LIBRES,
  CATEGORIAS_MENORES,
  CATEGORIAS_VETERANOS,
} from "../constants/rankings";

/** Datos opcionales para alta provisional en inscripción manual (TOR-20). */
export interface DatosAltaJugadorManual {
  nombre?: string;
  apellido?: string;
  categoria_padel?: string;
  fecha_nacimiento?: string;
  telefono?: string;
}

const PERFIL_SELECT_INSCRIPCION_MANUAL =
  "id, nombre, apellido, categoria_padel, fecha_nacimiento, sexo, dni";

export interface PreferenciasNotificacion {
  push: boolean;
  email: boolean;
  whatsapp: boolean;
}

export type OpcionesResolverJugadorPlanilla = {
  /** Categoría por defecto si la fila no trae categoría (p. ej. categoría del torneo). */
  categoriaFallback?: string | null;
  /** Planilla oficial: true (default). Inscripción manual: false para no asumir 5ª. */
  usarFallbackPlanilla5?: boolean;
};

export interface ActualizarPerfilDTO {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  categoria_padel?: string;
  lado_preferido?: string;
  lugar_residencia?: string;
  dni?: string;
  sexo?: string;
  fecha_nacimiento?: string;
  avatar_url?: string;
  preferencias_notificacion?: PreferenciasNotificacion;
}

export class PerfilService {
  /**
   * Obtiene la ficha técnica completa de un jugador con sus licencias y afiliaciones
   */
  static async obtenerPerfilCompleto(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select(
        "*, licencias:licencias!fk_licencias_usuario(*, asociaciones:asociacion_id(id, nombre, sigla, provincia)), afiliaciones:afiliaciones!fk_afiliaciones_usuario(*, asociaciones:asociacion_id(id, nombre, sigla)), clubes:clubes!perfiles_club_id_fkey(id, nombre)",
      )
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("🔴 ERROR EN OBTENER_PERFIL_COMPLETO:", error);
      throw new Error("Perfil de usuario no encontrado en la plataforma.");
    }

        if (data.nombre?.toLowerCase() === "federacion") {
      data.nombre = "Federación";
    }
    if (data.apellido === "N" && data.nombre?.toLowerCase().startsWith("federaci")) {
      data.nombre = "Federación Nacional";
      data.apellido = "";
    }

    const perfilSincronizado = await PerfilService.sincronizarMetadataFaltante(
      userId,
      data,
    );

    // Mapear fecha_vencimiento a vencimiento para cumplir con la documentación de Afiliaciones Múltiples (1:N)
    if (perfilSincronizado.afiliaciones && Array.isArray(perfilSincronizado.afiliaciones)) {
      perfilSincronizado.afiliaciones = perfilSincronizado.afiliaciones.map((af: any) => ({
        ...af,
        vencimiento: af.fecha_vencimiento,
      }));
    }

    return normalizarPerfilLicencias(perfilSincronizado);
  }

  /**
   * Completa campos del perfil desde user_metadata cuando el trigger de auth no los copió.
   */
  static async sincronizarMetadataFaltante(
    userId: string,
    perfil: Record<string, unknown>,
  ) {
    const necesitaFecha = !perfil.fecha_nacimiento;
    const necesitaSexo = !perfil.sexo;

    if (!necesitaFecha && !necesitaSexo) {
      return perfil;
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (authError || !authData.user) {
      return perfil;
    }

    const metadata = authData.user.user_metadata ?? {};
    const patch: Record<string, string | null> = {};

    if (necesitaFecha && metadata.fecha_nacimiento) {
      patch.fecha_nacimiento = String(metadata.fecha_nacimiento);
    }
    if (necesitaSexo && metadata.sexo) {
      patch.sexo = String(metadata.sexo);
    }

    if (Object.keys(patch).length === 0) {
      return perfil;
    }

    const { data: actualizado, error: updateError } = await supabaseAdmin
      .from("perfiles")
      .update(patch)
      .eq("id", userId)
      .select("*")
      .single();

    if (updateError || !actualizado) {
      console.error("Error al sincronizar metadata de perfil:", updateError);
      return { ...perfil, ...patch };
    }

    return { ...perfil, ...actualizado };
  }

  /**
   * Ficha pública: sin datos sensibles de contacto ni documento.
   * Menores: sin foto pública; sin perfil si no hay autorización.
   */
  static async obtenerPerfilPublico(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, nombre, apellido, email, es_prueba, rol, avatar_url, categoria_padel, lado_preferido, lugar_residencia, sexo, es_menor, cuenta_estado, perfil_publico_habilitado, clubes:clubes!perfiles_club_id_fkey(id, nombre)",
      )
      .eq("id", userId)
      .single();

    if (error || !data || !esVisibleEnSitioPublico(data)) {
      throw new Error("Perfil de usuario no encontrado en la plataforma.");
    }

    if (
      data.es_menor &&
      (data.cuenta_estado === "PENDING_PARENTAL_CONSENT" ||
        data.cuenta_estado === "DRAFT_MINOR" ||
        data.cuenta_estado === "SUSPENDED_MINOR" ||
        !data.perfil_publico_habilitado)
    ) {
      throw new Error("Este perfil no está disponible públicamente.");
    }

    const avatarPublico = data.es_menor ? null : data.avatar_url;

    return {
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      avatar_url: avatarPublico,
      categoria_padel: data.categoria_padel,
      lado_preferido: data.lado_preferido,
      // Residencia no pública para menores
      lugar_residencia: data.es_menor ? null : data.lugar_residencia,
      sexo: data.es_menor ? null : data.sexo,
      es_menor: data.es_menor,
      clubes: data.clubes,
    };
  }

  /**
   * Actualiza los datos permitidos de la ficha del perfil del usuario logueado
   */
  static async actualizarDatosPerfil(
    userId: string,
    datos: ActualizarPerfilDTO,
  ) {
    if (datos.apellido !== undefined) {
      const apellidoTrim = datos.apellido.trim();
      if (apellidoTrim.length < 2 || /\d/.test(apellidoTrim)) {
        throw new Error(
          "El apellido es obligatorio (mínimo 2 letras, sin números).",
        );
      }
    }

    const nombreCapitalizado =
      datos.nombre !== undefined ? normalizarNombrePerfil(datos.nombre) : undefined;
    const apellidoCapitalizado =
      datos.apellido !== undefined ? normalizarNombrePerfil(datos.apellido) : undefined;

    if (
      datos.lugar_residencia !== undefined &&
      !datos.lugar_residencia.trim()
    ) {
      throw new Error("La provincia de residencia es obligatoria.");
    }

    const { data: perfilExistente } = await supabaseAdmin
      .from("perfiles")
      .select("fecha_nacimiento, dni, es_menor, cuenta_estado")
      .eq("id", userId)
      .maybeSingle();

    if (
      perfilExistente?.fecha_nacimiento &&
      datos.fecha_nacimiento !== undefined &&
      normalizeFechaNacimiento(datos.fecha_nacimiento) !== perfilExistente.fecha_nacimiento
    ) {
      throw new Error(
        "La fecha de nacimiento es un dato oficial y no puede modificarse desde el perfil. Debés solicitar el cambio a la entidad.",
      );
    }

    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .update(
        buildPerfilUpdatePatch({
          nombre: nombreCapitalizado,
          apellido: apellidoCapitalizado,
          telefono: datos.telefono,
          lado_preferido: datos.lado_preferido,
          lugar_residencia: datos.lugar_residencia,
          sexo: datos.sexo,
          fecha_nacimiento: perfilExistente?.fecha_nacimiento ? undefined : normalizeFechaNacimiento(datos.fecha_nacimiento),
          avatar_url: datos.avatar_url,
          preferencias_notificacion: datos.preferencias_notificacion
            ? {
                push: Boolean(datos.preferencias_notificacion.push),
                email: Boolean(datos.preferencias_notificacion.email),
                whatsapp: Boolean(datos.preferencias_notificacion.whatsapp),
              }
            : undefined,
        }),
      )
      .eq("id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(
        `No se pudieron actualizar los datos del perfil: ${error?.message}`,
      );
    }

    if (
      nombreCapitalizado !== undefined ||
      apellidoCapitalizado !== undefined
    ) {
      await sincronizarNombresInscripcionesJugador(userId, {
        nombre: data.nombre,
        apellido: data.apellido,
      });
    }

    return data;
  }

  /**
   * Sube una foto de perfil en formato base64 y la vincula al usuario
   */
  static async actualizarAvatar(userId: string, base64Data: string): Promise<string> {
    // 1. Validamos formato base64
    const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Formato de imagen base64 inválido.");
    }

    const mimeType = matches[1];
    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, "base64");
    
    const ext = mimeType.split("/")[1] || "png";
    const fileName = `avatar_${Date.now()}.${ext}`;
    const filePath = `${userId}/${fileName}`;

    // 2. Traer el perfil actual para eliminar el avatar anterior si existe
    const { data: perfilActual } = await supabaseAdmin
      .from("perfiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (perfilActual?.avatar_url) {
      try {
        const parts = perfilActual.avatar_url.split("/avatars/");
        if (parts.length === 2) {
          await supabaseAdmin.storage.from("avatars").remove([parts[1]]);
        }
      } catch (err) {
        console.error("⚠️ No se pudo eliminar el avatar anterior:", err);
      }
    }

    // 3. Subir el nuevo avatar
    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Error al subir imagen al storage: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // 4. Actualizar la tabla perfiles
    const { error: dbError } = await supabaseAdmin
      .from("perfiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (dbError) {
      throw new Error(`Error al guardar la URL del avatar en base de datos: ${dbError.message}`);
    }

    return publicUrl;
  }

  /**
   * Elimina la foto de perfil del usuario del storage y de la base de datos
   */
  static async eliminarAvatar(userId: string): Promise<void> {
    const { data: perfilActual, error: fetchError } = await supabaseAdmin
      .from("perfiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    if (fetchError || !perfilActual) {
      throw new Error("Perfil de usuario no encontrado.");
    }

    if (perfilActual.avatar_url) {
      const parts = perfilActual.avatar_url.split("/avatars/");
      if (parts.length === 2) {
        const { error: removeError } = await supabaseAdmin.storage
          .from("avatars")
          .remove([parts[1]]);
        
        if (removeError) {
          console.error("⚠️ Error al eliminar archivo de storage:", removeError.message);
        }
      }
    }

    const { error: dbError } = await supabaseAdmin
      .from("perfiles")
      .update({ avatar_url: null })
      .eq("id", userId);

    if (dbError) {
      throw new Error(`Error al remover el avatar de la base de datos: ${dbError.message}`);
    }
  }

  private static capitalizarTexto(texto?: string): string {
    return capitalizarNombre(texto);
  }

  private static emailPlaceholderDesdeDni(dni: string): string {
    return `preinscripto+${dni}@padelnexus.local`;
  }

  private static async obtenerFichaPreinscripcionPorDni(dni: string) {
    const dniLimpio = normalizarDni(dni);
    if (!dniLimpio || dniLimpio.length < 7) {
      throw new Error("Ingresá un DNI válido.");
    }

    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, nombre, apellido, email, telefono, dni, lugar_residencia, categoria_padel, lado_preferido, fecha_nacimiento, sexo, pendiente_activacion",
      )
      .eq("dni", dniLimpio)
      .maybeSingle();

    if (error) throw new Error("Error al consultar el DNI.");
    return data;
  }

  private static perfilPublicableDesdeFicha(data: {
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    telefono: string | null;
    dni: string | null;
    lugar_residencia: string | null;
    categoria_padel: string | null;
    lado_preferido: string | null;
    fecha_nacimiento: string | null;
    sexo: string | null;
  }) {
    return {
      nombre: data.nombre,
      apellido: data.apellido,
      email: esEmailPlaceholderPlanilla(data.email) ? "" : data.email,
      telefono: data.telefono,
      dni: data.dni,
      lugar_residencia: data.lugar_residencia,
      categoria_padel: data.categoria_padel,
      lado_preferido: data.lado_preferido || "indistinto",
      fecha_nacimiento: data.fecha_nacimiento,
      sexo: data.sexo || "masculino",
    };
  }

  /**
   * Consulta anónima: indica si hay ficha pendiente sin exponer PII (PUB-18).
   */
  static async consultarPreinscripcionPorDni(dni: string) {
    await assertDniNoBloqueadoPreinscripcion(dni);
    const data = await PerfilService.obtenerFichaPreinscripcionPorDni(dni);
    if (!data) {
      return { encontrado: false as const };
    }

    const cuentaPendienteApp =
      cuentaPendienteActivacionApp(data) ||
      (await PerfilService.esFichaPlanillaSinActivar(String(data.id)));

    if (!cuentaPendienteApp) {
      return {
        encontrado: true as const,
        pendiente_activacion: false as const,
        mensaje:
          "Este DNI ya tiene una cuenta activa. Iniciá sesión o recuperá tu contraseña.",
      };
    }

    const metodos_disponibles = metodosVerificacionPreinscripcion(data);
    const nroLicencia = await PerfilService.obtenerNroLicenciaPerfil(
      String(data.id),
    );
    const padron_fap_disponible = activacionPadronFapDisponible(data, {
      tiene_licencia_fap: Boolean(nroLicencia?.trim()),
    });

    return {
      encontrado: true as const,
      pendiente_activacion: true as const,
      verificacion_requerida: true as const,
      metodos_disponibles,
      padron_fap_disponible,
      mensaje:
        metodos_disponibles.length > 0
          ? "Encontramos tus datos cargados por tu club o asociación. Confirmá tu identidad para continuar."
          : padron_fap_disponible
            ? "Encontramos tus datos del padrón FAP. Validá DNI, fecha de nacimiento y N° de licencia para activar con un código a tu email o teléfono."
            : "Encontramos tus datos cargados por tu club o asociación. Contactá a tu entidad para completar el teléfono o email de verificación.",
    };
  }

  /**
   * Devuelve datos de preinscripción solo tras verificar teléfono o email del club.
   */
  static async verificarYObtenerPreinscripcionPorDni(
    dni: string,
    payload: {
      metodo: MetodoVerificacionPreinscripcion;
      telefono_ultimos4?: string;
      email?: string;
    },
  ) {
    await assertDniNoBloqueadoPreinscripcion(dni);
    const data = await PerfilService.obtenerFichaPreinscripcionPorDni(dni);
    if (!data) {
      await registrarIntentoFallidoPreinscripcion(dni);
      throw new Error("Los datos de verificación no coinciden.");
    }

    const cuentaPendienteApp =
      cuentaPendienteActivacionApp(data) ||
      (await PerfilService.esFichaPlanillaSinActivar(String(data.id)));

    if (!cuentaPendienteApp) {
      throw new Error("Este DNI ya tiene una cuenta activa.");
    }

    const metodos = metodosVerificacionPreinscripcion(data);
    if (!metodos.includes(payload.metodo)) {
      throw new Error("Los datos de verificación no coinciden.");
    }

    let verificado = false;
    if (payload.metodo === "telefono") {
      verificado = coincideUltimos4Telefono(
        data.telefono,
        payload.telefono_ultimos4 || "",
      );
    } else if (payload.metodo === "email") {
      verificado = coincideEmailPreinscripcion(data.email, payload.email || "");
    }

    if (!verificado) {
      await registrarIntentoFallidoPreinscripcion(dni);
      throw new Error("Los datos de verificación no coinciden.");
    }

    await reiniciarIntentosPreinscripcion(dni);
    const { token, expires_at } = await emitirTokenActivacionPreinscripcion({
      dni,
      perfilId: String(data.id),
      metodo: payload.metodo,
    });

    return {
      encontrado: true as const,
      pendiente_activacion: true as const,
      perfil: PerfilService.perfilPublicableDesdeFicha(data),
      verification_token: token,
      verification_token_expires_at: expires_at,
    };
  }

  private static async assertFichaPendienteActivacionPadron(data: {
    id?: string;
    pendiente_activacion: boolean | null;
    email: string | null;
  }): Promise<void> {
    const cuentaPendiente =
      cuentaPendienteActivacionApp(data) ||
      (data.id
        ? await PerfilService.esFichaPlanillaSinActivar(String(data.id))
        : false);
    if (!cuentaPendiente) {
      throw new Error("Este DNI ya tiene una cuenta activa.");
    }
  }

  /** Planilla con auth creado pero el jugador nunca completó registro/inicio de sesión. */
  static async esFichaPlanillaSinActivar(perfilId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(perfilId);
    if (error || !data.user) return false;
    const meta = data.user.user_metadata as Record<string, unknown> | undefined;
    if (meta?.origen !== "planilla_inscripcion") return false;
    return !data.user.last_sign_in_at;
  }

  static async puedeEditarFichaProvisoriaAdmin(perfil: {
    id: string;
    email?: string | null;
    pendiente_activacion?: boolean | null;
  }): Promise<boolean> {
    if (PerfilService.esFichaProvisoriaAdmin(perfil)) return true;
    return PerfilService.esFichaPlanillaSinActivar(perfil.id);
  }

  private static async obtenerNroLicenciaPerfil(
    usuarioId: string,
  ): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from("licencias")
      .select("nro_licencia")
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error("Error al consultar la licencia.");
    }
    return data?.nro_licencia ? String(data.nro_licencia) : null;
  }

  private static async validarIdentidadPadronFap(
    dni: string,
    payload: { fecha_nacimiento: string; nro_licencia: string },
  ): Promise<NonNullable<Awaited<ReturnType<typeof PerfilService.obtenerFichaPreinscripcionPorDni>>>> {
    await assertDniNoBloqueadoPreinscripcion(dni);
    const data = await PerfilService.obtenerFichaPreinscripcionPorDni(dni);
    if (!data) {
      await registrarIntentoFallidoPreinscripcion(dni);
      throw new Error("Los datos de verificación no coinciden.");
    }

    await PerfilService.assertFichaPendienteActivacionPadron(data);

    const metodosContacto = metodosVerificacionPreinscripcion(data);
    if (metodosContacto.length > 0) {
      throw new Error(
        "Esta ficha ya tiene teléfono o email para verificar. Usá ese método.",
      );
    }

    const nroEnFicha = await PerfilService.obtenerNroLicenciaPerfil(
      String(data.id),
    );
    if (!nroEnFicha?.trim()) {
      await registrarIntentoFallidoPreinscripcion(dni);
      throw new Error("Los datos de verificación no coinciden.");
    }

    const fechaOk = coincideFechaNacimientoPadron(
      data.fecha_nacimiento,
      payload.fecha_nacimiento,
    );
    const licenciaOk = coincidenLicenciasPadron(
      nroEnFicha,
      payload.nro_licencia,
    );

    if (!fechaOk || !licenciaOk) {
      await registrarIntentoFallidoPreinscripcion(dni);
      throw new Error("Los datos de verificación no coinciden.");
    }

    return data;
  }

  /**
   * Tras validar identidad FAP, envía OTP al email o teléfono nuevo del jugador.
   */
  static async solicitarOtpActivacionPadronFap(
    dni: string,
    payload: {
      fecha_nacimiento: string;
      nro_licencia: string;
      canal: "email" | "telefono";
      email?: string;
      telefono?: string;
    },
  ) {
    const data = await PerfilService.validarIdentidadPadronFap(dni, {
      fecha_nacimiento: payload.fecha_nacimiento,
      nro_licencia: payload.nro_licencia,
    });
    await reiniciarIntentosPreinscripcion(normalizarDni(dni));

    let destino = "";
    if (payload.canal === "email") {
      const email = normalizarEmailPadronOtp(payload.email || "");
      if (!emailValidoPadronOtp(email)) {
        throw new Error("Ingresá un correo válido para recibir el código.");
      }
      destino = email;
    } else {
      const tel = normalizarTelefonoPadronOtp(payload.telefono || "");
      if (!telefonoValidoPadronOtp(tel)) {
        throw new Error("Ingresá un teléfono válido (mínimo 8 dígitos).");
      }
      destino = tel;
    }

    const { codigoPlano, expiresAt } = await crearOtpPadronFap({
      dni: normalizarDni(dni),
      perfilId: String(data.id),
      canal: payload.canal,
      destino,
    });

    if (payload.canal === "email") {
      await enviarOtpActivacionPadronResend(destino, codigoPlano);
    } else if (process.env.SMS_OTP_HABILITADO === "true") {
      console.info(
        `[preinscripcion] OTP SMS pendiente de proveedor · ${destino.slice(-4)}`,
      );
    } else if (process.env.NODE_ENV !== "production") {
      console.info(
        `[preinscripcion] OTP teléfono (solo dev) · destino …${destino.slice(-4)} · código ${codigoPlano}`,
      );
    } else {
      throw new Error(
        "El envío de códigos por SMS no está habilitado. Usá un correo electrónico.",
      );
    }

    return {
      otp_enviado: true as const,
      canal: payload.canal,
      otp_expires_at: expiresAt,
      mensaje:
        payload.canal === "email"
          ? "Te enviamos un código a tu correo. Ingresalo para continuar."
          : "Te enviamos un código por SMS. Ingresalo para continuar.",
    };
  }

  /**
   * Valida el OTP y emite token de activación (método padron_fap).
   */
  static async confirmarOtpActivacionPadronFap(
    dni: string,
    payload: {
      fecha_nacimiento: string;
      nro_licencia: string;
      codigo: string;
    },
  ) {
    const dniLimpio = normalizarDni(dni);
    await assertDniNoBloqueadoPreinscripcion(dniLimpio);

    const data = await PerfilService.validarIdentidadPadronFap(dniLimpio, {
      fecha_nacimiento: payload.fecha_nacimiento,
      nro_licencia: payload.nro_licencia,
    });

    const codigo = String(payload.codigo || "").trim().replace(/\D/g, "");
    if (codigo.length !== 6) {
      await registrarIntentoFallidoPreinscripcion(dniLimpio);
      throw new Error("Código inválido o vencido.");
    }

    let otpValidado;
    try {
      otpValidado = await validarOtpPadronFap(dniLimpio, codigo);
    } catch {
      await registrarIntentoFallidoPreinscripcion(dniLimpio);
      throw new Error("Código inválido o vencido.");
    }

    if (otpValidado.perfilId !== String(data.id)) {
      throw new Error("Código inválido o vencido.");
    }

    await reiniciarIntentosPreinscripcion(dniLimpio);

    const patch: Record<string, unknown> = {};
    if (otpValidado.canal === "email") {
      patch.email = otpValidado.destino;
    } else {
      patch.telefono = otpValidado.destino;
    }

    if (Object.keys(patch).length > 0) {
      await supabaseAdmin.from("perfiles").update(patch).eq("id", data.id);
    }

    const { token, expires_at } = await emitirTokenActivacionPreinscripcion({
      dni: dniLimpio,
      perfilId: String(data.id),
      metodo: "padron_fap",
    });

    return {
      encontrado: true as const,
      pendiente_activacion: true as const,
      perfil: PerfilService.perfilPublicableDesdeFicha({
        ...data,
        email:
          otpValidado.canal === "email"
            ? otpValidado.destino
            : data.email,
        telefono:
          otpValidado.canal === "telefono"
            ? otpValidado.destino
            : data.telefono,
      }),
      verification_token: token,
      verification_token_expires_at: expires_at,
    };
  }

  /** @deprecated Usar consultarPreinscripcionPorDni / verificarYObtenerPreinscripcionPorDni */
  static async buscarPreinscripcionPorDni(dni: string) {
    return PerfilService.consultarPreinscripcionPorDni(dni);
  }

  private static resolverCategoriaDesdePlanilla(
    fila: FilaPlanillaInscripcion,
    opciones?: OpcionesResolverJugadorPlanilla,
  ): string {
    const explicita = fila.categoria?.trim();
    if (explicita) return explicita;
    const fallbackTorneo = opciones?.categoriaFallback?.trim();
    if (fallbackTorneo) return fallbackTorneo;
    if (opciones?.usarFallbackPlanilla5 !== false) {
      return "5ª";
    }
    throw new Error(
      `Fila ${fila.fila}: la categoría es obligatoria para crear la ficha provisional.`,
    );
  }

  /**
   * Elimina una ficha provisional creada en un intento fallido de inscripción (TOR-23).
   */
  static async revertirFichaProvisionalInscripcion(userId: string): Promise<void> {
    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle();

    if (!perfil?.email || !esEmailPlaceholderPlanilla(perfil.email)) {
      return;
    }

    const { count } = await supabaseAdmin
      .from("inscripciones")
      .select("id", { count: "exact", head: true })
      .or(`usuario_id.eq."${userId}",usuario2_id.eq."${userId}"`);

    if (count && count > 0) {
      return;
    }

    await supabaseAdmin.from("perfiles").delete().eq("id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }

  /**
   * Crea o actualiza un jugador a partir de una fila de planilla.
   * La ficha queda completa para torneos; la activación en App ocurre al registrarse con su DNI.
   */
  static async resolverJugadorDesdePlanilla(
    fila: FilaPlanillaInscripcion,
    opciones?: OpcionesResolverJugadorPlanilla,
  ) {
    fila = sanitizarFilaPlanillaInscripcion(fila);
    const dni = normalizarDni(fila.dni);
    if (!dni || dni.length < 7) {
      throw new Error(
        `${etiquetaFilaPlanillaExcel(fila.fila)}: el DNI es obligatorio para importar inscripciones.`,
      );
    }

    const { apellido, nombre } = parseNombreCompleto(fila.apellidoNombre);
    if (!apellido && !nombre) {
      throw new Error(
        `${etiquetaFilaPlanillaExcel(fila.fila)}: el apellido y nombre son obligatorios.`,
      );
    }

    const email =
      fila.email && !esEmailPlaceholderPlanilla(fila.email)
        ? fila.email.toLowerCase()
        : PerfilService.emailPlaceholderDesdeDni(dni);

    const { data: existente } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, email, pendiente_activacion, lugar_residencia")
      .eq("dni", dni)
      .maybeSingle();

    const lugarPersistir = resolverLugarResidenciaDesdePlanilla(fila);

    if (existente) {
      const patch: Record<string, unknown> = {};
      if (!existente.nombre && nombre) patch.nombre = PerfilService.capitalizarTexto(nombre);
      if (!existente.apellido && apellido)
        patch.apellido = PerfilService.capitalizarTexto(apellido);
      if (fila.telefono) patch.telefono = fila.telefono;
      if (lugarPersistir) {
        patch.lugar_residencia = lugarPersistir;
      }
      if (fila.categoria) patch.categoria_padel = fila.categoria;
      if (fila.fechaNacimiento) patch.fecha_nacimiento = fila.fechaNacimiento;
      if (
        cuentaPendienteActivacionApp(existente) ||
        esEmailPlaceholderPlanilla(existente.email)
      ) {
        patch.pendiente_activacion = true;
      }

      if (Object.keys(patch).length > 0) {
        await supabaseAdmin.from("perfiles").update(patch).eq("id", existente.id);
      }

      return {
        id: existente.id,
        nombre: existente.nombre || PerfilService.capitalizarTexto(nombre),
        apellido: existente.apellido || PerfilService.capitalizarTexto(apellido),
        creado: false,
      };
    }

    const passwordTemporal = randomBytes(24).toString("hex");
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: passwordTemporal,
        email_confirm: true,
        user_metadata: {
          origen: "planilla_inscripcion",
          pendiente_activacion: true,
          dni,
        },
      });

    if (authError || !authUser.user) {
      throw new Error(
        `${etiquetaFilaPlanillaExcel(fila.fila)}: no se pudo crear el jugador (${authError?.message || "error desconocido"}).`,
      );
    }

    const userId = authUser.user.id;
    const categoriaPadel = PerfilService.resolverCategoriaDesdePlanilla(
      fila,
      opciones,
    );
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .upsert(
        {
          id: userId,
          email,
          dni,
          nombre: PerfilService.capitalizarTexto(nombre),
          apellido: PerfilService.capitalizarTexto(apellido),
          telefono: fila.telefono || null,
          lugar_residencia: lugarPersistir || "A completar",
          categoria_padel: categoriaPadel,
          lado_preferido: "indistinto",
          fecha_nacimiento: fila.fechaNacimiento || null,
          sexo: "masculino",
          rol: "usuario",
          pendiente_activacion: true,
        },
        { onConflict: "id" },
      )
      .select("id, nombre, apellido")
      .single();

    if (perfilError || !perfil) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(
        `${etiquetaFilaPlanillaExcel(fila.fila)}: no se pudo guardar el perfil del jugador.`,
      );
    }

    return { ...perfil, creado: true };
  }

  /**
   * Resuelve un jugador por DNI/email o crea ficha provisional (mismo flujo que planilla).
   */
  static async resolverJugadorParaInscripcionManual(
    identificador: string,
    datos: DatosAltaJugadorManual | undefined,
    etiqueta: string,
    opciones?: OpcionesResolverJugadorPlanilla,
  ): Promise<{
    id: string;
    nombre: string | null;
    apellido: string | null;
    categoria_padel: string | null;
    fecha_nacimiento: string | null;
    sexo: string | null;
    creado: boolean;
  }> {
    const raw = identificador.trim();
    if (!raw) {
      throw new Error(`${etiqueta}: el identificador es obligatorio.`);
    }

    const { data: existente, error: busquedaError } = await supabaseAdmin
      .from("perfiles")
      .select(PERFIL_SELECT_INSCRIPCION_MANUAL)
      .or(`dni.eq."${raw}",email.eq."${raw}"`)
      .maybeSingle();

    if (busquedaError) {
      throw new Error(`Error al buscar ${etiqueta}.`);
    }
    if (existente) {
      return { ...existente, creado: false };
    }

    if (raw.includes("@")) {
      throw new Error(
        `${etiqueta} (${raw}) no está registrado en la plataforma.`,
      );
    }

    const dni = normalizarDni(raw);
    if (!dni || dni.length < 7) {
      throw new Error(
        `${etiqueta} (${raw}) no está registrado. Para un DNI nuevo indicá nombre y apellido.`,
      );
    }

    const nombre = (datos?.nombre || "").trim();
    const apellido = (datos?.apellido || "").trim();
    if (!nombre || !apellido) {
      throw new Error(
        `El ${etiqueta.toLowerCase()} (${dni}) no está registrado en la plataforma. Completá nombre y apellido para crear la ficha provisional.`,
      );
    }

    const fila: FilaPlanillaInscripcion = {
      fila: 0,
      dni,
      apellidoNombre: `${apellido}, ${nombre}`,
      categoria: datos?.categoria_padel,
      fechaNacimiento: datos?.fecha_nacimiento,
      telefono: datos?.telefono,
    };

    const creado = await PerfilService.resolverJugadorDesdePlanilla(fila, {
      categoriaFallback: opciones?.categoriaFallback ?? datos?.categoria_padel,
      usarFallbackPlanilla5: opciones?.usarFallbackPlanilla5 ?? false,
    });
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .select(PERFIL_SELECT_INSCRIPCION_MANUAL)
      .eq("id", creado.id)
      .single();

    if (perfilError || !perfil) {
      throw new Error(`No se pudo cargar el perfil de ${etiqueta}.`);
    }

    return { ...perfil, creado: creado.creado };
  }

  /**
   * Guarda el token de Expo Push en preferencias_notificacion (jsonb).
   */
  static async registrarPushToken(userId: string, expoPushToken: string) {
    const { data: perfil, error: readError } = await supabaseAdmin
      .from("perfiles")
      .select("preferencias_notificacion")
      .eq("id", userId)
      .single();

    if (readError || !perfil) {
      throw new Error("Perfil no encontrado.");
    }

    const current = (perfil.preferencias_notificacion || {}) as Record<
      string,
      unknown
    >;

    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .update({
        preferencias_notificacion: {
          ...current,
          push: current.push !== false,
          expo_push_token: expoPushToken,
        },
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error("No se pudo registrar el token de notificaciones push.");
    }

    return data;
  }

  /**
   * El jugador pide cambiar DNI o categoría. No modifica la ficha.
   */
  static async solicitarCambioFicha(
    userId: string,
    campo: string,
    valorPedido: string,
  ) {
    if (campo !== "dni" && campo !== "categoria" && campo !== "fecha_nacimiento") {
      throw new Error("Solo se puede pedir cambio de DNI, fecha de nacimiento o categoría.");
    }

    const pedido = valorPedido.trim();
    if (!pedido) throw new Error("Indicá el valor que querés pedir.");

    const { data: perfil, error: readError } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, dni, categoria_padel, fecha_nacimiento")
      .eq("id", userId)
      .maybeSingle();

    if (readError || !perfil) throw new Error("Perfil no encontrado.");

    let actual = "";
    if (campo === "dni") {
      actual = String(perfil.dni || "").replace(/\./g, "");
    } else if (campo === "fecha_nacimiento") {
      actual = String(perfil.fecha_nacimiento || "");
    } else {
      actual = String(perfil.categoria_padel || "");
    }

    let normalizado = pedido;
    if (campo === "dni") {
      normalizado = pedido.replace(/\D/g, "");
      if (!/^\d{7,8}$/.test(normalizado)) {
        throw new Error("El DNI debe tener 7 u 8 dígitos.");
      }
    } else if (campo === "fecha_nacimiento") {
      const fechaNorm = normalizeFechaNacimiento(pedido);
      if (!fechaNorm) {
        throw new Error("Fecha de nacimiento inválida (formato AAAA-MM-DD).");
      }
      normalizado = fechaNorm;
    } else {
      const permitidas = new Set<string>([
        ...CATEGORIAS_LIBRES,
        ...CATEGORIAS_MENORES,
        ...CATEGORIAS_VETERANOS,
      ]);
      if (!permitidas.has(pedido)) {
        throw new Error("Esa categoría no existe en el circuito.");
      }
    }

    if (normalizado === actual) {
      throw new Error("Ese valor ya es el de tu ficha.");
    }

    const { data: pendiente } = await supabaseAdmin
      .from("solicitudes_cambio_ficha")
      .select("id")
      .eq("usuario_id", userId)
      .eq("campo", campo)
      .eq("estado", "pendiente")
      .maybeSingle();

    const fila = pendiente
      ? await supabaseAdmin
          .from("solicitudes_cambio_ficha")
          .update({ valor_pedido: normalizado, valor_actual: actual || null })
          .eq("id", pendiente.id)
          .select("id, campo, valor_pedido, estado")
          .single()
      : await supabaseAdmin
          .from("solicitudes_cambio_ficha")
          .insert({
            usuario_id: userId,
            campo,
            valor_actual: actual || null,
            valor_pedido: normalizado,
          })
          .select("id, campo, valor_pedido, estado")
          .single();

    if (fila.error || !fila.data) {
      throw new Error("No se pudo registrar el pedido.");
    }

    const etiqueta = campo === "dni" ? "DNI" : "categoría";
    const quien = [perfil.apellido, perfil.nombre].filter(Boolean).join(", ");
    const { data: admins } = await supabaseAdmin
      .from("perfiles")
      .select("id")
      .in("rol", [
        "admin",
        "superadmin",
        "admin_federacion",
        "admin_provincial",
      ]);
    await Promise.allSettled(
      (admins || []).map((admin) =>
        NotificacionService.crearNotificacion({
          usuario_id: admin.id,
          titulo: "Pedido de cambio de ficha",
          mensaje: `${quien || "Un jugador"} pidió cambiar su ${etiqueta}.`,
          tipo: "info",
          metadata: { solicitud_id: fila.data.id, campo },
        }),
      ),
    );

    return fila.data;
  }

  static esFichaProvisoriaAdmin(perfil: {
    email?: string | null;
    pendiente_activacion?: boolean | null;
  }): boolean {
    return cuentaPendienteActivacionApp(perfil);
  }

  /**
   * Corrección de datos en fichas provisorias (padrón / preinscripción) por staff.
   */
  static async actualizarFichaProvisoriaPorAdmin(
    actor: { id: string; rol?: string | null },
    jugadorId: string,
    datos: {
      nombre?: string;
      apellido?: string;
      fecha_nacimiento?: string | null;
      email?: string | null;
      telefono?: string | null;
    },
  ) {
    const { AlcanceCuentaService } = await import("./alcanceCuenta.service");
    await AlcanceCuentaService.exigirEdicionFichaProvisoria(actor, jugadorId);

    const { data: antes, error: readError } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, nombre, apellido, fecha_nacimiento, email, telefono, pendiente_activacion, rol",
      )
      .eq("id", jugadorId)
      .maybeSingle();

    if (readError || !antes) {
      throw new Error("Jugador no encontrado.");
    }
    if (antes.rol !== "usuario") {
      throw new Error("Solo aplica a fichas de jugador.");
    }
    if (!(await PerfilService.puedeEditarFichaProvisoriaAdmin(antes))) {
      throw new Error(
        "La ficha no es provisoria. Usá el flujo de solicitud de cambio del jugador.",
      );
    }

    const patch: Record<string, unknown> = {};
    const cambios: Record<string, { antes: unknown; despues: unknown }> = {};

    if (datos.nombre !== undefined) {
      const nombre = normalizarNombrePerfil(datos.nombre);
      if (nombre.length < 2) {
        throw new Error("El nombre es obligatorio (mínimo 2 caracteres).");
      }
      if (nombre !== (antes.nombre || "")) {
        patch.nombre = nombre;
        cambios.nombre = { antes: antes.nombre, despues: nombre };
      }
    }

    if (datos.apellido !== undefined) {
      const apellido = normalizarNombrePerfil(datos.apellido);
      if (apellido.length < 2 || /\d/.test(apellido)) {
        throw new Error(
          "El apellido es obligatorio (mínimo 2 letras, sin números).",
        );
      }
      if (apellido !== (antes.apellido || "")) {
        patch.apellido = apellido;
        cambios.apellido = { antes: antes.apellido, despues: apellido };
      }
    }

    if (datos.fecha_nacimiento !== undefined) {
      const fecha = datos.fecha_nacimiento
        ? normalizeFechaNacimiento(datos.fecha_nacimiento)
        : null;
      if (fecha !== (antes.fecha_nacimiento || null)) {
        patch.fecha_nacimiento = fecha;
        cambios.fecha_nacimiento = {
          antes: antes.fecha_nacimiento,
          despues: fecha,
        };
      }
    }

    if (datos.email !== undefined) {
      const emailNorm = datos.email
        ? normalizarEmailPadronOtp(String(datos.email))
        : "";
      if (emailNorm && !emailValidoPadronOtp(emailNorm)) {
        throw new Error("El email no es válido.");
      }
      if (emailNorm && esEmailPlaceholderPlanilla(emailNorm)) {
        throw new Error("Usá un email real, no un marcador de planilla.");
      }
      const anterior = antes.email || null;
      const nuevo = emailNorm || null;
      if (nuevo !== anterior) {
        patch.email = nuevo;
        cambios.email = { antes: anterior, despues: nuevo };
      }
    }

    if (datos.telefono !== undefined) {
      const telNorm = datos.telefono
        ? normalizarTelefonoPadronOtp(String(datos.telefono))
        : "";
      if (telNorm && !telefonoValidoPadronOtp(telNorm)) {
        throw new Error("El teléfono debe tener al menos 8 dígitos.");
      }
      const anterior = antes.telefono || null;
      const nuevo = telNorm || null;
      if (nuevo !== anterior) {
        patch.telefono = nuevo;
        cambios.telefono = { antes: anterior, despues: nuevo };
      }
    }

    if (Object.keys(patch).length === 0) {
      throw new Error("No hay cambios para guardar.");
    }

    patch.pendiente_activacion = true;

    const { data, error: updateError } = await supabaseAdmin
      .from("perfiles")
      .update(patch)
      .eq("id", jugadorId)
      .select("*")
      .single();

    if (updateError || !data) {
      throw new Error(
        updateError?.message || "No se pudo actualizar la ficha provisoria.",
      );
    }

    let inscripciones_sync: Awaited<
      ReturnType<typeof sincronizarNombresInscripcionesJugador>
    > | null = null;
    if (cambios.nombre || cambios.apellido) {
      inscripciones_sync = await sincronizarNombresInscripcionesJugador(
        jugadorId,
        { nombre: data.nombre, apellido: data.apellido },
      );
    }

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: actor.id,
      accion: "editar_ficha_provisoria",
      entidad_afectada: jugadorId,
      detalles: { cambios, inscripciones_sync },
    });

    return data;
  }

  /** ENT-41: corrección de DNI exclusiva de superadmin con auditoría. */
  static async corregirDniFichaPorSuperadmin(
    actor: { id: string; rol?: string | null },
    jugadorId: string,
    dniRaw: string,
  ) {
    if (actor.rol !== "superadmin") {
      const err = new Error("Solo superadmin puede corregir el DNI.");
      Object.assign(err, { statusCode: 403 });
      throw err;
    }

    const dniNuevo = normalizarDni(String(dniRaw || ""));
    if (!dniNuevo || dniNuevo.length < 7) {
      throw new Error("Ingresá un DNI válido (mínimo 7 dígitos).");
    }

    const { data: antes, error: readError } = await supabaseAdmin
      .from("perfiles")
      .select("id, dni, email, rol")
      .eq("id", jugadorId)
      .maybeSingle();

    if (readError || !antes) {
      throw new Error("Jugador no encontrado.");
    }
    if (antes.rol !== "usuario") {
      throw new Error("Solo aplica a fichas de jugador.");
    }

    const dniAnterior = antes.dni ? normalizarDni(antes.dni) : null;
    if (dniNuevo === dniAnterior) {
      throw new Error("El DNI ingresado es el mismo que el actual.");
    }

    const { data: duplicado } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido")
      .eq("dni", dniNuevo)
      .neq("id", jugadorId)
      .maybeSingle();

    if (duplicado) {
      throw new ErrorDniFichaDuplicado({
        id: duplicado.id,
        nombre: duplicado.nombre ?? null,
        apellido: duplicado.apellido ?? null,
      });
    }

    const patch: Record<string, unknown> = { dni: dniNuevo };
    const cambios: Record<string, { antes: unknown; despues: unknown }> = {
      dni: { antes: antes.dni ?? null, despues: dniNuevo },
    };

    if (esEmailPlaceholderPlanilla(antes.email)) {
      const emailNuevo = PerfilService.emailPlaceholderDesdeDni(dniNuevo);
      patch.email = emailNuevo;
      cambios.email = { antes: antes.email ?? null, despues: emailNuevo };
    }

    const { data, error: updateError } = await supabaseAdmin
      .from("perfiles")
      .update(patch)
      .eq("id", jugadorId)
      .select("*")
      .single();

    if (updateError || !data) {
      throw new Error(
        updateError?.message || "No se pudo actualizar el DNI.",
      );
    }

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: actor.id,
      accion: "corregir_dni_ficha",
      entidad_afectada: jugadorId,
      detalles: { cambios },
    });

    return data;
  }

  /** ENT-41: historial de correcciones de ficha (DNI y ficha provisoria). */
  static async listarHistorialCorreccionesFicha(jugadorId: string) {
    const acciones = [
      "corregir_dni_ficha",
      "editar_ficha_provisoria",
      "unir_fichas_jugador",
    ];

    const { data, error } = await supabaseAdmin
      .from("logs_auditoria")
      .select("id, accion, detalles, created_at, usuario_id_admin")
      .eq("entidad_afectada", jugadorId)
      .in("accion", acciones)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      throw new Error("No se pudo cargar el historial de la ficha.");
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

  /** ENT-45: unir ficha origen en destino (tras colisión de DNI 409). */
  static async unirFichasPorSuperadmin(
    actor: { id: string; rol?: string | null },
    origenId: string,
    destinoId: string,
    motivo: string,
  ) {
    if (actor.rol !== "superadmin") {
      const err = new Error("Solo superadmin puede unir fichas de jugador.");
      Object.assign(err, { statusCode: 403 });
      throw err;
    }

    const motivoLimpio = motivo?.trim();
    if (!motivoLimpio) {
      throw new Error("Debés indicar un motivo para unir las fichas.");
    }

    const { data: origen } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, dni, nombre, apellido")
      .eq("id", origenId)
      .maybeSingle();
    const { data: destino } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, dni, nombre, apellido")
      .eq("id", destinoId)
      .maybeSingle();

    if (!origen || !destino) {
      throw new Error("No se encontró la ficha origen o destino.");
    }
    if (origen.rol !== "usuario" || destino.rol !== "usuario") {
      throw new Error("Solo aplica a fichas de jugador.");
    }

    const { fusionarFichasJugador } = await import("../utils/fusionFichasJugador");
    const resumen = await fusionarFichasJugador(origenId, destinoId);

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: actor.id,
      accion: "unir_fichas_jugador",
      entidad_afectada: destinoId,
      detalles: {
        motivo: motivoLimpio,
        resumen,
        origen: {
          id: origen.id,
          nombre: origen.nombre,
          apellido: origen.apellido,
          dni: origen.dni,
        },
        destino: {
          id: destino.id,
          dni: destino.dni,
        },
      },
    });

    const { data: perfilDestino } = await supabaseAdmin
      .from("perfiles")
      .select("*")
      .eq("id", destinoId)
      .single();

    return { perfil: perfilDestino, resumen };
  }
}

import { randomBytes } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { env } from "../config/env.config";
import {
  LEGAL_VERSIONES_PILOTO,
  TOKEN_PARENTAL_DIAS_VALIDEZ,
  type ConsentTipo,
  type CuentaEstado,
} from "../constants/legal";
import { esRolAdministrativo } from "../constants/roles";
import { esMenorDeEdad, calcularEdadActual } from "../utils/edad";
import { LegalService } from "./legal.service";

export interface ResponsableInput {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  vinculo: string;
}

export interface ConfirmarConsentimientoInput {
  declara_representacion: boolean;
  consentimiento_esencial: boolean;
  leyo_privacidad_menores: boolean;
  autoriza_perfil_publico?: boolean;
}

export interface AsentimientoInput {
  entiende_datos: boolean;
  acepta_perfil_publico?: boolean | null;
}

function normalizarDni(dni: string): string {
  return String(dni || "").replace(/[^\d]/g, "");
}

function generarToken(): string {
  return randomBytes(32).toString("hex");
}

export class MenoresService {
  static buildConsentUrl(token: string): string {
    const base = (env.FRONTEND_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    );
    return `${base}/consentimiento-parental/${token}`;
  }

  static async resolverFlagsPorFecha(fechaNacimiento: string | null | undefined): Promise<{
    es_menor: boolean;
    cuenta_estado: CuentaEstado;
  }> {
    if (!fechaNacimiento) {
      throw new Error("La fecha de nacimiento es obligatoria.");
    }
    const menor = esMenorDeEdad(fechaNacimiento);
    return {
      es_menor: menor,
      cuenta_estado: menor ? "PENDING_PARENTAL_CONSENT" : "ACTIVE_ADULT",
    };
  }

  static async aplicarRegimenAlPerfil(
    playerId: string,
    fechaNacimiento: string,
    extras?: {
      tyc_version?: string;
      privacidad_version?: string;
    },
  ) {
    const flags = await MenoresService.resolverFlagsPorFecha(fechaNacimiento);
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = {
      es_menor: flags.es_menor,
      cuenta_estado: flags.cuenta_estado,
      perfil_publico_habilitado: flags.es_menor
        ? false
        : undefined,
      marketing_opt_in: flags.es_menor ? false : undefined,
    };

    if (extras?.tyc_version) {
      patch.tyc_version_aceptada = extras.tyc_version;
      patch.tyc_aceptado_en = now;
    }
    if (extras?.privacidad_version) {
      patch.privacidad_version_aceptada = extras.privacidad_version;
      patch.privacidad_aceptada_en = now;
    }

    // Limpiar undefined
    Object.keys(patch).forEach((k) => {
      if (patch[k] === undefined) delete patch[k];
    });

    const { error } = await supabaseAdmin
      .from("perfiles")
      .update(patch)
      .eq("id", playerId);

    if (error) {
      throw new Error(`No se pudo aplicar régimen de cuenta: ${error.message}`);
    }

    if (flags.es_menor) {
      await supabaseAdmin.from("privacidad_ajustes").upsert(
        {
          player_id: playerId,
          public_profile: false,
          public_photo: false,
          future_schedule_public: false,
          marketing: false,
          updated_at: now,
        },
        { onConflict: "player_id" },
      );
    }

    return flags;
  }

  static async registrarResponsable(
    playerId: string,
    datos: ResponsableInput,
  ): Promise<{ token: string; consent_url: string; expires_at: string }> {
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("perfiles")
      .select("id, es_menor, cuenta_estado, fecha_nacimiento, nombre, apellido")
      .eq("id", playerId)
      .single();

    if (perfilError || !perfil) {
      throw new Error("Perfil no encontrado.");
    }

    if (!perfil.es_menor && perfil.fecha_nacimiento) {
      // Recalcular por si el flag está desfasado
      if (!esMenorDeEdad(perfil.fecha_nacimiento)) {
        throw new Error("Esta cuenta no requiere responsable parental.");
      }
    }

    const dni = normalizarDni(datos.dni);
    if (!dni || dni.length < 7) {
      throw new Error("DNI del responsable inválido.");
    }
    if (!datos.email?.includes("@")) {
      throw new Error("Email del responsable inválido.");
    }
    if (!datos.nombre?.trim() || !datos.apellido?.trim()) {
      throw new Error("Nombre y apellido del responsable son obligatorios.");
    }
    if (!datos.telefono?.trim()) {
      throw new Error("Teléfono del responsable es obligatorio.");
    }
    if (!datos.vinculo?.trim()) {
      throw new Error("El vínculo con el menor es obligatorio.");
    }

    const { data: guardian, error: gError } = await supabaseAdmin
      .from("responsables_parentales")
      .insert({
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        dni,
        email: datos.email.trim().toLowerCase(),
        telefono: datos.telefono.trim(),
        vinculo: datos.vinculo.trim(),
      })
      .select("id")
      .single();

    if (gError || !guardian) {
      throw new Error(
        `No se pudo registrar al responsable: ${gError?.message || "error"}`,
      );
    }

    const token = generarToken();
    const expires = new Date();
    expires.setDate(expires.getDate() + TOKEN_PARENTAL_DIAS_VALIDEZ);

    // Invalidar vínculos pendientes previos
    await supabaseAdmin
      .from("jugador_responsable")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("player_id", playerId)
      .eq("status", "pending");

    const { error: linkError } = await supabaseAdmin
      .from("jugador_responsable")
      .insert({
        player_id: playerId,
        guardian_id: guardian.id,
        vinculo: datos.vinculo.trim(),
        status: "pending",
        token,
        token_expires_at: expires.toISOString(),
        verification_method: "token_link",
      });

    if (linkError) {
      throw new Error(
        `No se pudo vincular al responsable: ${linkError.message}`,
      );
    }

    await supabaseAdmin
      .from("perfiles")
      .update({
        es_menor: true,
        cuenta_estado: "PENDING_PARENTAL_CONSENT",
      })
      .eq("id", playerId);

    return {
      token,
      consent_url: MenoresService.buildConsentUrl(token),
      expires_at: expires.toISOString(),
    };
  }

  static async obtenerConsentimientoPorToken(token: string) {
    const { data: link, error } = await supabaseAdmin
      .from("jugador_responsable")
      .select(
        `
        id,
        player_id,
        guardian_id,
        status,
        token_expires_at,
        verification_method,
        vinculo,
        responsables_parentales (
          id, nombre, apellido, email, vinculo
        ),
        perfiles!player_id (
          id, nombre, apellido, fecha_nacimiento, es_menor, cuenta_estado
        )
      `,
      )
      .eq("token", token)
      .maybeSingle();

    if (error || !link) {
      throw new Error("Enlace de consentimiento inválido o inexistente.");
    }

    if (link.status === "verified") {
      return {
        estado: "ya_verificado" as const,
        jugador: MenoresService.sanitizarJugadorPublico(link.perfiles),
      };
    }

    if (link.status !== "pending") {
      throw new Error("Este enlace ya no está disponible.");
    }

    if (new Date(link.token_expires_at) < new Date()) {
      throw new Error("El enlace de consentimiento expiró. Solicitá uno nuevo.");
    }

    const [consentDoc, privMenores] = await Promise.all([
      LegalService.obtenerActivo("consentimiento_parental"),
      LegalService.obtenerActivo("privacidad_menores"),
    ]);

    return {
      estado: "pendiente" as const,
      link_id: link.id,
      jugador: MenoresService.sanitizarJugadorPublico(link.perfiles),
      responsable: link.responsables_parentales,
      documentos: {
        consentimiento_parental: consentDoc,
        privacidad_menores: privMenores,
      },
    };
  }

  private static sanitizarJugadorPublico(perfil: unknown) {
    const p = perfil as {
      id?: string;
      nombre?: string;
      apellido?: string;
      fecha_nacimiento?: string;
    } | null;
    if (!p) return null;
    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      // Solo año para contexto, no fecha completa
      anio_nacimiento: p.fecha_nacimiento
        ? new Date(p.fecha_nacimiento).getFullYear()
        : null,
      edad_aprox: p.fecha_nacimiento
        ? calcularEdadActual(p.fecha_nacimiento)
        : null,
    };
  }

  static async confirmarConsentimiento(
    token: string,
    input: ConfirmarConsentimientoInput,
  ) {
    if (
      !input.declara_representacion ||
      !input.consentimiento_esencial ||
      !input.leyo_privacidad_menores
    ) {
      throw new Error(
        "Debés aceptar las declaraciones obligatorias para continuar.",
      );
    }

    const { data: link, error } = await supabaseAdmin
      .from("jugador_responsable")
      .select("id, player_id, guardian_id, status, token_expires_at")
      .eq("token", token)
      .maybeSingle();

    if (error || !link) {
      throw new Error("Enlace de consentimiento inválido.");
    }
    if (link.status === "verified") {
      return { exito: true, mensaje: "El consentimiento ya estaba registrado." };
    }
    if (link.status !== "pending") {
      throw new Error("Este enlace ya no está disponible.");
    }
    if (new Date(link.token_expires_at) < new Date()) {
      throw new Error("El enlace expiró.");
    }

    const versions = await LegalService.obtenerVersionesActivas();
    const consentVersion =
      versions.consentimiento_parental?.version ||
      LEGAL_VERSIONES_PILOTO.consentimiento_parental;
    const privVersion =
      versions.privacidad_menores?.version ||
      LEGAL_VERSIONES_PILOTO.privacidad_menores;
    const now = new Date().toISOString();

    await MenoresService.insertConsentEvent({
      player_id: link.player_id,
      guardian_id: link.guardian_id,
      tipo: "ESSENTIAL",
      status: "GRANTED",
      policy_version: consentVersion,
      verification_method: "token_link",
      metadata: {
        declara_representacion: true,
        leyo_privacidad_menores: true,
        privacidad_menores_version: privVersion,
      },
    });

    await MenoresService.insertConsentEvent({
      player_id: link.player_id,
      guardian_id: link.guardian_id,
      tipo: "FUNCTIONAL_COMMS",
      status: "GRANTED",
      policy_version: consentVersion,
      verification_method: "token_link",
    });

    // PHOTO siempre DENIED en MVP
    await MenoresService.insertConsentEvent({
      player_id: link.player_id,
      guardian_id: link.guardian_id,
      tipo: "PHOTO",
      status: "DENIED",
      policy_version: consentVersion,
      verification_method: "token_link",
      metadata: { motivo: "mvp_foto_deshabilitada" },
    });

    // MARKETING denegado por defecto
    await MenoresService.insertConsentEvent({
      player_id: link.player_id,
      guardian_id: link.guardian_id,
      tipo: "MARKETING",
      status: "DENIED",
      policy_version: consentVersion,
      verification_method: "token_link",
    });

    const autorizaPublico = Boolean(input.autoriza_perfil_publico);
    await MenoresService.insertConsentEvent({
      player_id: link.player_id,
      guardian_id: link.guardian_id,
      tipo: "PUBLIC_PROFILE",
      status: autorizaPublico ? "GRANTED" : "DENIED",
      policy_version: consentVersion,
      verification_method: "token_link",
    });

    await supabaseAdmin
      .from("jugador_responsable")
      .update({
        status: "verified",
        verified_at: now,
        updated_at: now,
      })
      .eq("id", link.id);

    await supabaseAdmin.from("privacidad_ajustes").upsert(
      {
        player_id: link.player_id,
        public_profile: autorizaPublico,
        public_photo: false,
        future_schedule_public: false,
        marketing: false,
        updated_at: now,
      },
      { onConflict: "player_id" },
    );

    await supabaseAdmin
      .from("perfiles")
      .update({
        es_menor: true,
        cuenta_estado: "ACTIVE_MINOR_RESTRICTED",
        perfil_publico_habilitado: autorizaPublico,
        marketing_opt_in: false,
      })
      .eq("id", link.player_id);

    return {
      exito: true,
      mensaje:
        "Consentimiento parental registrado. La cuenta quedó en modo de protección para menores.",
      perfil_publico: autorizaPublico,
    };
  }

  static async registrarAsentimiento(playerId: string, input: AsentimientoInput) {
    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("id, es_menor, cuenta_estado, perfil_publico_habilitado")
      .eq("id", playerId)
      .single();

    if (!perfil?.es_menor) {
      throw new Error("El asentimiento aplica solo a cuentas de menores.");
    }
    if (!input.entiende_datos) {
      throw new Error("Debés confirmar que entendiste el uso de tus datos.");
    }

    const versions = await LegalService.obtenerVersionesActivas();
    const policyVersion =
      versions.privacidad_menores?.version ||
      LEGAL_VERSIONES_PILOTO.privacidad_menores;

    await MenoresService.insertConsentEvent({
      player_id: playerId,
      guardian_id: null,
      tipo: "MINOR_ASSENT",
      status: "GRANTED",
      policy_version: policyVersion,
      actor_id: playerId,
      metadata: { entiende_datos: true },
    });

    // Oposición del menor a perfil público prevalece
    if (input.acepta_perfil_publico === false && perfil.perfil_publico_habilitado) {
      await MenoresService.revocarAutorizacion(playerId, "PUBLIC_PROFILE", playerId);
      return {
        exito: true,
        mensaje:
          "Registramos tu asentimiento. Ocultamos el perfil público por tu oposición.",
      };
    }

    if (input.acepta_perfil_publico === true) {
      await MenoresService.insertConsentEvent({
        player_id: playerId,
        guardian_id: null,
        tipo: "PUBLIC_PROFILE",
        status: "GRANTED",
        policy_version: policyVersion,
        actor_id: playerId,
        metadata: { origen: "asentimiento_menor" },
      });
    }

    return { exito: true, mensaje: "Asentimiento registrado." };
  }

  static async obtenerAutorizaciones(playerId: string, requesterId: string) {
    await MenoresService.assertPuedeVerAutorizaciones(playerId, requesterId);

    const { data: eventos } = await supabaseAdmin
      .from("consentimiento_eventos")
      .select(
        "id, tipo, status, policy_version, created_at, revoked_at, verification_method, metadata",
      )
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    const { data: ajustes } = await supabaseAdmin
      .from("privacidad_ajustes")
      .select("*")
      .eq("player_id", playerId)
      .maybeSingle();

    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, es_menor, cuenta_estado, perfil_publico_habilitado, marketing_opt_in, fecha_nacimiento",
      )
      .eq("id", playerId)
      .single();

    const vigentes = MenoresService.resumenConsentimientosVigentes(eventos || []);

    return {
      perfil,
      ajustes: ajustes || {
        public_profile: false,
        public_photo: false,
        future_schedule_public: false,
        marketing: false,
      },
      vigentes,
      historial: eventos || [],
    };
  }

  static async revocarAutorizacion(
    playerId: string,
    tipo: ConsentTipo,
    actorId: string | null,
  ) {
    if (tipo === "ESSENTIAL" || tipo === "FUNCTIONAL_COMMS") {
      throw new Error(
        "El consentimiento esencial no se puede revocar desde esta vía.",
      );
    }
    if (tipo === "PHOTO") {
      // Ya está denegado en MVP; registrar evento igual
    }

    const versions = await LegalService.obtenerVersionesActivas();
    const policyVersion =
      versions.consentimiento_parental?.version ||
      LEGAL_VERSIONES_PILOTO.consentimiento_parental;
    const now = new Date().toISOString();

    await MenoresService.insertConsentEvent({
      player_id: playerId,
      guardian_id: null,
      tipo,
      status: "REVOKED",
      policy_version: policyVersion,
      actor_id: actorId,
      revoked_at: now,
      revoked_by: actorId,
    });

    if (tipo === "PUBLIC_PROFILE") {
      await supabaseAdmin
        .from("perfiles")
        .update({
          perfil_publico_habilitado: false,
          cuenta_estado: "CONSENT_PARTIALLY_REVOKED",
        })
        .eq("id", playerId);

      await supabaseAdmin.from("privacidad_ajustes").upsert(
        {
          player_id: playerId,
          public_profile: false,
          public_photo: false,
          future_schedule_public: false,
          marketing: false,
          updated_at: now,
        },
        { onConflict: "player_id" },
      );
    }

    if (tipo === "MARKETING") {
      await supabaseAdmin
        .from("perfiles")
        .update({ marketing_opt_in: false })
        .eq("id", playerId);
      await supabaseAdmin
        .from("privacidad_ajustes")
        .update({ marketing: false, updated_at: now })
        .eq("player_id", playerId);
    }

    return { exito: true, mensaje: `Autorización ${tipo} revocada.` };
  }

  /** En /me y login: detectar mayoría de edad. */
  static async sincronizarTransicionEdad(playerId: string) {
    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("id, fecha_nacimiento, es_menor, cuenta_estado")
      .eq("id", playerId)
      .maybeSingle();

    if (!perfil?.fecha_nacimiento) return perfil;

    const menor = esMenorDeEdad(perfil.fecha_nacimiento);

    if (perfil.es_menor && !menor) {
      await supabaseAdmin
        .from("perfiles")
        .update({
          es_menor: false,
          cuenta_estado: "ADULT_TRANSITION_PENDING",
        })
        .eq("id", playerId);
      return {
        ...perfil,
        es_menor: false,
        cuenta_estado: "ADULT_TRANSITION_PENDING",
      };
    }

    if (!perfil.es_menor && menor) {
      await supabaseAdmin
        .from("perfiles")
        .update({
          es_menor: true,
          cuenta_estado: "PENDING_PARENTAL_CONSENT",
          perfil_publico_habilitado: false,
          marketing_opt_in: false,
        })
        .eq("id", playerId);
    }

    return perfil;
  }

  static async completarTransicionAdulto(playerId: string) {
    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("fecha_nacimiento, cuenta_estado")
      .eq("id", playerId)
      .single();

    if (!perfil?.fecha_nacimiento || esMenorDeEdad(perfil.fecha_nacimiento)) {
      throw new Error("La cuenta aún no alcanzó la mayoría de edad.");
    }

    await supabaseAdmin
      .from("perfiles")
      .update({
        es_menor: false,
        cuenta_estado: "ACTIVE_ADULT",
      })
      .eq("id", playerId);

    return { exito: true, mensaje: "Cuenta actualizada al régimen adulto." };
  }

  static async assertCuentaPuedeCompetir(playerId: string) {
    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("es_menor, cuenta_estado")
      .eq("id", playerId)
      .single();

    if (!perfil) throw new Error("Perfil no encontrado.");

    if (
      perfil.es_menor &&
      perfil.cuenta_estado === "PENDING_PARENTAL_CONSENT"
    ) {
      throw new Error(
        "La cuenta del menor está pendiente de consentimiento parental. No puede inscribirse hasta completar el flujo.",
      );
    }
    if (perfil.cuenta_estado === "SUSPENDED_MINOR") {
      throw new Error("La cuenta está suspendida hasta revisión.");
    }
    if (perfil.cuenta_estado === "DRAFT_MINOR") {
      throw new Error("Completá el registro del menor antes de continuar.");
    }
  }

  /** ¿Puede un usuario iniciar chat directo con un menor? */
  static async puedeIniciarChatConMenor(
    iniciadorId: string,
    menorId: string,
    tipo: string,
  ): Promise<{ permitido: boolean; motivo?: string }> {
    if (iniciadorId === menorId) {
      return { permitido: false, motivo: "No podés chatear con vos mismo." };
    }

    if (tipo === "soporte") {
      return { permitido: true };
    }

    if (tipo === "marketplace") {
      return {
        permitido: false,
        motivo:
          "No se permite chat de marketplace con cuentas de menores.",
      };
    }

    const { data: iniciador } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, es_menor, club_id")
      .eq("id", iniciadorId)
      .single();

    if (!iniciador) {
      return { permitido: false, motivo: "Usuario iniciador no encontrado." };
    }

    if (esRolAdministrativo(iniciador.rol)) {
      return { permitido: true };
    }

    // Menor a menor: permitir
    if (iniciador.es_menor) {
      return { permitido: true };
    }

    // Compañero de inscripción activa en mismo torneo
    const { data: insMenor } = await supabaseAdmin
      .from("inscripciones")
      .select("torneo_id, pareja_id")
      .eq("usuario_id", menorId)
      .in("estado", ["pendiente", "confirmado", "pagado", "habilitado"]);

    if (insMenor && insMenor.length > 0) {
      const torneoIds = insMenor.map((i) => i.torneo_id);
      const { data: compartidas } = await supabaseAdmin
        .from("inscripciones")
        .select("id")
        .eq("usuario_id", iniciadorId)
        .in("torneo_id", torneoIds)
        .in("estado", ["pendiente", "confirmado", "pagado", "habilitado"])
        .limit(1);

      if (compartidas && compartidas.length > 0) {
        return { permitido: true };
      }
    }

    // Mismo club
    const { data: menor } = await supabaseAdmin
      .from("perfiles")
      .select("club_id")
      .eq("id", menorId)
      .single();

    if (
      iniciador.club_id &&
      menor?.club_id &&
      iniciador.club_id === menor.club_id
    ) {
      return { permitido: true };
    }

    return {
      permitido: false,
      motivo:
        "No podés iniciar un chat privado con un menor sin vínculo deportivo o institucional.",
    };
  }

  private static async insertConsentEvent(row: {
    player_id: string;
    guardian_id: string | null;
    tipo: ConsentTipo;
    status: string;
    policy_version: string;
    verification_method?: string;
    actor_id?: string | null;
    metadata?: Record<string, unknown>;
    revoked_at?: string;
    revoked_by?: string | null;
  }) {
    const { error } = await supabaseAdmin.from("consentimiento_eventos").insert({
      player_id: row.player_id,
      guardian_id: row.guardian_id,
      tipo: row.tipo,
      status: row.status,
      policy_version: row.policy_version,
      verification_method: row.verification_method || null,
      actor_id: row.actor_id || null,
      metadata: row.metadata || {},
      revoked_at: row.revoked_at || null,
      revoked_by: row.revoked_by || null,
    });
    if (error) {
      throw new Error(`Error al registrar consentimiento: ${error.message}`);
    }
  }

  private static resumenConsentimientosVigentes(
    eventos: Array<{ tipo: string; status: string; created_at: string }>,
  ) {
    const latest: Record<string, string> = {};
    for (const e of eventos) {
      if (!latest[e.tipo]) latest[e.tipo] = e.status;
    }
    return latest;
  }

  private static async assertPuedeVerAutorizaciones(
    playerId: string,
    requesterId: string,
  ) {
    if (playerId === requesterId) return;

    const { data: requester } = await supabaseAdmin
      .from("perfiles")
      .select("rol")
      .eq("id", requesterId)
      .single();

    if (esRolAdministrativo(requester?.rol)) return;

    // Tutor verificado del jugador
    const { data: links } = await supabaseAdmin
      .from("jugador_responsable")
      .select("id, guardian_id, responsables_parentales(email)")
      .eq("player_id", playerId)
      .eq("status", "verified");

    const { data: reqPerfil } = await supabaseAdmin
      .from("perfiles")
      .select("email")
      .eq("id", requesterId)
      .single();

    const emailReq = reqPerfil?.email?.toLowerCase();
    const esTutor = (links || []).some((l) => {
      const g = l.responsables_parentales as { email?: string } | null;
      return g?.email?.toLowerCase() === emailReq;
    });

    if (esTutor) return;

    throw new Error("No tenés permiso para ver estas autorizaciones.");
  }
}

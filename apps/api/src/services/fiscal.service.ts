import { randomInt } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import { esRolAdministrativo } from "../constants/roles";

export interface FiscalPayload {
  nombre: string;
  apellido: string;
  dni: string;
  rango: 'Nacional' | 'Provincial' | 'Regional' | 'Local';
  entidad_carga?: string;
  usuario_id?: string | null;
  correo?: string;
  direccion?: string;
}

function mismoNombrePersona(
  a: { nombre?: string | null; apellido?: string | null },
  b: { nombre?: string | null; apellido?: string | null } | null,
): boolean {
  if (!b) return false;
  const norm = (s?: string | null) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  return norm(a.nombre) === norm(b.nombre) && norm(a.apellido) === norm(b.apellido);
}

export interface AccesoFiscalResultado {
  fiscal_id: string;
  email: string;
  password_temporal: string | null;
  modo: "creado" | "restablecido" | "vinculado";
  mensaje: string;
}

export class FiscalService {
  static async listarFiscales() {
    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .select("*")
      .order("apellido", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async crearFiscal(datos: FiscalPayload) {
    // Buscar si el usuario ya existe con ese DNI para vincularlo de inmediato
    let usuarioId = datos.usuario_id || null;
    if (!usuarioId) {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("id, nombre, apellido")
        .eq("dni", datos.dni)
        .maybeSingle();
      if (perfil && mismoNombrePersona(datos, perfil)) {
        usuarioId = perfil.id;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .insert([
        {
          nombre: datos.nombre,
          apellido: datos.apellido,
          dni: datos.dni,
          rango: datos.rango,
          entidad_carga: datos.entidad_carga,
          correo: datos.correo || null,
          direccion: datos.direccion || null,
          usuario_id: usuarioId,
          activo: true,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear fiscal: ${error.message}`);
    return data;
  }

  static async actualizarFiscal(id: string, datos: Partial<FiscalPayload & { direccion?: string; correo?: string }>) {
    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .update({
        nombre: datos.nombre,
        apellido: datos.apellido,
        dni: datos.dni,
        rango: datos.rango,
        direccion: datos.direccion,
        correo: datos.correo,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar fiscal: ${error.message}`);
    return data;
  }

  static async cambiarEstadoFiscal(id: string, activo: boolean) {
    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .update({ activo })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al cambiar estado de fiscal: ${error.message}`);
    return data;
  }

  static generarPasswordTemporal(): string {
    return `Fiscal-${randomInt(100000, 999999)}`;
  }

  /**
   * Crea o restablece el login del fiscal (email + contraseña temporal).
   * El Colegio entrega esas credenciales; no se vuelven a leer después.
   */
  static async habilitarAcceso(
    fiscalId: string,
    email?: string,
    password?: string,
  ): Promise<AccesoFiscalResultado> {
    const { data: fiscal, error: errF } = await supabaseAdmin
      .from("fiscales")
      .select("*")
      .eq("id", fiscalId)
      .single();

    if (errF || !fiscal) {
      throw new Error("Fiscal no encontrado.");
    }

    const correo = String(email || fiscal.correo || "")
      .trim()
      .toLowerCase();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      throw new Error("Indicá un correo válido para crear el acceso al panel.");
    }

    const passwordFinal = String(password || "").trim() || this.generarPasswordTemporal();
    if (passwordFinal.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }

    if (fiscal.usuario_id) {
      const { error: errAuth } = await supabaseAdmin.auth.admin.updateUserById(
        fiscal.usuario_id,
        { email: correo, password: passwordFinal, email_confirm: true },
      );
      if (errAuth) {
        throw new Error(`No se pudo actualizar el acceso: ${errAuth.message}`);
      }

      await supabaseAdmin
        .from("perfiles")
        .update({ email: correo })
        .eq("id", fiscal.usuario_id);
      await supabaseAdmin
        .from("fiscales")
        .update({ correo })
        .eq("id", fiscalId);

      return {
        fiscal_id: fiscalId,
        email: correo,
        password_temporal: passwordFinal,
        modo: "restablecido",
        mensaje: "Se restableció la contraseña. Copiala ahora; no se vuelve a mostrar.",
      };
    }

    const { data: porDni } = await supabaseAdmin
      .from("perfiles")
      .select("id, email, rol, dni, nombre, apellido")
      .eq("dni", fiscal.dni)
      .maybeSingle();

    const { data: porEmail } = await supabaseAdmin
      .from("perfiles")
      .select("id, email, rol, dni, nombre, apellido")
      .eq("email", correo)
      .maybeSingle();

    if (porDni && porEmail && porDni.id !== porEmail.id) {
      throw new Error(
        "Ese correo ya pertenece a otro usuario distinto al DNI del fiscal.",
      );
    }

    const perfilCandidato = porDni || porEmail;
    const perfilEsLaMismaPersona =
      Boolean(perfilCandidato) &&
      mismoNombrePersona(fiscal, perfilCandidato);

    if (perfilCandidato && !perfilEsLaMismaPersona) {
      throw new Error(
        `Ese DNI o correo ya pertenece a ${perfilCandidato.apellido || ""}, ${perfilCandidato.nombre || "otro usuario"}. Usá otro correo para el acceso del fiscal; no se vincula la ficha de un jugador distinto.`,
      );
    }

    const perfilExistente = perfilEsLaMismaPersona ? perfilCandidato : null;

    if (perfilExistente) {
      if (esRolAdministrativo(perfilExistente.rol)) {
        await supabaseAdmin
          .from("fiscales")
          .update({ usuario_id: perfilExistente.id, correo })
          .eq("id", fiscalId);

        return {
          fiscal_id: fiscalId,
          email: perfilExistente.email || correo,
          password_temporal: null,
          modo: "vinculado",
          mensaje:
            "Este fiscal ya tiene un usuario administrativo. Entrá con ese email y contraseña; no se modificó la clave.",
        };
      }

      const { error: errAuth } = await supabaseAdmin.auth.admin.updateUserById(
        perfilExistente.id,
        { email: correo, password: passwordFinal, email_confirm: true },
      );
      if (errAuth) {
        throw new Error(`No se pudo actualizar el usuario existente: ${errAuth.message}`);
      }

      await supabaseAdmin
        .from("perfiles")
        .update({ email: correo, dni: fiscal.dni })
        .eq("id", perfilExistente.id);
      await supabaseAdmin
        .from("fiscales")
        .update({ usuario_id: perfilExistente.id, correo })
        .eq("id", fiscalId);

      return {
        fiscal_id: fiscalId,
        email: correo,
        password_temporal: passwordFinal,
        modo: "vinculado",
        mensaje: "Se vinculó el usuario existente y se generó una contraseña temporal.",
      };
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: correo,
        password: passwordFinal,
        email_confirm: true,
        app_metadata: { rol: "usuario" },
        user_metadata: {
          nombre: fiscal.nombre,
          apellido: fiscal.apellido,
          dni: fiscal.dni,
        },
      });

    if (authError || !authData.user) {
      throw new Error(authError?.message || "No se pudo crear el usuario de acceso.");
    }

    const userId = authData.user.id;
    const { error: perfilError } = await supabaseAdmin.from("perfiles").upsert(
      {
        id: userId,
        email: correo,
        nombre: fiscal.nombre,
        apellido: fiscal.apellido,
        dni: fiscal.dni,
        rol: "usuario",
      },
      { onConflict: "id" },
    );

    if (perfilError) {
      console.error("Acceso Auth creado, falló el perfil:", perfilError.message);
    }

    await supabaseAdmin
      .from("fiscales")
      .update({ usuario_id: userId, correo })
      .eq("id", fiscalId);

    return {
      fiscal_id: fiscalId,
      email: correo,
      password_temporal: passwordFinal,
      modo: "creado",
      mensaje: "Acceso creado. Copiá email y contraseña ahora; no se vuelven a mostrar.",
    };
  }

  static async buscarPorDni(dni: string) {
    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .select("*")
      .eq("dni", dni)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  static async obtenerFiscalesTorneo(torneoId: string) {
    const { data, error } = await supabaseAdmin
      .from("torneo_fiscales")
      .select("fiscal_id, rol, fiscales(*)")
      .eq("torneo_id", torneoId);

    if (error) throw new Error(error.message);
    return (data || [])
      .map((tf: any) =>
        tf.fiscales
          ? { ...tf.fiscales, rol_torneo: tf.rol || "auxiliar" }
          : null,
      )
      .filter(Boolean);
  }

  static async asignarFiscalesTorneo(
    torneoId: string,
    items: string[],
    rolesById?: Record<string, "general" | "auxiliar">,
  ) {
    if (!items || items.length === 0) {
      await supabaseAdmin.from("torneo_fiscales").delete().eq("torneo_id", torneoId);
      return [];
    }

    // 1. Buscar los fiscales por ID o DNI
    const { data: fiscales, error: errF } = await supabaseAdmin
      .from("fiscales")
      .select("id, dni")
      .or(`id.in.(${items.map((i) => `"${i}"`).join(",")}),dni.in.(${items.map((i) => `"${i}"`).join(",")})`);

    if (errF) throw new Error(errF.message);
    if (!fiscales || fiscales.length === 0) {
      throw new Error("No se encontraron fiscales con los parámetros provistos.");
    }

    // 2. Limpiar asignaciones previas
    await supabaseAdmin
      .from("torneo_fiscales")
      .delete()
      .eq("torneo_id", torneoId);

    // 3. Insertar nuevas asignaciones (máx. 1 fiscal general)
    let generalAsignado = false;
    const inserts = fiscales.map((f) => {
      const requested = rolesById?.[f.id] || "auxiliar";
      let rol: "general" | "auxiliar" = requested;
      if (rol === "general") {
        if (generalAsignado) rol = "auxiliar";
        else generalAsignado = true;
      }
      return {
        torneo_id: torneoId,
        fiscal_id: f.id,
        rol,
      };
    });

    const { error: errIns } = await supabaseAdmin
      .from("torneo_fiscales")
      .insert(inserts);

    if (errIns) throw new Error(errIns.message);

    return fiscales;
  }
}

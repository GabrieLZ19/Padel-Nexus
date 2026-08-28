import { supabaseAdmin } from "../config/supabase";
import {
  parseNombreCompleto,
  normalizarDni,
  type FilaPlanillaInscripcion,
} from "../utils/inscripcionPlanilla";
import { randomBytes } from "crypto";

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
}

export class PerfilService {
  /**
   * Obtiene la ficha técnica completa de un jugador con sus licencias y afiliaciones
   */
  static async obtenerPerfilCompleto(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select("*, licencias:licencias!fk_licencias_usuario(*), afiliaciones:afiliaciones!fk_afiliaciones_usuario(*), clubes:clubes!perfiles_club_id_fkey(id, nombre)")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("🔴 ERROR EN OBTENER_PERFIL_COMPLETO:", error);
      throw new Error("Perfil de usuario no encontrado en la plataforma.");
    }

    // Mapear fecha_vencimiento a vencimiento para cumplir con la documentación de Afiliaciones Múltiples (1:N)
    if (data.afiliaciones && Array.isArray(data.afiliaciones)) {
      data.afiliaciones = data.afiliaciones.map((af: any) => ({
        ...af,
        vencimiento: af.fecha_vencimiento,
      }));
    }

    return data;
  }

  /**
   * Ficha pública: sin datos sensibles de contacto ni documento.
   */
  static async obtenerPerfilPublico(userId: string) {
    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .select(
        "id, nombre, apellido, avatar_url, categoria_padel, lado_preferido, lugar_residencia, sexo, clubes:clubes!perfiles_club_id_fkey(id, nombre)",
      )
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new Error("Perfil de usuario no encontrado en la plataforma.");
    }

    return data;
  }

  /**
   * Actualiza los datos permitidos de la ficha del perfil del usuario logueado
   */
  static async actualizarDatosPerfil(
    userId: string,
    datos: ActualizarPerfilDTO,
  ) {
    const capitalizarTexto = (texto?: string) => {
      if (!texto) return undefined;
      return texto
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    const nombreCapitalizado = capitalizarTexto(datos.nombre);
    const apellidoCapitalizado = capitalizarTexto(datos.apellido);

    const { data, error } = await supabaseAdmin
      .from("perfiles")
      .update({
        nombre: nombreCapitalizado !== undefined ? nombreCapitalizado : undefined,
        apellido: apellidoCapitalizado !== undefined ? apellidoCapitalizado : undefined,
        telefono: datos.telefono,
        categoria_padel: datos.categoria_padel,
        lado_preferido: datos.lado_preferido,
        lugar_residencia: datos.lugar_residencia,
        dni: datos.dni,
        sexo: datos.sexo,
        fecha_nacimiento: datos.fecha_nacimiento || null,
        avatar_url: datos.avatar_url,
      })
      .eq("id", userId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(
        `No se pudieron actualizar los datos del perfil: ${error?.message}`,
      );
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
    if (!texto) return "";
    return texto
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private static emailPlaceholderDesdeDni(dni: string): string {
    return `preinscripto+${dni}@padelnexus.local`;
  }

  /**
   * Busca un perfil pre-cargado desde planilla por DNI (flujo de activación).
   */
  static async buscarPreinscripcionPorDni(dni: string) {
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
    if (!data) {
      return { encontrado: false as const };
    }

    if (!data.pendiente_activacion) {
      return {
        encontrado: true as const,
        pendiente_activacion: false as const,
        mensaje: "Este DNI ya tiene una cuenta activa. Iniciá sesión o recuperá tu contraseña.",
      };
    }

    return {
      encontrado: true as const,
      pendiente_activacion: true as const,
      perfil: {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email?.includes("@padelnexus.local")
          ? ""
          : data.email,
        telefono: data.telefono,
        dni: data.dni,
        lugar_residencia: data.lugar_residencia,
        categoria_padel: data.categoria_padel,
        lado_preferido: data.lado_preferido || "indistinto",
        fecha_nacimiento: data.fecha_nacimiento,
        sexo: data.sexo || "masculino",
      },
    };
  }

  /**
   * Crea o actualiza un jugador a partir de una fila de planilla.
   */
  static async resolverJugadorDesdePlanilla(fila: FilaPlanillaInscripcion) {
    const dni = normalizarDni(fila.dni);
    if (!dni || dni.length < 7) {
      throw new Error(
        `Fila ${fila.fila}: el DNI es obligatorio para importar inscripciones.`,
      );
    }

    const { apellido, nombre } = parseNombreCompleto(fila.apellidoNombre);
    if (!apellido && !nombre) {
      throw new Error(
        `Fila ${fila.fila}: el apellido y nombre son obligatorios.`,
      );
    }

    const email =
      fila.email && !fila.email.includes("@padelnexus.local")
        ? fila.email.toLowerCase()
        : PerfilService.emailPlaceholderDesdeDni(dni);

    const { data: existente } = await supabaseAdmin
      .from("perfiles")
      .select("id, nombre, apellido, email, pendiente_activacion")
      .eq("dni", dni)
      .maybeSingle();

    if (existente) {
      const patch: Record<string, unknown> = {};
      if (!existente.nombre && nombre) patch.nombre = PerfilService.capitalizarTexto(nombre);
      if (!existente.apellido && apellido)
        patch.apellido = PerfilService.capitalizarTexto(apellido);
      if (fila.telefono) patch.telefono = fila.telefono;
      if (fila.direccion) patch.lugar_residencia = fila.direccion;
      if (fila.categoria) patch.categoria_padel = fila.categoria;
      if (fila.fechaNacimiento) patch.fecha_nacimiento = fila.fechaNacimiento;

      if (Object.keys(patch).length > 0) {
        await supabaseAdmin.from("perfiles").update(patch).eq("id", existente.id);
      }

      return {
        id: existente.id,
        nombre: existente.nombre,
        apellido: existente.apellido,
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
        `Fila ${fila.fila}: no se pudo crear el jugador (${authError?.message || "error desconocido"}).`,
      );
    }

    const userId = authUser.user.id;
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
          lugar_residencia: fila.direccion || "A completar",
          categoria_padel: fila.categoria || "5ª",
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
        `Fila ${fila.fila}: no se pudo guardar el perfil del jugador.`,
      );
    }

    return { ...perfil, creado: true };
  }
}

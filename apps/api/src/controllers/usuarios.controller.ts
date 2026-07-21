import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import type { RolUsuario } from "../constants/roles";

// Roles que se pueden crear desde el panel (nunca superadmin)
const ROLES_CREABLES: RolUsuario[] = [
  "admin",
  "admin_club",
  "admin_provincial",
  "admin_federacion",
];

interface CrearUsuarioDTO {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  club_id?: string | null;
  provincia?: string | null;
}

export const UsuariosController = {
  /**
   * POST /api/admin/usuarios
   * Crea un usuario administrativo con supabaseAdmin.auth.admin.createUser()
   * para que no requiera verificación de email.
   */
  async crearUsuario(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, nombre, apellido, rol, club_id, provincia } =
        req.body as CrearUsuarioDTO;

      // Validaciones
      if (!email || !password || !nombre || !apellido || !rol) {
        return res.status(400).json({
          exito: false,
          error: "Email, contraseña, nombre, apellido y rol son obligatorios.",
        });
      }

      if (!ROLES_CREABLES.includes(rol)) {
        return res.status(400).json({
          exito: false,
          error: `Rol inválido. Los roles permitidos son: ${ROLES_CREABLES.join(", ")}`,
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          exito: false,
          error: "La contraseña debe tener al menos 6 caracteres.",
        });
      }

      if (rol === "admin_club" && !club_id) {
        return res.status(400).json({
          exito: false,
          error: "Para el rol admin_club es obligatorio asignar un club.",
        });
      }

      // 1. Crear usuario en Supabase Auth con admin API (sin verificación de email)
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Marca el email como confirmado automáticamente
          app_metadata: { rol },
          user_metadata: {
            nombre,
            apellido,
          },
        });

      if (authError || !authData.user) {
        const msg = authError?.message || "Error al crear el usuario en Auth.";
        return res.status(400).json({ exito: false, error: msg });
      }

      const userId = authData.user.id;

      // 2. Upsert en tabla perfiles
      const perfilData: Record<string, unknown> = {
        id: userId,
        email,
        nombre,
        apellido,
        rol,
      };

      if (rol === "admin_club" && club_id) {
        perfilData.club_id = club_id;
      }

      if (rol === "admin_provincial" && provincia) {
        perfilData.lugar_residencia = provincia;
      }

      const { error: perfilError } = await supabaseAdmin
        .from("perfiles")
        .upsert(perfilData, { onConflict: "id" });

      if (perfilError) {
        console.error("⚠️ Error al crear perfil (usuario Auth ya creado):", perfilError);
        // No devolvemos error porque el usuario Auth ya se creó exitosamente
      }

      return res.status(201).json({
        exito: true,
        mensaje: `Usuario ${email} creado con rol ${rol}.`,
        data: {
          id: userId,
          email,
          nombre,
          apellido,
          rol,
          club_id: perfilData.club_id || null,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al crear usuario.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * GET /api/admin/usuarios
   * Lista todos los perfiles con rol administrativo. Acepta ?rol=xxx para filtrar.
   */
  async listarUsuarios(req: Request, res: Response): Promise<Response> {
    try {
      const filtroRol = req.query.rol as string | undefined;

      let query = supabaseAdmin
        .from("perfiles")
        .select("id, email, nombre, apellido, rol, club_id, lugar_residencia, created_at")
        .in("rol", [
          "admin",
          "admin_club",
          "admin_provincial",
          "admin_federacion",
          "superadmin",
        ])
        .order("created_at", { ascending: false });

      if (filtroRol && ROLES_CREABLES.includes(filtroRol as RolUsuario)) {
        query = query.eq("rol", filtroRol);
      }

      const { data: perfilesData, error } = await query;

      if (error) {
        return res.status(500).json({
          exito: false,
          error: `Error al consultar perfiles: ${error.message}`,
        });
      }

      // Consultar usuarios de Supabase Auth para verificar el estado de ban real
      const authUsersMap = new Map<string, boolean>();
      try {
        const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
        if (authUsersData && authUsersData.users) {
          authUsersData.users.forEach((u) => {
            const isBanned = Boolean(
              u.banned_until && new Date(u.banned_until) > new Date(),
            );
            authUsersMap.set(u.id, isBanned);
          });
        }
      } catch (authErr) {
        console.error("⚠️ Error consultando listUsers en Auth:", authErr);
      }

      const dataFinal = (perfilesData || []).map((p) => {
        const isBannedInAuth = authUsersMap.get(p.id);
        const isBannedInPerfil = Boolean((p as any).inhabilitado);
        return {
          ...p,
          inhabilitado:
            isBannedInAuth !== undefined ? isBannedInAuth : isBannedInPerfil,
        };
      });

      return res.status(200).json({
        exito: true,
        data: dataFinal,
        total: dataFinal.length,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al listar usuarios.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * PUT /api/admin/usuarios/:id
   * Actualiza datos personales y rol de un usuario existente en Auth y tabla perfiles.
   */
  async actualizarUsuario(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { nombre, apellido, email, rol, club_id, provincia } = req.body;

      if (!id) {
        return res.status(400).json({
          exito: false,
          error: "El ID del usuario es requerido.",
        });
      }

      const updateAuthAttributes: Record<string, any> = {};
      if (email) updateAuthAttributes.email = email;
      if (rol) {
        if (!ROLES_CREABLES.includes(rol)) {
          return res.status(400).json({
            exito: false,
            error: `Rol inválido. Los roles permitidos son: ${ROLES_CREABLES.join(", ")}`,
          });
        }
        updateAuthAttributes.app_metadata = { rol };
      }
      if (nombre || apellido) {
        updateAuthAttributes.user_metadata = {
          ...(nombre ? { nombre } : {}),
          ...(apellido ? { apellido } : {}),
        };
      }

      if (Object.keys(updateAuthAttributes).length > 0) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          updateAuthAttributes,
        );
        if (authError) {
          return res.status(400).json({
            exito: false,
            error: `Error al actualizar Auth: ${authError.message}`,
          });
        }
      }

      const updatePerfilData: Record<string, unknown> = {};
      if (nombre) updatePerfilData.nombre = nombre;
      if (apellido) updatePerfilData.apellido = apellido;
      if (email) updatePerfilData.email = email;
      if (rol) updatePerfilData.rol = rol;
      if (rol === "admin_club") {
        updatePerfilData.club_id = club_id || null;
      }
      if (rol === "admin_provincial") {
        updatePerfilData.lugar_residencia = provincia || null;
      }

      if (Object.keys(updatePerfilData).length > 0) {
        const { error: perfilError } = await supabaseAdmin
          .from("perfiles")
          .update(updatePerfilData)
          .eq("id", id);

        if (perfilError) {
          console.error("⚠️ Error al sincronizar perfil:", perfilError);
        }
      }

      return res.status(200).json({
        exito: true,
        mensaje: "Usuario actualizado con éxito.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar los datos del usuario.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * PATCH /api/admin/usuarios/:id/estado
   * Inhabilita (ban 100 años) o habilita un usuario administrativo.
   */
  async toggleEstadoUsuario(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { inhabilitado } = req.body;

      if (!id || typeof inhabilitado !== "boolean") {
        return res.status(400).json({
          exito: false,
          error: "ID de usuario e inhabilitado (boolean) son obligatorios.",
        });
      }

      // 100 años en Auth (876000h) si se inhabilita, o 'none' si se habilita
      const ban_duration = inhabilitado ? "876000h" : "none";

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        id,
        { ban_duration },
      );

      if (authError) {
        return res.status(400).json({
          exito: false,
          error: `Error al cambiar estado en Auth: ${authError.message}`,
        });
      }

      // Sincronizar campo en perfiles (si la columna existe, o para tracking de auditoría)
      try {
        await supabaseAdmin
          .from("perfiles")
          .update({ inhabilitado })
          .eq("id", id);
      } catch (e) {
        // Ignorar si la columna no existe en la tabla perfiles
      }

      return res.status(200).json({
        exito: true,
        mensaje: inhabilitado
          ? "Usuario inhabilitado con éxito."
          : "Usuario habilitado con éxito.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al modificar el estado del usuario.";
      return res.status(500).json({ exito: false, error: message });
    }
  },
};

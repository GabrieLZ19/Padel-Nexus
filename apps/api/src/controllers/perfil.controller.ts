import { Request, Response } from "express";
import { PerfilService, ActualizarPerfilDTO } from "../services/perfil.service";
import { AuthService, RegistroDTO } from "../services/auth.service";

export const PerfilController = {
  /**
   * GET /api/perfiles/me
   * Retorna el perfil del usuario autenticado leyendo el ID desde el token JWT
   */
  async getMiPerfil(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ exito: false, error: "Usuario no autorizado." });
      }

      const perfil = await PerfilService.obtenerPerfilCompleto(userId);
      return res.status(200).json({ exito: true, data: perfil });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al obtener tu perfil.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * GET /api/perfiles/:id
   * Permite a administradores consultar fichas técnicas de otros jugadores
   */
  async getPerfilById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ exito: false, error: "El ID del perfil es requerido." });
      }

      const perfil = await PerfilService.obtenerPerfilCompleto(id);
      return res.status(200).json({ exito: true, data: perfil });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al obtener el perfil solicitado.";
      return res.status(404).json({ exito: false, error: message });
    }
  },

  /**
   * PUT /api/perfiles/me
   * Modifica los datos personales del usuario autenticado
   */
  async updatePerfil(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ exito: false, error: "Usuario no autorizado." });
      }

      // Validamos y extraemos el DTO de actualización
      const datosActualizar: ActualizarPerfilDTO = req.body;

      const perfilActualizado = await PerfilService.actualizarDatosPerfil(
        userId,
        datosActualizar,
      );

      return res.status(200).json({
        exito: true,
        mensaje: "Perfil actualizado con éxito.",
        data: perfilActualizado,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar los datos de tu perfil.";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/perfiles/actualizar-password
   * Finaliza el blanqueo guardando la nueva contraseña
   */
  async ActualizarPassword(req: Request, res: Response): Promise<Response> {
    try {
      // El middleware 'authenticate' ya validó el token temporal de Supabase
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({
          exito: false,
          error:
            "La contraseña es obligatoria y debe tener al menos 6 caracteres.",
        });
      }

      const resultado = await AuthService.actualizarPassword(password);
      return res.status(200).json(resultado);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar la contraseña.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/perfiles/login
   * Endpoint centralizado de autenticación
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          exito: false,
          error: "Email y contraseña son obligatorios.",
        });
      }

      const result = await AuthService.login(email, password);

      return res.status(200).json({
        exito: true,
        mensaje: "Sesión iniciada correctamente.",
        usuario: result.usuario,
        token: result.token,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error en el proceso de autenticación.";
      return res.status(401).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/perfiles/registro
   * Registra una nueva ficha de jugador FAP [cite: Perfil_Service_Campos_FAP]
   */
  async registro(req: Request, res: Response): Promise<Response> {
    try {
      // Validamos y extraemos el DTO de registro completo [cite: Perfil_Service_Campos_FAP]
      const datosRegistro: RegistroDTO = req.body;

      // Validaciones básicas de negocio
      if (
        !datosRegistro.email ||
        !datosRegistro.password ||
        !datosRegistro.dni ||
        !datosRegistro.lugar_residencia
      ) {
        return res.status(400).json({
          exito: false,
          error:
            "Faltan datos obligatorios para el registro FAP (Email, Password, DNI, Residencia).",
        });
      }

      const resultado = await AuthService.registrar(datosRegistro);
      return res.status(201).json(resultado);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error en el proceso de registro.";
      // Generalmente 400 porque suele ser error de input o usuario duplicado
      return res.status(400).json({ exito: false, error: message });
    }
  },

  /**
   * POST /api/perfiles/recuperar-password
   * Inicia el flujo de blanqueo enviando el correo
   */
  async solicitarRecuperarPassword(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          exito: false,
          error: "El correo electrónico es obligatorio.",
        });
      }

      const resultado = await AuthService.solicitarRecuperacionPassword(email);
      return res.status(200).json(resultado);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al procesar la solicitud de recuperación.";
      return res.status(500).json({ exito: false, error: message });
    }
  },
};

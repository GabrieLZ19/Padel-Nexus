import { Request, Response } from "express";
import { PerfilService, ActualizarPerfilDTO } from "../services/perfil.service";
import { AuthService, RegistroDTO } from "../services/auth.service";
import { env } from "../config/env.config";

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
   * Endpoint centralizado de autenticación (Unificado para Next.js)
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
        data: {
          // Envoltorio consistente para desestructuración limpia
          usuario: result.usuario,
          token: result.token,
        },
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

  /**
   * GET /api/perfiles/google
   * Envía la URL oficial de Google OAuth generada de forma segura
   */
  async iniciarGoogleAuth(req: Request, res: Response): Promise<Response> {
    try {
      const urlDeRedireccion = await AuthService.obtenerUrlGoogle();

      // Retornamos la URL en un JSON para que el frontend la maneje con window.location.href
      return res.status(200).json({
        exito: true,
        url: urlDeRedireccion,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al iniciar OAuth.";
      return res.status(500).json({ exito: false, error: message });
    }
  },
  /**
   * GET /api/perfiles/google/callback
   * Captura el código enviado por Google, genera la sesión e inyecta cookies en el navegador
   */
  async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const code = req.query.code as string;

      if (!code) {
        return res.redirect(
          `${env.FRONTEND_URL || "http://localhost:3000"}/login?error=oauth_missing_code`,
        );
      }

      // Cambiamos el código por la sesión de Supabase Auth en el backend
      const resultado = await AuthService.cambiarCodigoPorSesion(code);

      // Seteamos las cookies directamente al navegador desde Express
      res.cookie("padel_token", resultado.token, {
        path: "/",
        maxAge: 1000 * 60 * 60 * 24,
      });
      res.cookie("padel_user_role", resultado.usuario.rol, {
        path: "/",
        maxAge: 1000 * 60 * 60 * 24,
      });

      // Redirección limpia al frontend según el rol
      const rutaDestino =
        resultado.usuario.rol !== "usuario" ? "/dashboard" : "/";
      return res.redirect(
        `${env.FRONTEND_URL || "http://localhost:3000"}${rutaDestino}`,
      );
    } catch (error: unknown) {
      console.error("Error crítico en Google OAuth Callback:", error);
      return res.redirect(
        `${env.FRONTEND_URL || "http://localhost:3000"}/login?error=oauth_failed`,
      );
    }
  },

  async verificarGoogleAuthToken(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { accessToken } = req.body;
      if (!accessToken) {
        return res
          .status(400)
          .json({ exito: false, error: "El token de acceso es requerido." });
      }

      const resultado = await AuthService.verificarTokenGoogle(accessToken);

      return res.status(200).json({
        exito: true,
        mensaje: "Token validado y perfil sincronizado correctamente.",
        usuario: resultado.usuario,
        token: resultado.token,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al validar token federativo.";
      return res.status(401).json({ exito: false, error: message });
    }
  },
};

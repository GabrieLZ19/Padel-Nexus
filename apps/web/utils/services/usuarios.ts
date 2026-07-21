import { api } from "../api";
import type { RolUsuario, Perfil } from "../types";

export interface CrearUsuarioDTO {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
  club_id?: string | null;
  provincia?: string | null;
}

export interface UsuarioAdmin {
  id: string;
  email: string | null;
  nombre: string | null;
  apellido: string | null;
  rol: RolUsuario;
  club_id: string | null;
  lugar_residencia: string | null;
  inhabilitado?: boolean;
  created_at?: string;
}

interface ListarResponse {
  exito: boolean;
  data: UsuarioAdmin[];
  total: number;
}

interface CrearResponse {
  exito: boolean;
  mensaje: string;
  data: UsuarioAdmin;
}

export const UsuariosService = {
  async crear(datos: CrearUsuarioDTO): Promise<CrearResponse> {
    const response = await api.post<CrearResponse>(
      "/admin/usuarios",
      datos,
    );
    return response.data;
  },

  async listar(filtroRol?: string): Promise<UsuarioAdmin[]> {
    const params = filtroRol ? { rol: filtroRol } : {};
    const response = await api.get<ListarResponse>("/admin/usuarios", {
      params,
    });
    return response.data.data;
  },

  async actualizarUsuario(
    id: string,
    datos: Partial<CrearUsuarioDTO>,
  ): Promise<void> {
    await api.put(`/admin/usuarios/${id}`, datos);
  },

  async toggleEstado(id: string, inhabilitado: boolean): Promise<void> {
    await api.patch(`/admin/usuarios/${id}/estado`, { inhabilitado });
  },
};

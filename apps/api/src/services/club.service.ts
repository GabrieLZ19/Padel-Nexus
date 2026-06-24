import { supabase } from "../config/supabase";

export interface CrearClubDTO {
  nombre: string;
  provincia: string;
  localidad: string;
  canchas: number;
  estado?: string;
}

export type ActualizarClubDTO = Partial<CrearClubDTO>;

export class ClubService {
  static async obtenerClubesPaginados(
    page: number,
    limit: number,
    search?: string,
    provincia?: string,
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("clubes")
      .select(`*, torneos(count)`, { count: "exact" })
      .range(from, to);

    if (search) query = query.ilike("nombre", `%${search}%`);
    if (provincia) query = query.eq("provincia", provincia);

    const { data, error, count } = await query;
    if (error) throw new Error("Error interno al obtener los clubes.");

    // Tipado seguro para la respuesta de Supabase
    type SupabaseClub = Record<string, unknown> & {
      torneos?: { count: number }[] | null;
    };

    const formattedData = ((data as SupabaseClub[]) || []).map((club) => {
      // Extraemos la cuenta de torneos de forma segura
      const torneosCount =
        club.torneos && club.torneos.length > 0 ? club.torneos[0].count : 0;

      // Eliminamos el array 'torneos' crudo para limpiar la respuesta
      const { torneos, ...restoClub } = club;

      return {
        ...restoClub,
        torneos_count: torneosCount,
      };
    });

    return { data: formattedData, total: count };
  }

  static async obtenerClubPorId(id: string) {
    const { data, error } = await supabase
      .from("clubes")
      .select(`*, torneos(*)`)
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("Club no encontrado.");
    return data;
  }

  static async crearClub(datos: CrearClubDTO) {
    const { data, error } = await supabase
      .from("clubes")
      .insert([
        {
          ...datos,
          canchas: Number(datos.canchas) || 0,
          estado: datos.estado || "Activo",
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear el club: ${error.message}`);
    return data;
  }

  static async actualizarClub(id: string, datos: ActualizarClubDTO) {
    const payload = { ...datos };
    if (payload.canchas !== undefined) {
      payload.canchas = Number(payload.canchas) || 0;
    }

    const { data, error } = await supabase
      .from("clubes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar el club: ${error.message}`);
    return data;
  }

  static async desactivarClub(id: string) {
    const { error } = await supabase
      .from("clubes")
      .update({ estado: "Inactivo" })
      .eq("id", id);

    if (error) throw new Error("Error interno al intentar desactivar el club.");
  }
}

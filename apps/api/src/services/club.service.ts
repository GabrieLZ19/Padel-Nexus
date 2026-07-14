import { supabase, supabaseAdmin } from "../config/supabase";

export interface CrearClubDTO {
  nombre: string;
  provincia: string;
  localidad: string;
  canchas: number;
  estado?: string;
  latitud?: number | null;
  longitud?: number | null;
  cbu?: string | null;
  alias?: string | null;
}

export type ActualizarClubDTO = Partial<CrearClubDTO>;

export interface ClubCercano {
  id: string;
  nombre: string;
  provincia: string;
  localidad: string;
  canchas: number;
  estado: string;
  latitud: number;
  longitud: number;
  distancia_km: number;
}

export class ClubService {
  /**
   * Busca clubes cercanos a una coordenada dada usando la función RPC de Haversine.
   */
  static async buscarCercanos(
    lat: number,
    lng: number,
    radioKm: number = 50,
  ): Promise<ClubCercano[]> {
    const { data, error } = await supabaseAdmin.rpc("buscar_clubes_cercanos", {
      user_lat: lat,
      user_lng: lng,
      max_distancia_km: radioKm,
    });

    if (error) throw new Error(`Error en búsqueda geográfica: ${error.message}`);
    return (data as ClubCercano[]) || [];
  }

  static async obtenerClubesPaginados(
    page: number,
    limit: number,
    search?: string,
    provincia?: string,
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("clubes")
      .select(`*, torneos(count), canchas(count)`, { count: "exact" })
      .range(from, to);

    if (search) query = query.ilike("nombre", `%${search}%`);
    if (provincia) query = query.eq("provincia", provincia);

    const { data, error, count } = await query;
    if (error) throw new Error("Error interno al obtener los clubes.");

    // Tipado seguro para la respuesta de Supabase
    type SupabaseClub = Record<string, any> & {
      torneos?: { count: number }[] | null;
      canchas?: { count: number }[] | null;
    };

    const formattedData = ((data as SupabaseClub[]) || []).map((club) => {
      // Extraemos la cuenta de torneos y canchas de forma segura
      const torneosCount =
        club.torneos && club.torneos.length > 0 ? club.torneos[0].count : 0;
      const canchasCount =
        club.canchas && club.canchas.length > 0 ? club.canchas[0].count : 0;

      // Eliminamos los arrays crudos para limpiar la respuesta
      const { torneos, canchas, ...restoClub } = club;

      return {
        ...restoClub,
        canchas: canchasCount || restoClub.canchas || 0, // Fallback al conteo estático si el conteo real es 0
        torneos_count: torneosCount,
      };
    });

    return { data: formattedData, total: count };
  }

  static async obtenerClubPorId(id: string) {
    const { data, error } = await supabaseAdmin
      .from("clubes")
      .select(`*, torneos(*), canchas(count)`)
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("Club no encontrado.");

    type SupabaseClubDetalle = Record<string, any> & {
      canchas?: { count: number }[] | null;
    };

    const d = data as SupabaseClubDetalle;
    const canchasCount = d.canchas && d.canchas.length > 0 ? d.canchas[0].count : 0;
    const { canchas, ...resto } = d;

    return {
      ...resto,
      canchas: canchasCount || resto.canchas || 0,
    };
  }

  static async crearClub(datos: CrearClubDTO) {
    const { data, error } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
      .from("clubes")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar el club: ${error.message}`);
    return data;
  }

  static async desactivarClub(id: string) {
    const { error } = await supabaseAdmin
      .from("clubes")
      .update({ estado: "Inactivo" })
      .eq("id", id);

    if (error) throw new Error("Error interno al intentar desactivar el club.");
  }

  // ── Canchas CRUD ──────────────────────────────────────────────────────

  static async obtenerCanchasPorClub(clubId: string) {
    // Trae las canchas con sus turnos asociados
    const { data, error } = await supabaseAdmin
      .from("canchas")
      .select("*, turnos(*)")
      .eq("club_id", clubId);

    if (error) throw new Error("Error al obtener las canchas del club.");
    return data || [];
  }

  static async crearCancha(clubId: string, datos: { nombre: string; tipo_suelo: string; techada: boolean }) {
    const { data, error } = await supabaseAdmin
      .from("canchas")
      .insert([
        {
          club_id: clubId,
          nombre: datos.nombre,
          tipo_suelo: datos.tipo_suelo || null,
          techada: datos.techada,
          activa: true,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear la cancha: ${error.message}`);
    return data;
  }

  static async actualizarCancha(canchaId: string, datos: { nombre?: string; tipo_suelo?: string; techada?: boolean; activa?: boolean }) {
    const { data, error } = await supabaseAdmin
      .from("canchas")
      .update(datos)
      .eq("id", canchaId)
      .select()
      .single();

    if (error) throw new Error(`Error al actualizar la cancha: ${error.message}`);
    return data;
  }

  static async eliminarCancha(canchaId: string) {
    const { error } = await supabaseAdmin
      .from("canchas")
      .delete()
      .eq("id", canchaId);

    if (error) throw new Error(`Error al eliminar la cancha: ${error.message}`);
  }

  // ── Turnos CRUD ───────────────────────────────────────────────────────

  static async crearTurno(canchaId: string, datos: { hora_inicio: string; hora_fin: string; precio: number; dia_semana: number }) {
    const { data, error } = await supabaseAdmin
      .from("turnos")
      .insert([
        {
          cancha_id: canchaId,
          hora_inicio: datos.hora_inicio,
          hora_fin: datos.hora_fin,
          precio: Number(datos.precio),
          dia_semana: Number(datos.dia_semana),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error al crear el turno: ${error.message}`);
    return data;
  }

  static async eliminarTurno(turnoId: string) {
    const { error } = await supabaseAdmin
      .from("turnos")
      .delete()
      .eq("id", turnoId);

    if (error) throw new Error(`Error al eliminar el turno: ${error.message}`);
  }
}

import { supabaseAdmin } from "../config/supabase";
import { esRolClub } from "../constants/roles";

/** RES-25: lectura/checkout de reserva solo titular, staff del club o admin de plataforma. */
export async function assertUsuarioPuedeAccederReserva(
  reservaId: string,
  actor: { userId: string; rol?: string | null },
): Promise<void> {
  const { data: reserva, error } = await supabaseAdmin
    .from("reservas")
    .select(
      "usuario_id, turnos(canchas(club_id))",
    )
    .eq("id", reservaId)
    .maybeSingle();

  if (error || !reserva) {
    throw new Error("Reserva no encontrada.");
  }

  if (reserva.usuario_id === actor.userId) {
    return;
  }

  const rol = actor.rol ?? "";
  if (rol === "superadmin" || rol === "admin") {
    return;
  }

  const turnoRaw = reserva.turnos as
    | { canchas?: { club_id?: string } | { club_id?: string }[] }
    | { canchas?: { club_id?: string } | { club_id?: string }[] }[]
    | null;
  const turno = Array.isArray(turnoRaw) ? turnoRaw[0] : turnoRaw;
  const canchaRaw = turno?.canchas;
  const cancha = Array.isArray(canchaRaw) ? canchaRaw[0] : canchaRaw;
  const clubId = cancha?.club_id;

  if (clubId && esRolClub(rol)) {
    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("club_id, rol")
      .eq("id", actor.userId)
      .maybeSingle();
    if (perfil?.club_id === clubId && esRolClub(perfil.rol)) {
      return;
    }
  }

  throw new Error("No tenés permiso para acceder a esta reserva.");
}
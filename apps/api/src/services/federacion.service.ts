import { supabaseAdmin } from "../config/supabase";

export class FederacionService {
  static async listar() {
    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return data || [];
  }

  static async obtenerPorId(id: string) {
    const { data, error } = await supabaseAdmin
      .from("federaciones")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }

  static async resolveFapId(): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from("federaciones")
      .select("id")
      .ilike("sigla", "FAP")
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }
}

import { createClient } from "@supabase/supabase-js";
import { env } from "./env.config";

//  CLIENTE ESTÁNDAR: Su contexto mutará cuando los usuarios se autentiquen
export const supabase = createClient(
  env.SUPABASE.URL,
  env.SUPABASE.API_KEY || "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

// CLIENTE ADMINISTRADOR PURO: Nunca ejecutará métodos 'auth', garantizando bypass RLS permanente
export const supabaseAdmin = createClient(
  env.SUPABASE.URL,
  env.SUPABASE.SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

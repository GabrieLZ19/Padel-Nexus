import { createClient } from "@supabase/supabase-js";
import { env } from "./env.config";

// Inicializamos y exportamos la instancia de Supabase
export const supabase = createClient(
  env.SUPABASE.URL,
  env.SUPABASE.SERVICE_KEY,
);

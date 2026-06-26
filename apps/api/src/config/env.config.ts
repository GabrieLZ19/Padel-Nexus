import dotenv from "dotenv";
import path from "path";

// Centralizamos la lectura del archivo .env en un solo lugar limpio
dotenv.config({ path: path.join(process.cwd(), ".env") });

if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.SUPABASE_API_KEY
) {
  throw new Error(
    "❌ ERROR CRÍTICO: Falta configurar las credenciales de Supabase en el archivo .env",
  );
}

export const env = {
  PORT: process.env.PORT || 4000,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  SUPABASE: {
    URL: process.env.SUPABASE_URL,
    SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    API_KEY: process.env.SUPABASE_API_KEY,
  },
};

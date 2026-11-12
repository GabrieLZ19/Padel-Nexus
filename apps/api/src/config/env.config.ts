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
  /** URL completa opcional hacia /update-password (debe estar en Redirect URLs de Supabase Auth). */
  RECUPERACION_PASSWORD_REDIRECT_URL:
    process.env.RECUPERACION_PASSWORD_REDIRECT_URL?.trim() || null,
  SUPABASE: {
    URL: process.env.SUPABASE_URL,
    SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    API_KEY: process.env.SUPABASE_API_KEY,
  },
};

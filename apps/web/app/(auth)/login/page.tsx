"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";
import Link from "next/link";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      console.log("Sesión iniciada correctamente. Recordarme:", rememberMe);
      router.push("/dashboard");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error al iniciar sesión:", error.message);
      setError("Email o contraseña incorrectos. Por favor, intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });
      if (authError) throw authError;
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error al iniciar sesión con Google:", error.message);
      setError("Hubo un problema al intentar iniciar sesión con Google.");
      setLoading(false);
    }
  };

  const inputStyles =
    "w-full pl-12 pr-4 py-3.5 bg-[#161616] rounded-xl border border-white/5 text-white placeholder-gray-500 " +
    "focus:outline-none focus:border-padel-4 focus:ring-1 focus:ring-padel-4 transition-all " +
    "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_#161616_inset_!important] " +
    "[&:-webkit-autofill]:[-webkit-text-fill-color:white_!important] " +
    "caret-white";

  return (
    // Cambiamos min-h-screen por min-h-[100dvh] para que en iOS no se corte por la barra de navegación
    <div className="flex min-h-dvh bg-padel-1 text-white font-sans relative">
      {/* Columna Izquierda - Escritorio */}
      <div className="hidden lg:flex lg:w-1/2 bg-padel-3 flex-col justify-center px-20 border-r border-padel-2 relative z-10">
        <div className="mb-10 relative size-24">
          <div className="absolute inset-0 bg-padel-4 rounded-3xl blur-2xl opacity-40"></div>
          <div className="relative size-full bg-padel-4 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(204,255,0,0.2)] border border-white/10">
            <span className="text-padel-1 font-bold text-[5rem] leading-none mb-1">
              ∞
            </span>
          </div>
        </div>

        <h2 className="text-4xl font-semibold text-white mb-2 tracking-tight">
          Panel administrativo
        </h2>
        <h1 className="text-7xl font-extrabold mb-8 tracking-tight text-white">
          Padel Nexus
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-lg leading-relaxed">
          Gestioná torneos, clubes, jugadores, licencias y marketplace desde un
          solo lugar.
        </p>

        <ul className="space-y-5 text-gray-300">
          {[
            "Control total de torneos y cuadros",
            "Validación de licencias por federación",
            "Reportes y estadísticas en tiempo real",
          ].map((item) => (
            <li key={item} className="flex items-center gap-4 text-lg">
              <div className="size-8 rounded-full bg-padel-4 flex items-center justify-center border-2 border-white/10 shadow-lg">
                <Check className="text-padel-1 size-5 stroke-3" />
              </div>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Columna Derecha - Optimizada para Móvil */}
      {/* Quitamos el p-8 forzado y pusimos p-4 sm:p-8 para no ahogar el celu */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-8 bg-padel-1 relative z-10">
        <div className="w-full max-w-md bg-transparent">
          <div className="mb-8 sm:mb-10 mt-6 sm:mt-0">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
              Bienvenido
            </h2>
            <p className="text-base sm:text-lg text-gray-400">
              Elegí cómo querés iniciar sesión.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-7">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
                <AlertCircle className="size-5 shrink-0 mt-0.5 sm:mt-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Botón Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 sm:py-4 bg-white text-black font-semibold rounded-xl border border-white/20 hover:bg-gray-100 transition-all shadow-sm shadow-black/10 disabled:cursor-not-allowed disabled:opacity-70 text-sm sm:text-base"
            >
              <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white shadow-sm shadow-black/5">
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 533.5 544.3"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M533.5 278.4c0-17.4-1.4-34.1-4.1-50.3H272v95.1h146.9c-6.4 34.6-25.8 63.9-55 83.5v69.4h88.9c52.1-48 81.7-118.4 81.7-197.7z"
                    fill="#4285F4"
                  />
                  <path
                    d="M272 544.3c74.1 0 136.3-24.4 181.7-66.2l-88.9-69.4c-24.7 16.6-56.4 26.5-92.8 26.5-71.3 0-131.8-48.1-153.5-112.7H28.3v70.6C73.2 482.8 166.6 544.3 272 544.3z"
                    fill="#34A853"
                  />
                  <path
                    d="M118.5 327.5c-11.7-34.6-11.7-71.8 0-106.4V150.5H28.3c-43.2 86.5-43.2 189.7 0 276.2l90.2-69.2z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M272 107.7c39.5 0 75.1 13.6 103.1 40.3l77.2-77.2C411.8 24.7 344.1 0 272 0 166.6 0 73.2 61.5 28.3 150.5l90.2 70.6C140.2 155.8 200.7 107.7 272 107.7z"
                    fill="#EA4335"
                  />
                </svg>
              </span>
              Continuar con Google
            </button>

            <div className="flex items-center gap-4 text-gray-600 text-sm">
              <div className="flex-1 border-t border-white/5"></div>
              {/* Le agregamos whitespace-nowrap para que el texto no se rompa en dos renglones */}
              <span className="whitespace-nowrap">
                o con email y contraseña
              </span>
              <div className="flex-1 border-t border-white/5"></div>
            </div>

            <form
              onSubmit={handleEmailLogin}
              className="space-y-6 sm:space-y-7"
            >
              {/* Input de Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email corporativo
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-5" />
                  <input
                    type="email"
                    placeholder="admin@padelnexus.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputStyles}
                    required
                  />
                </div>
              </div>

              {/* Input de Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                <div className="relative group">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputStyles}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Fila de Recordarme / Olvidaste Contraseña optimizada */}
              {/* En móviles (por defecto) es flex-col, en escritorio es flex-row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm pt-1 gap-4 sm:gap-0">
                <label className="flex items-center gap-3 cursor-pointer text-gray-400 group">
                  <div className="relative flex items-center justify-center size-5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer appearance-none size-5 rounded-sm bg-padel-5 border border-white/10 cursor-pointer checked:bg-padel-4 checked:border-padel-4 focus:ring-2 focus:ring-padel-4 focus:ring-offset-2 focus:ring-offset-padel-1 transition-colors"
                    />
                    <Check
                      className="absolute size-3.5 text-padel-1 pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                      strokeWidth={4}
                    />
                  </div>
                  Recordarme
                </label>
                <Link
                  href="/forgot-password"
                  className="font-medium text-padel-4 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-padel-4 hover:bg-[#b3e600] disabled:bg-padel-2 disabled:text-gray-500 text-padel-1 font-bold py-3.5 sm:py-4 rounded-xl transition-colors flex justify-center items-center gap-2.5 text-base sm:text-lg shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-[0_0_25px_rgba(204,255,0,0.3)]"
              >
                {loading ? (
                  <span className="animate-pulse">Verificando...</span>
                ) : (
                  <>
                    Iniciar Sesión <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-gray-400 text-sm sm:text-base">
              ¿No tenés una cuenta?{" "}
              <Link
                href="/signup"
                className="text-padel-4 font-bold hover:underline"
              >
                Registrate gratis
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 sm:mt-10 sm:pt-8 border-t border-white/5 flex items-center justify-center gap-3">
            <div className="relative size-6 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-lg opacity-30"></div>
              <ShieldCheck className="text-blue-500 relative size-5" />
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              Acceso protegido con autenticación en dos pasos (2FA).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

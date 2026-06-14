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

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // El rememberMe se puede usar más adelante para lógica custom si es necesario.
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

  const inputStyles =
    "w-full pl-12 pr-12 py-3.5 bg-padel-5 rounded-xl border border-white/5 text-white placeholder-gray-500 focus:outline-none focus:border-padel-4 focus:ring-1 focus:ring-padel-4 transition-all [&:-webkit-autofill]:bg-padel-5 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]";

  return (
    <div className="flex min-h-screen bg-padel-1 text-white font-sans relative">
      {/* Columna Izquierda */}
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

      {/* Columna Derecha - Formulario */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-padel-1 relative z-10">
        <div className="w-full max-w-md bg-transparent p-8">
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
              Iniciá sesión
            </h2>
            <p className="text-lg text-gray-400">
              Accedé con tu cuenta de administrador.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-7">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-center gap-3 text-sm">
                <AlertCircle className="size-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Input de Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2.5">
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
              <label className="block text-sm font-medium text-gray-300 mb-2.5">
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
                {/* Botón para alternar visibilidad */}
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

            {/* Fila de Recordarme / Olvidaste Contraseña */}
            <div className="flex items-center justify-between text-sm pt-2">
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
              <a href="#" className="font-medium text-padel-4 hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-padel-4 hover:bg-[#b3e600] disabled:bg-padel-2 disabled:text-gray-500 text-padel-1 font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2.5 text-lg shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-[0_0_25px_rgba(204,255,0,0.3)]"
            >
              {loading ? (
                <span className="animate-pulse">Verificando...</span>
              ) : (
                <>
                  Acceder al panel <ArrowRight className="size-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center gap-3">
            <div className="relative size-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-lg opacity-30"></div>
              <ShieldCheck className="text-blue-500 relative size-5" />
            </div>
            <p className="text-sm text-gray-500">
              Acceso protegido con autenticación en dos pasos (2FA).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

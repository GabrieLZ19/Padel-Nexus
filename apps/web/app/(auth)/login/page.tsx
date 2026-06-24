"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  LockKeyhole,
  ArrowRight,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { isAxiosError } from "axios";
import { PerfilService } from "@/utils/services/perfil";
import { useProfileStore } from "@/store/useProfileStore";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter();
  const { setProfile } = useProfileStore();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Consumo a través del servicio unificado
      const data = await PerfilService.loginConEmail(email, password);

      if (data.exito) {
        // Inyección de cookies de sesión para Axios y Next.js Middleware
        document.cookie = `padel_token=${data.token}; path=/; max-age=${rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24}`;
        document.cookie = `padel_user_role=${data.usuario.rol}; path=/; max-age=${rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24}`;

        setProfile(data.usuario);
        router.push(data.usuario.rol !== "usuario" ? "/dashboard" : "/");
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(
          err.response?.data?.error ||
            "Credenciales incorrectas. Verifique los datos.",
        );
      } else {
        setError("Error de red inesperado. Intente nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    "w-full pl-12 pr-4 py-3.5 bg-brand-input rounded-xl border border-brand-white/5 text-brand-white placeholder-gray-500 " +
    "focus:outline-none focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse transition-all caret-white text-sm sm:text-base";

  return (
    <div className="flex min-h-dvh bg-brand-black text-brand-white font-sans relative">
      {/* Columna Izquierda - Branding Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-card flex-col justify-center px-20 border-r border-brand-white/5 relative z-10">
        <div className="mb-10 relative size-24 drop-shadow-[0_0_20px_rgba(203,254,1,0.15)]">
          <Image
            src="/brand/LogoAccessory.svg"
            alt="Padel Nexus"
            width={96}
            height={96}
            className="w-full h-full object-contain"
            priority
          />
        </div>
        <h2 className="text-4xl font-semibold text-brand-white mb-2 tracking-tight">
          Panel unificado
        </h2>
        <h1 className="text-7xl font-extrabold mb-8 tracking-tight text-brand-white">
          Padel Nexus
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-lg leading-relaxed">
          Gestioná torneos, clubes, jugadores, licencias y estadísticas
          federativas.
        </p>
        <ul className="space-y-5 text-gray-300">
          {[
            "Control total de torneos y cuadros",
            "Validación de licencias por federación",
            "Reportes y estadísticas en tiempo real",
          ].map((item) => (
            <li key={item} className="flex items-center gap-4 text-lg">
              <div className="size-8 rounded-full bg-brand-chartreuse flex items-center justify-center border border-brand-white/10 shadow-lg">
                <Check className="text-brand-black size-5 stroke-3" />
              </div>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Columna Derecha - Formulario */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-4 sm:p-8 bg-brand-black relative z-10">
        <div className="w-full max-w-md bg-transparent">
          <div className="mb-8 sm:mb-10 mt-6 sm:mt-0">
            <div className="lg:hidden mb-6">
              <Image
                src="/brand/LogoGeneric.svg"
                alt="Padel Nexus"
                width={140}
                height={35}
                className="h-8 w-auto object-contain"
              />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-white mb-2 tracking-tight">
              Bienvenido
            </h2>
            <p className="text-base sm:text-lg text-gray-400">
              Ingresá tus credenciales de acceso.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-7">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <form
              onSubmit={handleEmailLogin}
              className="space-y-6 sm:space-y-7"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Correo electrónico
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-5" />
                  <input
                    type="email"
                    placeholder="ejemplo@padelnexus.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputStyles}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contraseña
                </label>
                <div className="relative group">
                  <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-5" />
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none p-1 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm pt-1 gap-4 sm:gap-0">
                <label className="flex items-center gap-3 cursor-pointer text-gray-400 group">
                  <div className="relative flex items-center justify-center size-5">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer appearance-none size-5 rounded-sm bg-brand-input border border-brand-white/10 cursor-pointer checked:bg-brand-chartreuse checked:border-brand-chartreuse focus:ring-2 focus:ring-brand-chartreuse transition-colors"
                    />
                    <Check
                      className="absolute size-3.5 text-brand-black pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                      strokeWidth={4}
                    />
                  </div>
                  Recordarme
                </label>
                <Link
                  href="/forgot-password"
                  className="font-medium text-brand-chartreuse hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-chartreuse text-brand-black font-bold py-3.5 sm:py-4 rounded-xl transition-colors flex justify-center items-center gap-2.5 text-base sm:text-lg shadow-md hover:opacity-95 cursor-pointer"
              >
                {loading ? (
                  <span className="animate-pulse">Verificando...</span>
                ) : (
                  <>
                    {`Iniciar Sesión `}
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-brand-white/5 text-center">
            <p className="text-gray-400 text-sm">
              ¿No tenés una cuenta?{" "}
              <Link
                href="/signup"
                className="text-brand-chartreuse font-bold hover:underline"
              >
                Registrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

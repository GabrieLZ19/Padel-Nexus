"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  LockKeyhole,
  ArrowRight,
  ShieldCheck,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Phone,
  Swords,
  Medal,
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

export default function SignUpPage() {
  // Estados del perfil
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ladoPreferido, setLadoPreferido] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);

  const supabase = createClient();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre_completo: fullName,
            telefono: telefono || null,
            categoria_padel: categoria || null,
            lado_preferido: ladoPreferido || null,
          },
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });

      if (authError) throw authError;
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error al registrarse:", error.message);
      setError(
        error.message.includes("already registered")
          ? "Este email ya está registrado. Por favor, iniciá sesión."
          : "Hubo un error al crear la cuenta. Intentá nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
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
      setError("Hubo un problema al intentar registrarte con Google.");
      setLoading(false);
    }
  };

  const inputStyles =
    "w-full pl-12 pr-4 py-3.5 bg-[#161616] rounded-xl border border-white/5 text-white placeholder-gray-500 " +
    "focus:outline-none focus:border-padel-4 focus:ring-1 focus:ring-padel-4 transition-all " +
    "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_#161616_inset_!important] " +
    "[&:-webkit-autofill]:[-webkit-text-fill-color:white_!important] " +
    "caret-white";
  const selectStyles =
    "w-full pl-12 pr-10 py-3.5 bg-padel-5 rounded-xl border border-white/5 text-white focus:outline-none focus:border-padel-4 focus:ring-1 focus:ring-padel-4 transition-all appearance-none";

  return (
    <div className="flex min-h-screen bg-padel-1 text-white font-sans relative">
      {/* Columna Izquierda - Branding */}
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
          Sumate a la red
        </h2>
        <h1 className="text-7xl font-extrabold mb-8 tracking-tight text-white">
          Padel Nexus
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-lg leading-relaxed">
          La plataforma definitiva que conecta a jugadores, organizadores y
          clubes en un solo ecosistema.
        </p>
        <ul className="space-y-5 text-gray-300">
          {[
            "Acceso rápido a torneos de tu nivel",
            "Ranking actualizado en tiempo real",
            "Historial de todos tus partidos",
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

      {/* Columna Derecha - Formulario de Registro */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-padel-1 relative z-10 overflow-y-auto">
        <div className="w-full max-w-md bg-transparent py-10">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">
              Crear cuenta
            </h2>
            <p className="text-lg text-gray-400">
              Ingresá tus datos para comenzar.
            </p>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success ? (
              <div className="bg-padel-4/10 border border-padel-4/30 text-padel-4 p-6 rounded-2xl flex flex-col items-center text-center gap-3">
                <Mail className="size-10 mb-2" />
                <h3 className="text-xl font-bold text-white">
                  ¡Revisá tu correo!
                </h3>
                <p className="text-sm text-gray-300">
                  Te enviamos un enlace de confirmación a{" "}
                  <strong>{email}</strong>. Hacé clic en él para activar tu
                  cuenta.
                </p>
                <Link href="/login" className="mt-4 font-bold hover:underline">
                  Ir al inicio de sesión
                </Link>
              </div>
            ) : (
              <>
                <button
                  onClick={handleGoogleSignup}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-black font-semibold rounded-xl border border-white/20 hover:bg-gray-100 transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                    <svg
                      className="h-5 w-5"
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
                  Registrarse con Google
                </button>

                <div className="flex items-center gap-4 text-gray-600 text-sm py-2">
                  <div className="flex-1 border-t border-white/5"></div>o con tu
                  email
                  <div className="flex-1 border-t border-white/5"></div>
                </div>

                <form onSubmit={handleEmailSignup} className="space-y-5">
                  {/* Fila 1: Nombre y Teléfono */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Nombre completo
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-4" />
                        <input
                          type="text"
                          placeholder="Ej: Juan Pérez"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={inputStyles}
                          required
                          minLength={3}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Teléfono (Opcional)
                      </label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-4" />
                        <input
                          type="tel"
                          placeholder="Ej: +54 9..."
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          className={inputStyles}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: Categoría y Lado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Categoría
                      </label>
                      <div className="relative group">
                        <Medal className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-4" />
                        <select
                          value={categoria}
                          onChange={(e) => setCategoria(e.target.value)}
                          className={selectStyles}
                        >
                          <option value="" disabled>
                            Seleccionar...
                          </option>
                          {[
                            "1ra",
                            "2da",
                            "3ra",
                            "4ta",
                            "5ta",
                            "6ta",
                            "7ma",
                            "8va",
                            "Iniciante",
                          ].map((cat) => (
                            <option
                              key={cat}
                              value={cat}
                              className="bg-padel-1 text-white"
                            >
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2">
                        Lado preferido
                      </label>
                      <div className="relative group">
                        <Swords className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-4" />
                        <select
                          value={ladoPreferido}
                          onChange={(e) => setLadoPreferido(e.target.value)}
                          className={selectStyles}
                        >
                          <option value="" disabled>
                            Seleccionar...
                          </option>
                          <option
                            value="Drive"
                            className="bg-padel-1 text-white"
                          >
                            Drive (Derecha)
                          </option>
                          <option
                            value="Revés"
                            className="bg-padel-1 text-white"
                          >
                            Revés (Izquierda)
                          </option>
                          <option
                            value="Ambos"
                            className="bg-padel-1 text-white"
                          >
                            Ambos
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Fila 3: Credenciales */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Email
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-4" />
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputStyles}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Contraseña
                    </label>
                    <div className="relative group">
                      <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-padel-4 transition-colors size-4" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputStyles}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors focus:outline-none p-1"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-padel-4 hover:bg-[#b3e600] disabled:bg-padel-2 disabled:text-gray-500 text-padel-1 font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2.5 text-lg shadow-[0_0_20px_rgba(204,255,0,0.15)] mt-2"
                  >
                    {loading ? (
                      <span className="animate-pulse">Creando cuenta...</span>
                    ) : (
                      <>
                        Crear cuenta <ArrowRight className="size-5" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {!success && (
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-gray-400 text-sm">
                ¿Ya tenés una cuenta?{" "}
                <Link
                  href="/login"
                  className="text-padel-4 font-bold hover:underline"
                >
                  Iniciá sesión acá
                </Link>
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-3">
            <ShieldCheck className="text-blue-500 size-4" />
            <p className="text-xs text-gray-500">
              Tus datos están protegidos y encriptados de extremo a extremo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

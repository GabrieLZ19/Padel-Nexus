"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  LockKeyhole,
  ArrowRight,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Fingerprint,
} from "lucide-react";
import { isAxiosError } from "axios";
import { PerfilService } from "@/utils/services/perfil";
import { NIVELES_PADEL, LADOS_PADEL } from "@/utils/constants/padelConfig";
import CustomDropdown from "@/components/ui/CustomDropdown";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [residencia, setResidencia] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ladoPreferido, setLadoPreferido] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Consumo a través del servicio centralizado con los DTO FAP
      const data = await PerfilService.registrarUsuario({
        email,
        password,
        nombre_completo: fullName,
        telefono,
        dni,
        lugar_residencia: residencia,
        categoria_padel: categoria,
        lado_preferido: ladoPreferido,
      });

      if (data.exito) setSuccess(true);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(
          err.response?.data?.error ||
            "Error al procesar la ficha de inscripción.",
        );
      } else {
        setError("Error de red al procesar el registro.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyles =
    "w-full pl-12 pr-4 py-3.5 bg-brand-input rounded-xl border border-brand-white/5 text-brand-white placeholder-gray-500 " +
    "focus:outline-none focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse transition-all caret-white text-sm";

  return (
    <div className="flex min-h-screen bg-brand-black text-brand-white font-sans relative">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-card flex-col justify-center px-20 border-r border-brand-white/5 relative z-10">
        <div className="mb-10 relative size-24 drop-shadow-[0_0_20px_rgba(203,254,1,0.15)]">
          <Image
            src="/brand/LogoAccessory.svg"
            alt="Padel Nexus"
            width={96}
            height={96}
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-4xl font-semibold text-brand-white mb-2 tracking-tight">
          Sumate a la red
        </h2>
        <h1 className="text-7xl font-extrabold mb-8 tracking-tight text-brand-white">
          Padel Nexus
        </h1>
        <p className="text-xl text-gray-400 mb-12 max-w-lg leading-relaxed">
          Conectando jugadores con los circuitos oficiales FAP.
        </p>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-8 bg-brand-black relative z-10 overflow-y-auto">
        <div className="w-full max-w-xl bg-transparent py-10">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-brand-white mb-2 tracking-tight">
              Crear cuenta
            </h2>
            <p className="text-lg text-gray-400">
              Ingresá tus datos de jugador federado.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm mb-6">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {success ? (
            <div className="bg-brand-chartreuse/10 border border-brand-chartreuse/30 text-brand-chartreuse p-6 rounded-2xl flex flex-col items-center text-center gap-3">
              <Mail className="size-10 mb-2" />
              <h3 className="text-xl font-bold text-brand-white">
                ¡Registro completado!
              </h3>
              <p className="text-sm text-gray-300">
                Verificá tu correo electrónico para activar tu ficha deportiva.
              </p>
              <Link href="/login" className="mt-4 font-bold hover:underline">
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleEmailSignup} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Nombre completo
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-4" />
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputStyles}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    DNI (Obligatorio FAP)
                  </label>
                  <div className="relative group">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-4" />
                    <input
                      type="text"
                      placeholder="Ej: 40.234.567"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      className={inputStyles}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Teléfono
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-4" />
                    <input
                      type="tel"
                      placeholder="Ej: +54 9 351..."
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className={inputStyles}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Provincia de residencia
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-4" />
                    <input
                      type="text"
                      placeholder="Ej: La Rioja"
                      value={residencia}
                      onChange={(e) => setResidencia(e.target.value)}
                      className={inputStyles}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Categoría Padel
                  </label>
                  <CustomDropdown
                    value={categoria}
                    onChange={(val) => setCategoria(val)}
                    options={NIVELES_PADEL}
                    placeholder="Seleccionar..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Lado Preferido
                  </label>
                  <CustomDropdown
                    value={ladoPreferido}
                    onChange={(val) => setLadoPreferido(val)}
                    options={LADOS_PADEL}
                    placeholder="Seleccionar..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">
                    Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-4" />
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
                    <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-4" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputStyles}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-chartreuse text-brand-black font-bold py-3.5 rounded-xl transition-colors flex justify-center items-center gap-2.5 text-base shadow-md cursor-pointer mt-4"
              >
                {loading ? (
                  <span className="animate-pulse">Registrando...</span>
                ) : (
                  <>
                    {`Crear cuenta de jugador `}
                    <ArrowRight className="size-5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-brand-white/5 text-center">
            <p className="text-gray-400 text-sm">
              ¿Ya tenés una cuenta?{" "}
              <Link
                href="/login"
                className="text-brand-chartreuse font-bold hover:underline"
              >
                Iniciá sesión acá
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

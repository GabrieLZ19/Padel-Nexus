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
  Fingerprint,
  Eye,
  EyeOff,
  Camera,
  Sparkles,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";
import { isAxiosError } from "axios";
import { PerfilService } from "@/utils/services/perfil";
import {
  NIVELES_PADEL,
  LADOS_PADEL,
  PROVINCIAS_ARG,
} from "@/utils/constants/padelConfig";
import CustomDropdown from "@/components/ui/CustomDropdown";
import {
  validateNombre,
  validateDni,
  validateTelefono,
} from "@/utils/validation";

export default function SignUpPage() {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [residencia, setResidencia] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ladoPreferido, setLadoPreferido] = useState("");

  // Visibilidad de contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Subida de foto de perfil
  const [avatarBase64, setAvatarBase64] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarError, setAvatarError] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    nombre?: string;
    apellido?: string;
    dni?: string;
    telefono?: string;
    residencia?: string;
    categoria?: string;
    ladoPreferido?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [success, setSuccess] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("El archivo debe ser una imagen.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("La imagen no debe superar los 2MB.");
      return;
    }

    setAvatarError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      setAvatarBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrors({});

    // Validaciones de negocio robustas
    const newErrors: typeof errors = {};

    if (!nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio.";
    } else if (!validateNombre(nombre)) {
      newErrors.nombre = "Mín. 2 letras, sin números.";
    }

    if (!apellido.trim()) {
      newErrors.apellido = "El apellido es obligatorio.";
    } else if (!validateNombre(apellido)) {
      newErrors.apellido = "Mín. 2 letras, sin números.";
    }

    if (!dni.trim()) {
      newErrors.dni = "El DNI es obligatorio.";
    } else if (!validateDni(dni)) {
      newErrors.dni = "Debe tener 7 u 8 dígitos (ej: 40234567).";
    }

    if (telefono.trim() && !validateTelefono(telefono)) {
      newErrors.telefono = "Formato inválido (mín. 10 dígitos).";
    }

    if (!residencia) {
      newErrors.residencia = "La provincia es obligatoria.";
    }

    if (!categoria) {
      newErrors.categoria = "La categoría es obligatoria.";
    }

    if (!ladoPreferido) {
      newErrors.ladoPreferido = "El lado preferido es obligatorio.";
    }

    if (!password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (password.length < 6) {
      newErrors.password = "Mínimo 6 caracteres.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError("Por favor, corregí los errores en los campos marcados.");
      setLoading(false);
      return;
    }

    // Capitalización automática
    const capitalizeWords = (str: string) =>
      str
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    try {
      const data = await PerfilService.registrarUsuario({
        email,
        password,
        nombre: capitalizeWords(nombre),
        apellido: capitalizeWords(apellido),
        telefono: telefono.trim(),
        dni: dni.trim().replace(/\./g, ""),
        lugar_residencia: residencia,
        categoria_padel: categoria,
        lado_preferido: ladoPreferido,
        avatar_base64: avatarBase64 || undefined,
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

  const getInputStyles = (hasError?: boolean) =>
    `w-full pl-12 pr-12 py-3.5 bg-brand-input rounded-xl border text-brand-white placeholder-gray-500 ` +
    `focus:outline-none transition-all caret-white text-sm ${
      hasError
        ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500"
        : "border-brand-white/5 focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse"
    }`;

  const handleNombreChange = (val: string, type: "nombre" | "apellido") => {
    const cleaned = val.replace(/[0-9]/g, "");
    if (type === "nombre") {
      setNombre(cleaned);
      if (errors.nombre) setErrors((p) => ({ ...p, nombre: undefined }));
    } else {
      setApellido(cleaned);
      if (errors.apellido) setErrors((p) => ({ ...p, apellido: undefined }));
    }
  };

  const handleDniChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, "").slice(0, 10);
    setDni(cleaned);
    if (errors.dni) setErrors((p) => ({ ...p, dni: undefined }));
  };

  const handleTelefonoChange = (val: string) => {
    const cleaned = val.replace(/[^0-9+\s\-()]/g, "");
    setTelefono(cleaned);
    if (errors.telefono) setErrors((p) => ({ ...p, telefono: undefined }));
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-brand-black text-brand-white font-sans relative overflow-x-hidden">
      {/* Círculos de luz neón de fondo */}
      <div className="absolute top-[-20%] left-[-10%] size-96 rounded-full bg-brand-chartreuse/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] size-96 rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />

      {/* PANEL IZQUIERDO (Visual / Marca) - Fijo en Desktop, Oculto en Mobile */}
      <div className="hidden lg:flex lg:w-5/12 lg:h-screen lg:sticky lg:top-0 bg-brand-card/30 backdrop-blur-md flex-col border-r border-brand-white/5 overflow-hidden">
        {/* Falsa grilla de cancha de padel */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 border-2 border-brand-white m-8" />
          <div className="absolute left-1/2 top-0 bottom-0 border-l border-brand-white" />
          <div className="absolute top-1/2 left-0 right-0 border-t border-brand-white" />
          <div className="absolute left-1/4 right-1/4 top-1/2 -translate-y-1/2 h-1/3 border border-brand-white" />
        </div>

        {/* Contenido con scroll de seguridad y padding responsivo */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto no-scrollbar h-full relative z-10 left-panel-responsive">
          {/* Logo superior */}
          <div className="flex items-center gap-3">
            <div className="relative size-12 drop-shadow-[0_0_10px_rgba(203,254,1,0.2)]">
              <Image
                src="/brand/LogoAccessory.svg"
                alt="Padel Nexus"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-brand-white">
              Padel Nexus
            </span>
          </div>

          {/* Mockup de Licencia Digital (Wow Factor) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="left-panel-card relative"
          >
            <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-brand-chartreuse/35 to-blue-500/25 blur-lg opacity-75" />
            <div className="relative w-full max-w-xs xl:max-w-sm mx-auto bg-brand-black/80 border border-brand-white/10 rounded-2xl p-5 xl:p-6 shadow-2xl backdrop-blur-xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] text-brand-chartreuse font-extrabold tracking-widest uppercase">
                    Ficha Deportiva
                  </span>
                  <h4 className="text-sm font-bold text-brand-white">
                    FEDERADO OFICIAL FAP
                  </h4>
                </div>
                <Award className="size-8 text-brand-chartreuse animate-pulse" />
              </div>

              <div className="flex gap-4 items-center">
                <div className="relative size-16 rounded-xl bg-brand-white/5 border border-brand-white/10 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Foto jugador"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="size-8 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                    Jugador FAP
                  </p>
                  <h3 className="text-base font-bold text-brand-white leading-none">
                    {apellido
                      ? `${apellido.toUpperCase()}, ${nombre}`
                      : "GONZALEZ, Lucas"}
                  </h3>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-semibold">
                        Categoría
                      </span>
                      <span className="text-xs font-bold text-brand-chartreuse">
                        {categoria || "4ª"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-semibold">
                        Lado
                      </span>
                      <span className="text-xs font-bold text-brand-white">
                        {ladoPreferido || "Drive"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-semibold">
                        Provincia
                      </span>
                      <span className="text-xs font-bold text-brand-white truncate max-w-24 block">
                        {residencia || "CABA"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Código de barras falso */}
              <div className="mt-6 pt-4 border-t border-brand-white/5 flex justify-between items-center">
                <div className="flex gap-0.5 h-6 items-end opacity-60">
                  <div className="w-0.5 h-full bg-brand-white" />
                  <div className="w-1.5 h-full bg-brand-white" />
                  <div className="w-0.5 h-full bg-brand-white" />
                  <div className="w-2 h-full bg-brand-white" />
                  <div className="w-0.5 h-full bg-brand-white" />
                  <div className="w-1 h-full bg-brand-white" />
                  <div className="w-1.5 h-full bg-brand-white" />
                  <div className="w-0.5 h-full bg-brand-white" />
                </div>
                <span className="text-[10px] font-mono text-gray-500">
                  LIC-FAP-{dni ? dni.replace(/\./g, "") : "40234567"}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Footer del panel */}
          <div>
            <h2 className="text-2xl font-bold text-brand-white mb-2 leading-snug">
              Sumate a la red
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Fichaje federativo y control de licencias unificado de la
              Federación Argentina de Pádel.
            </p>
          </div>
        </div>
      </div>

      {/* PANEL DERECHO (Formulario Registro) */}
      <div className="flex w-full lg:w-7/12 flex-col bg-brand-black relative z-10 lg:h-screen lg:overflow-hidden">
        {/* Cabecera del registro - Fija en Desktop */}
        <div className="px-6 pt-8 pb-4 sm:px-12 md:px-16 lg:pt-16 lg:pb-6 w-full max-w-2xl mx-auto">
          {/* Logo y marca para Mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-6">
            <div className="relative size-10 drop-shadow-[0_0_10px_rgba(203,254,1,0.2)]">
              <Image
                src="/brand/LogoAccessory.svg"
                alt="Padel Nexus"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <span className="text-lg font-bold tracking-tight text-brand-white">
              Padel Nexus
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-5 text-brand-chartreuse animate-bounce" />
            <span className="text-brand-chartreuse text-xs font-bold uppercase tracking-wider">
              Circuito oficial FAP
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-white mb-1.5 tracking-tight">
            Crear cuenta
          </h2>
          <p className="text-gray-400 text-sm sm:text-base">
            Ingresá tus datos de jugador federativo para darte de alta.
          </p>
        </div>

        {/* Formulario y mensajes - Scrollable e independiente en Desktop */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-12 sm:px-12 md:px-16 lg:pb-24 w-full max-w-2xl mx-auto">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-start gap-3 text-sm mb-6"
            >
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-brand-chartreuse/10 border border-brand-chartreuse/20 text-brand-chartreuse p-8 rounded-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="size-16 rounded-full bg-brand-chartreuse/20 flex items-center justify-center mb-2">
                <Mail className="size-8 text-brand-chartreuse" />
              </div>
              <h3 className="text-2xl font-bold text-brand-white">
                ¡Registro completado!
              </h3>
              <p className="text-sm text-gray-300 max-w-md">
                Enviamos un enlace de activación a tu correo electrónico. Por
                favor, verificalo para activar tu ficha deportiva.
              </p>
              <Link
                href="/login"
                className="mt-4 bg-brand-chartreuse text-brand-black font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                Ir al inicio de sesión
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleEmailSignup} className="space-y-6">
              {/* Selector de Foto de Perfil */}
              <div className="flex flex-col items-center justify-center gap-3 py-4 bg-brand-card/10 rounded-2xl border border-brand-white/5 mb-2">
                <div className="relative group size-20 rounded-full bg-brand-input border border-brand-white/10 flex items-center justify-center overflow-hidden cursor-pointer shadow-inner">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Vista previa"
                      fill
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <User className="size-7 text-gray-500 group-hover:text-brand-chartreuse transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                    <Camera className="size-4 text-brand-white mb-0.5" />
                    <span className="text-[8px] text-brand-white font-bold uppercase">
                      Subir
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-400 block">
                    Foto de Perfil (Opcional)
                  </span>
                  {avatarError && (
                    <span className="text-red-400 text-[10px] mt-1 block">
                      {avatarError}
                    </span>
                  )}
                </div>
              </div>

              {/* Fila 1: Nombre & Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Nombre *
                  </label>
                  <div className="relative group">
                    <User
                      className={`absolute left-4 top-1/2 -translate-y-1/2 size-4.5 transition-colors ${errors.nombre ? "text-red-400" : "text-gray-500 group-focus-within:text-brand-chartreuse"}`}
                    />
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) =>
                        handleNombreChange(e.target.value, "nombre")
                      }
                      className={getInputStyles(!!errors.nombre)}
                      placeholder="Nombre"
                    />
                  </div>
                  {errors.nombre && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.nombre}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Apellido *
                  </label>
                  <div className="relative group">
                    <User
                      className={`absolute left-4 top-1/2 -translate-y-1/2 size-4.5 transition-colors ${errors.apellido ? "text-red-400" : "text-gray-500 group-focus-within:text-brand-chartreuse"}`}
                    />
                    <input
                      type="text"
                      required
                      value={apellido}
                      onChange={(e) =>
                        handleNombreChange(e.target.value, "apellido")
                      }
                      className={getInputStyles(!!errors.apellido)}
                      placeholder="Apellido"
                    />
                  </div>
                  {errors.apellido && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.apellido}
                    </p>
                  )}
                </div>
              </div>

              {/* Fila 2: DNI & Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    DNI (Obligatorio FAP) *
                  </label>
                  <div className="relative group">
                    <Fingerprint
                      className={`absolute left-4 top-1/2 -translate-y-1/2 size-4.5 transition-colors ${errors.dni ? "text-red-400" : "text-gray-500 group-focus-within:text-brand-chartreuse"}`}
                    />
                    <input
                      type="text"
                      placeholder="Ej: 40.234.567"
                      value={dni}
                      onChange={(e) => handleDniChange(e.target.value)}
                      className={getInputStyles(!!errors.dni)}
                      required
                    />
                  </div>
                  {errors.dni && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.dni}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Teléfono de Contacto (Opcional)
                  </label>
                  <div className="relative group">
                    <Phone
                      className={`absolute left-4 top-1/2 -translate-y-1/2 size-4.5 transition-colors ${errors.telefono ? "text-red-400" : "text-gray-500 group-focus-within:text-brand-chartreuse"}`}
                    />
                    <input
                      type="tel"
                      placeholder="Ej: +54 9 351..."
                      value={telefono}
                      onChange={(e) => handleTelefonoChange(e.target.value)}
                      className={getInputStyles(!!errors.telefono)}
                    />
                  </div>
                  {errors.telefono && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.telefono}
                    </p>
                  )}
                </div>
              </div>

              {/* Fila 3: Provincia & Lado Preferido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Provincia de residencia *
                  </label>
                  <CustomDropdown
                    value={residencia}
                    onChange={(val) => {
                      setResidencia(val);
                      if (errors.residencia)
                        setErrors((p) => ({ ...p, residencia: undefined }));
                    }}
                    options={PROVINCIAS_ARG}
                    placeholder="Seleccionar provincia..."
                    hasError={!!errors.residencia}
                  />
                  {errors.residencia && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.residencia}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Lado Preferido *
                  </label>
                  <CustomDropdown
                    value={ladoPreferido}
                    onChange={(val) => {
                      setLadoPreferido(val);
                      if (errors.ladoPreferido)
                        setErrors((p) => ({ ...p, ladoPreferido: undefined }));
                    }}
                    options={LADOS_PADEL}
                    placeholder="Seleccionar lado..."
                    hasError={!!errors.ladoPreferido}
                  />
                  {errors.ladoPreferido && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.ladoPreferido}
                    </p>
                  )}
                </div>
              </div>

              {/* Fila 4: Categoría Padel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Categoría Padel *
                  </label>
                  <CustomDropdown
                    value={categoria}
                    onChange={(val) => {
                      setCategoria(val);
                      if (errors.categoria)
                        setErrors((p) => ({ ...p, categoria: undefined }));
                    }}
                    options={NIVELES_PADEL}
                    placeholder="Seleccionar..."
                    hasError={!!errors.categoria}
                  />
                  {errors.categoria && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.categoria}
                    </p>
                  )}
                </div>
                <div className="hidden md:block" />
              </div>

              <div className="border-t border-brand-white/5 my-2 pt-6" />

              {/* Fila Email - Ancho Completo */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                  Email *
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-chartreuse transition-colors size-4.5" />
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-brand-input rounded-xl border border-brand-white/5 text-brand-white placeholder-gray-500 focus:outline-none focus:border-brand-chartreuse focus:ring-1 focus:ring-brand-chartreuse transition-all caret-white text-sm"
                    required
                  />
                </div>
              </div>

              {/* Fila Contraseñas Dobles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Contraseña *
                  </label>
                  <div className="relative group">
                    <LockKeyhole
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors size-4.5 ${errors.password ? "text-red-400" : "text-gray-500 group-focus-within:text-brand-chartreuse"}`}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password)
                          setErrors((p) => ({ ...p, password: undefined }));
                      }}
                      className={getInputStyles(!!errors.password)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.password}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">
                    Confirmar Contraseña *
                  </label>
                  <div className="relative group">
                    <LockKeyhole
                      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors size-4.5 ${errors.confirmPassword ? "text-red-400" : "text-gray-500 group-focus-within:text-brand-chartreuse"}`}
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword)
                          setErrors((p) => ({
                            ...p,
                            confirmPassword: undefined,
                          }));
                      }}
                      className={getInputStyles(!!errors.confirmPassword)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-white transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1.5 ml-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full bg-brand-chartreuse text-brand-black font-extrabold py-4 rounded-xl transition-all flex justify-center items-center gap-2.5 text-base shadow-lg shadow-brand-chartreuse/10 cursor-pointer mt-6 hover:shadow-brand-chartreuse/25 hover:opacity-95"
              >
                {loading ? (
                  <span className="animate-pulse">Registrando...</span>
                ) : (
                  <>
                    {`Crear cuenta de jugador `}
                    <ArrowRight className="size-5" />
                  </>
                )}
              </motion.button>
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

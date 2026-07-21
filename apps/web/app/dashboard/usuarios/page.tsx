"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCog,
  Plus,
  X,
  Save,
  Users,
  Building2,
  MapPin,
  Search,
  Filter,
  Edit2,
  UserX,
  UserCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  UsuariosService,
  UsuarioAdmin,
  CrearUsuarioDTO,
} from "@/utils/services/usuarios";
import { ClubesService } from "@/utils/services/clubes";
import { Club } from "@/utils/types";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";
import CustomDropdown from "@/components/ui/CustomDropdown";
import FeedbackModal, {
  FeedbackModalProps,
} from "@/components/ui/FeedbackModal";
import type { RolUsuario } from "@/utils/types/user.types";
import { sileo } from "sileo";

const ROLES_CREABLES = [
  { value: "admin", label: "Administrador Genérico" },
  { value: "admin_club", label: "Administrador de Club" },
  { value: "admin_provincial", label: "Asociación Provincial" },
  { value: "admin_federacion", label: "Federación Nacional" },
];

const ROL_LABELS: Record<string, string> = {
  superadmin: "Superadmin",
  admin_federacion: "Federación Nacional",
  admin_provincial: "Asociación Provincial",
  admin_club: "Admin Club",
  admin: "Admin Genérico",
  usuario: "Usuario",
};

const ROL_COLORS: Record<string, string> = {
  superadmin:
    "bg-brand-chartreuse/10 text-brand-chartreuse border-brand-chartreuse/20",
  admin_federacion: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  admin_provincial: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  admin_club: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  admin: "bg-white/5 text-gray-400 border-white/10",
};

export default function GestionUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UsuarioAdmin | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  // Form state creación
  const [form, setForm] = useState<CrearUsuarioDTO>({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    rol: "admin" as RolUsuario,
    club_id: null,
    provincia: null,
  });

  // Form state edición
  const [editForm, setEditForm] = useState<{
    nombre: string;
    apellido: string;
    email: string;
    rol: RolUsuario;
    club_id: string | null;
    provincia: string | null;
  }>({
    nombre: "",
    apellido: "",
    email: "",
    rol: "admin" as RolUsuario,
    club_id: null,
    provincia: null,
  });

  const cargarDatos = async () => {
    try {
      const [usrs, clubsData] = await Promise.all([
        UsuariosService.listar(filtroRol || undefined),
        ClubesService.getAll().catch(() => ({ data: [], total: 0 })),
      ]);
      setUsuarios(usrs);
      setClubs(clubsData?.data || []);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroRol]);

  const resetForm = () => {
    setForm({
      email: "",
      password: "",
      nombre: "",
      apellido: "",
      rol: "admin" as RolUsuario,
      club_id: null,
      provincia: null,
    });
  };

  const handleCrearUsuario = async () => {
    if (!form.email || !form.password || !form.nombre || !form.apellido) {
      sileo.warning({
        title: "Campos incompletos",
        description: "Completá todos los campos obligatorios.",
      });
      return;
    }

    if (form.password.length < 6) {
      sileo.warning({
        title: "Contraseña insegura",
        description: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    if (form.rol === "admin_club" && !form.club_id) {
      sileo.warning({
        title: "Club requerido",
        description:
          "Seleccioná el club al que se asignará este administrador.",
      });
      return;
    }

    try {
      setSaving(true);
      await UsuariosService.crear(form);
      sileo.success({
        title: "¡Usuario creado!",
        description: `${form.nombre} ${form.apellido} fue registrado como ${ROL_LABELS[form.rol] || form.rol}.`,
      });
      setModalOpen(false);
      resetForm();
      cargarDatos();
    } catch (err: any) {
      sileo.error({
        title: "Error al crear usuario",
        description:
          err?.response?.data?.error || err.message || "Error desconocido.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (user: UsuarioAdmin) => {
    setUserToEdit(user);
    setEditForm({
      nombre: user.nombre || "",
      apellido: user.apellido || "",
      email: user.email || "",
      rol: user.rol || ("admin" as RolUsuario),
      club_id: user.club_id || null,
      provincia: user.lugar_residencia || null,
    });
    setEditModalOpen(true);
  };

  const handleGuardarEdicion = async () => {
    if (!userToEdit) return;
    if (!editForm.nombre || !editForm.apellido || !editForm.email) {
      sileo.warning({
        title: "Campos incompletos",
        description: "Nombre, apellido y email son requeridos.",
      });
      return;
    }

    if (editForm.rol === "admin_club" && !editForm.club_id) {
      sileo.warning({
        title: "Club requerido",
        description: "Seleccioná el club para este usuario.",
      });
      return;
    }

    try {
      setSaving(true);
      await UsuariosService.actualizarUsuario(userToEdit.id, editForm);
      sileo.success({
        title: "Usuario actualizado",
        description: "Los cambios han sido guardados correctamente.",
      });
      setEditModalOpen(false);
      setUserToEdit(null);
      cargarDatos();
    } catch (err: any) {
      sileo.error({
        title: "Error al actualizar",
        description:
          err?.response?.data?.error ||
          err.message ||
          "No se pudo actualizar el usuario.",
      });
    } finally {
      setSaving(false);
    }
  };

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalProps>({
    isOpen: false,
    onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
    title: "",
    description: "",
  });

  const handleSolicitarToggleEstado = (user: UsuarioAdmin) => {
    const isInhabilitando = !user.inhabilitado;
    const accion = isInhabilitando ? "Inhabilitar" : "Habilitar";

    setFeedbackModal({
      isOpen: true,
      onClose: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      type: isInhabilitando ? "danger" : "info",
      title: `¿Confirmar ${accion.toLowerCase()} usuario?`,
      description: isInhabilitando
        ? `¿Estás seguro de que deseas inhabilitar al administrador ${user.nombre} ${user.apellido}? No podrá ingresar al sistema hasta que lo vuelvas a activar.`
        : `¿Deseas volver a habilitar al administrador ${user.nombre} ${user.apellido} para restablecer sus accesos?`,
      confirmText: `${accion} Usuario`,
      cancelText: "Cancelar",
      onConfirm: () => handleEjecutarToggleEstado(user),
    });
  };

  const handleEjecutarToggleEstado = async (user: UsuarioAdmin) => {
    const nuevoEstadoInhabilitado = !user.inhabilitado;
    const accionTexto = nuevoEstadoInhabilitado ? "inhabilitar" : "habilitar";

    try {
      setFeedbackModal((prev) => ({ ...prev, isLoading: true }));
      await UsuariosService.toggleEstado(user.id, nuevoEstadoInhabilitado);
      setFeedbackModal((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));

      sileo.success({
        title: `Usuario ${nuevoEstadoInhabilitado ? "inhabilitado" : "activado"}`,
        description: `${user.nombre} ${user.apellido} ha sido ${nuevoEstadoInhabilitado ? "desactivado" : "activado"} correctamente.`,
      });
      cargarDatos();
    } catch (err: any) {
      setFeedbackModal((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
      sileo.error({
        title: `Error al ${accionTexto}`,
        description:
          err?.response?.data?.error ||
          err.message ||
          "No se pudo cambiar el estado.",
      });
    }
  };

  // Filtro de búsqueda local
  const usuariosFiltrados = usuarios.filter((u) => {
    if (!busqueda) return true;
    const term = busqueda.toLowerCase();
    return (
      (u.nombre || "").toLowerCase().includes(term) ||
      (u.apellido || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term)
    );
  });

  const opcionesFiltroRol = [
    { value: "", label: "Todos los roles" },
    ...ROLES_CREABLES,
  ];

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10 animate-pulse">
        <div className="w-72 h-10 bg-white/10 rounded-lg mb-2"></div>
        <div className="w-48 h-4 bg-white/5 rounded-md mb-8"></div>
        <div className="h-96 bg-[#151515] border border-white/5 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-8 md:px-10 md:py-10">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight md:text-4xl">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-1">
            Creá, editá y administrá accesos de los usuarios administrativos.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-brand-chartreuse hover:opacity-90 text-brand-black px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] text-sm cursor-pointer"
        >
          <Plus className="size-4" /> Crear Usuario
        </button>
      </div>

      {/* FILTROS CON CUSTOM DROPDOWN */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-[#151515] border border-white/5 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-white/10 focus:outline-none transition-colors"
          />
        </div>
        <div className="w-full sm:w-64">
          <CustomDropdown
            value={filtroRol}
            onChange={(val) => {
              if (val !== filtroRol) {
                setFiltroRol(val);
              }
            }}
            options={opcionesFiltroRol}
            placeholder="Filtrar por rol..."
          />
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-[#151515] border border-white/5 rounded-2xl overflow-hidden">
        {usuariosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Users className="size-12 opacity-30 mb-3" />
            <p className="text-sm font-medium">
              No se encontraron usuarios administrativos.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Creá uno con el botón de arriba.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                  <th className="py-4 px-6">Usuario</th>
                  <th className="py-4 px-6">Rol</th>
                  <th className="py-4 px-6">Club / Provincia</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {usuariosFiltrados.map((u) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`hover:bg-white/2 transition-colors ${u.inhabilitado ? "opacity-60 bg-red-500/5" : ""}`}
                  >
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-white text-[13px]">
                          {(u.apellido || "").toUpperCase()}
                          {u.apellido && u.nombre ? ", " : ""}
                          {u.nombre || ""}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {u.email || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          ROL_COLORS[u.rol] ||
                          "bg-white/5 text-gray-400 border-white/10"
                        }`}
                      >
                        {ROL_LABELS[u.rol] || u.rol}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-300 text-[13px] font-medium">
                      {u.rol === "admin_club" && u.club_id ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-amber-400" />
                          {clubs.find((c) => String(c.id) === String(u.club_id))
                            ?.nombre || u.club_id}
                        </span>
                      ) : u.rol === "admin_provincial" && u.lugar_residencia ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-blue-400" />
                          {u.lugar_residencia}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          u.inhabilitado ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            u.inhabilitado ? "bg-red-500" : "bg-emerald-400"
                          }`}
                        />
                        {u.inhabilitado ? "Inhabilitado" : "Activo"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {u.rol !== "superadmin" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer"
                            title="Editar datos del usuario"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleSolicitarToggleEstado(u)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              u.inhabilitado
                                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                            }`}
                            title={
                              u.inhabilitado
                                ? "Habilitar usuario"
                                : "Inhabilitar usuario"
                            }
                          >
                            {u.inhabilitado ? (
                              <UserCheck className="size-4" />
                            ) : (
                              <UserX className="size-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREACIÓN */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1a1a1a] p-8 rounded-4xl border border-white/5 w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative"
            >
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">
                    Crear Usuario Administrativo
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    El usuario podrá iniciar sesión inmediatamente sin
                    verificación de email.
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Nombre
                    </label>
                    <input
                      value={form.nombre}
                      onChange={(e) =>
                        setForm({ ...form, nombre: e.target.value })
                      }
                      placeholder="Juan"
                      className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Apellido
                    </label>
                    <input
                      value={form.apellido}
                      onChange={(e) =>
                        setForm({ ...form, apellido: e.target.value })
                      }
                      placeholder="Pérez"
                      className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="usuario@padelnexus.com"
                    className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-brand-card p-3 pr-10 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Rol Asignado
                  </label>
                  <CustomDropdown
                    value={form.rol}
                    onChange={(val) =>
                      setForm({
                        ...form,
                        rol: val as RolUsuario,
                        club_id: null,
                        provincia: null,
                      })
                    }
                    options={ROLES_CREABLES}
                    placeholder="Seleccionar Rol..."
                  />
                </div>

                {form.rol === "admin_club" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      <Building2 className="size-3.5 inline mr-1 -mt-0.5" />
                      Club Asignado
                    </label>
                    <CustomDropdown
                      value={form.club_id || ""}
                      onChange={(val) => setForm({ ...form, club_id: val })}
                      options={clubs.map((c) => ({
                        value: String(c.id),
                        label: c.nombre,
                      }))}
                      placeholder={
                        clubs.length === 0
                          ? "No hay clubes creados"
                          : "Seleccionar Club..."
                      }
                      disabled={clubs.length === 0}
                    />
                  </div>
                )}

                {form.rol === "admin_provincial" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      <MapPin className="size-3.5 inline mr-1 -mt-0.5" />
                      Provincia de Jurisdicción
                    </label>
                    <CustomDropdown
                      value={form.provincia || ""}
                      onChange={(val) => setForm({ ...form, provincia: val })}
                      options={PROVINCIAS_ARG.map((p) => ({
                        value: p.value,
                        label: p.label,
                      }))}
                      placeholder="Seleccionar Provincia..."
                    />
                  </div>
                )}

                <button
                  disabled={
                    saving ||
                    !form.email ||
                    !form.password ||
                    !form.nombre ||
                    !form.apellido
                  }
                  onClick={handleCrearUsuario}
                  className="w-full bg-brand-chartreuse disabled:opacity-50 text-brand-black font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg cursor-pointer"
                >
                  {saving ? (
                    "Creando usuario..."
                  ) : (
                    <>
                      <Save className="size-5" />
                      Crear Usuario
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDICIÓN */}
      <AnimatePresence>
        {editModalOpen && userToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1a1a1a] p-8 rounded-4xl border border-white/5 w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative"
            >
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1">
                    Editar Usuario
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Modificá los datos del administrador {userToEdit.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setUserToEdit(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Nombre
                    </label>
                    <input
                      value={editForm.nombre}
                      onChange={(e) =>
                        setEditForm({ ...editForm, nombre: e.target.value })
                      }
                      className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Apellido
                    </label>
                    <input
                      value={editForm.apellido}
                      onChange={(e) =>
                        setEditForm({ ...editForm, apellido: e.target.value })
                      }
                      className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full bg-brand-card p-3 rounded-xl border border-transparent focus:border-white/10 text-white focus:outline-none text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Rol Asignado
                  </label>
                  <CustomDropdown
                    value={editForm.rol}
                    onChange={(val) =>
                      setEditForm({
                        ...editForm,
                        rol: val as RolUsuario,
                        club_id: null,
                        provincia: null,
                      })
                    }
                    options={ROLES_CREABLES}
                    placeholder="Seleccionar Rol..."
                  />
                </div>

                {editForm.rol === "admin_club" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      <Building2 className="size-3.5 inline mr-1 -mt-0.5" />
                      Club Asignado
                    </label>
                    <CustomDropdown
                      value={editForm.club_id || ""}
                      onChange={(val) =>
                        setEditForm({ ...editForm, club_id: val })
                      }
                      options={clubs.map((c) => ({
                        value: String(c.id),
                        label: c.nombre,
                      }))}
                      placeholder="Seleccionar Club..."
                    />
                  </div>
                )}

                {editForm.rol === "admin_provincial" && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      <MapPin className="size-3.5 inline mr-1 -mt-0.5" />
                      Provincia de Jurisdicción
                    </label>
                    <CustomDropdown
                      value={editForm.provincia || ""}
                      onChange={(val) =>
                        setEditForm({ ...editForm, provincia: val })
                      }
                      options={PROVINCIAS_ARG.map((p) => ({
                        value: p.value,
                        label: p.label,
                      }))}
                      placeholder="Seleccionar Provincia..."
                    />
                  </div>
                )}

                <button
                  disabled={
                    saving ||
                    !editForm.nombre ||
                    !editForm.apellido ||
                    !editForm.email
                  }
                  onClick={handleGuardarEdicion}
                  className="w-full bg-brand-chartreuse disabled:opacity-50 text-brand-black font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg cursor-pointer"
                >
                  {saving ? (
                    "Guardando cambios..."
                  ) : (
                    <>
                      <Save className="size-5" />
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FEEDBACK MODAL DE CONFIRMACIÓN */}
      <FeedbackModal {...feedbackModal} />
    </div>
  );
}

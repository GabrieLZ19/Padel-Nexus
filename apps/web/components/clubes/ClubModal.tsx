"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  Trash2,
  Loader2,
  Plus,
  Minus,
  MapPin,
  Building2,
  CreditCard,
  Map,
} from "lucide-react";
import CustomDropdown from "../ui/CustomDropdown";
import { FormClubState } from "../../utils/types";
import { PROVINCIAS_ARG } from "@/utils/constants/padelConfig";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  formData: FormClubState;
  setFormData: React.Dispatch<React.SetStateAction<FormClubState>>;
  isSaving: boolean;
  editingId: string | null;
}

const ESTADOS = [
  { value: "Activo", label: "Activo" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Inactivo", label: "Inactivo" },
];

export default function ClubModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  formData,
  setFormData,
  isSaving,
  editingId,
}: ClubModalProps) {
  const [localidades, setLocalidades] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [localidadSearch, setLocalidadSearch] = useState(
    formData.localidad || "",
  );
  const [isLocalidadOpen, setIsLocalidadOpen] = useState(false);
  const localidadDropdownRef = useRef<HTMLDivElement>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Inicializar el mapa al abrir el modal
  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const initialLat = formData.latitud || -34.6037;
      const initialLng = formData.longitud || -58.3816;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: formData.latitud ? 15 : 10,
        scrollWheelZoom: true,
      });

      const isLightMode = document.documentElement.classList.contains("light");
      const tileUrl = isLightMode
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        attribution: "Tiles &copy; Esri &copy; CARTO",
        maxZoom: 18,
      }).addTo(map);

      const clubIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            width: 24px; height: 24px;
            background: #CBFE01;
            border: 4px solid #0b0b0b;
            border-radius: 50%;
            box-shadow: 0 0 16px rgba(203, 254, 1, 0.8);
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: clubIcon,
        draggable: true,
      }).addTo(map);

      markerInstanceRef.current = marker;
      mapInstanceRef.current = map;

      const updateCoords = async (lat: number, lng: number) => {
        setFormData((prev) => ({
          ...prev,
          latitud: parseFloat(lat.toFixed(6)),
          longitud: parseFloat(lng.toFixed(6)),
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            {
              headers: {
                "Accept-Language": "es",
              },
            }
          );
          const data = await response.json();
          if (data && data.address) {
            const road = data.address.road || data.address.pedestrian || "";
            const houseNumber = data.address.house_number || "";
            const suburb = data.address.suburb || data.address.neighbourhood || "";
            const city = data.address.city || data.address.town || data.address.village || "";
            
            const parts = [];
            if (road) {
              parts.push(houseNumber ? `${road} ${houseNumber}` : road);
            }
            if (suburb) parts.push(suburb);
            if (city) parts.push(city);

            const addressString = parts.join(", ");
            if (addressString) {
              setFormData((prev) => ({
                ...prev,
                localidad: addressString,
              }));
              setLocalidadSearch(addressString);
            }
          }
        } catch (err) {
          console.error("Error al reverse geocodificar la coordenada:", err);
        }
      };

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        updateCoords(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updateCoords(lat, lng);
      });

      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Geocodificar la provincia y localidad escritas para posicionar el mapa y marcador
  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || !markerInstanceRef.current) return;

    const delayDebounce = setTimeout(async () => {
      const q = [formData.localidad, formData.provincia, "Argentina"]
        .filter(Boolean)
        .join(", ");

      if (!q || q === "Argentina") return;

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
          {
            headers: {
              "Accept-Language": "es",
            },
          }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          // Guardar coordenadas de fondo
          setFormData((prev) => ({
            ...prev,
            latitud: parseFloat(lat.toFixed(6)),
            longitud: parseFloat(lon.toFixed(6)),
          }));

          // Panning del mapa y marcador
          if (markerInstanceRef.current && mapInstanceRef.current) {
            markerInstanceRef.current.setLatLng([lat, lon]);
            mapInstanceRef.current.setView([lat, lon], 14);
          }
        }
      } catch (err) {
        console.error("Error al geocodificar dirección:", err);
      }
    }, 1200); // 1.2 segundos de debounce para evitar spam

    return () => clearTimeout(delayDebounce);
  }, [formData.provincia, formData.localidad, isOpen]);

  // Sincronizar localidadSearch con el prop formData
  useEffect(() => {
    if (isOpen) {
      setLocalidadSearch(formData.localidad || "");
    }
  }, [formData.localidad, isOpen]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        localidadDropdownRef.current &&
        !localidadDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLocalidadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch localidades de la provincia seleccionada
  useEffect(() => {
    if (!formData.provincia || !isOpen) {
      setLocalidades([]);
      return;
    }

    let active = true;
    const loadLocalidades = async () => {
      setLoadingLocalidades(true);
      const provName =
        formData.provincia === "CABA"
          ? "Ciudad Autónoma de Buenos Aires"
          : formData.provincia;
      try {
        const res = await fetch(
          `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(
            provName,
          )}&max=2000&campos=nombre`,
        );
        const data = await res.json();
        if (active && data && data.localidades) {
          const list = data.localidades
            .map((loc: any) => {
              const formattedName = loc.nombre
                .toLowerCase()
                .split(" ")
                .map(
                  (word: string) =>
                    word.charAt(0).toUpperCase() + word.slice(1),
                )
                .join(" ");
              return formattedName;
            })
            .filter(
              (value: string, index: number, self: string[]) =>
                self.indexOf(value) === index,
            )
            .sort((a: string, b: string) => a.localeCompare(b))
            .map((name: string) => ({ value: name, label: name }));

          setLocalidades(list);
        }
      } catch (err) {
        console.error("Error loading localidades:", err);
      } finally {
        if (active) setLoadingLocalidades(false);
      }
    };

    loadLocalidades();
    return () => {
      active = false;
    };
  }, [formData.provincia, isOpen]);

  const filteredLocalidades = localidades.filter((loc) =>
    loc.label.toLowerCase().includes(localidadSearch.toLowerCase()),
  );

  return (
    <>
      <style>{`
        input.no-spinner::-webkit-outer-spin-button,
        input.no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input.no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="bg-brand-card/90 border border-brand-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative backdrop-blur-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-brand-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {/* Neon Glow inside modal */}
              <div className="absolute -top-20 -right-20 size-40 rounded-full bg-brand-chartreuse/10 blur-[50px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 size-40 rounded-full bg-brand-chartreuse/5 blur-[50px] pointer-events-none" />

              {/* ENCABEZADO */}
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="size-12 rounded-full bg-brand-chartreuse/10 border border-brand-chartreuse/20 flex items-center justify-center shadow-[0_0_15px_rgba(203,254,1,0.05)]">
                    <Building2 className="size-6 text-brand-chartreuse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-brand-white tracking-tight font-sans leading-none mb-1.5">
                      {editingId ? "Gestionar Club" : "Nuevo Club"}
                    </h2>
                    <p className="text-gray-400 text-xs sm:text-sm">
                      Completá los datos del complejo deportivo
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-brand-white/5 flex items-center justify-center text-gray-400 hover:bg-brand-white/10 hover:text-brand-white transition-colors shrink-0 cursor-pointer"
                >
                  <X className="size-4" />
                </motion.button>
              </div>

              <div className="space-y-6 relative z-10">
                {/* FILA 1: NOMBRE */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Nombre del Complejo
                  </label>
                  <input
                    placeholder="Ej: Padel Center"
                    className="w-full bg-brand-black px-4 py-3.5 rounded-xl border border-brand-white/5 focus:border-brand-chartreuse/30 focus:outline-none text-sm text-brand-white transition-colors"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                  />
                </div>

                {/* FILA 2: PROVINCIA Y LOCALIDAD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Provincia
                    </label>
                    <CustomDropdown
                      value={formData.provincia}
                      onChange={(val) => {
                        setFormData({
                          ...formData,
                          provincia: val,
                          localidad: "",
                        });
                        setLocalidadSearch("");
                      }}
                      options={PROVINCIAS_ARG}
                      placeholder="Seleccionar..."
                    />
                  </div>

                  <div className="space-y-1.5" ref={localidadDropdownRef}>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Localidad
                    </label>
                    <div className="relative">
                      <input
                        placeholder={
                          formData.provincia
                            ? "Ciudad / Barrio..."
                            : "Seleccioná provincia primero..."
                        }
                        disabled={!formData.provincia}
                        className={`w-full bg-brand-black px-4 py-3.5 rounded-xl border text-sm text-brand-white transition-colors focus:outline-none ${
                          !formData.provincia
                            ? "cursor-not-allowed opacity-40 border-brand-white/5 text-gray-500"
                            : "focus:border-brand-chartreuse/30 border-brand-white/5"
                        }`}
                        value={localidadSearch}
                        onFocus={() =>
                          formData.provincia && setIsLocalidadOpen(true)
                        }
                        onChange={(e) => {
                          setLocalidadSearch(e.target.value);
                          setFormData({
                            ...formData,
                            localidad: e.target.value,
                          });
                          setIsLocalidadOpen(true);
                        }}
                      />
                      <AnimatePresence>
                        {isLocalidadOpen && formData.provincia && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.12, ease: "easeOut" }}
                            className="absolute left-0 right-0 mt-2 bg-brand-card border border-brand-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-50 overflow-hidden max-h-52 overflow-y-auto 
                            [&::-webkit-scrollbar]:w-1.5 
                            [&::-webkit-scrollbar-track]:bg-transparent 
                            [&::-webkit-scrollbar-thumb]:bg-brand-white/10 
                            [&::-webkit-scrollbar-thumb]:rounded-full 
                            hover:[&::-webkit-scrollbar-thumb]:bg-brand-white/20"
                          >
                            {loadingLocalidades ? (
                              <div className="p-4 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                                <Loader2 className="animate-spin size-4 text-brand-chartreuse" />
                                Buscando localidades...
                              </div>
                            ) : filteredLocalidades.length === 0 ? (
                              <div className="p-4 text-xs text-gray-500 text-center">
                                No se encontraron resultados. Podés escribirla a
                                mano.
                              </div>
                            ) : (
                              <div>
                                <div className="px-4 py-2 text-[9px] text-brand-chartreuse font-extrabold uppercase tracking-widest border-b border-brand-white/5 bg-brand-white/5 flex items-center gap-1">
                                  <MapPin size={9} /> Resultados Geográficos FAP
                                </div>
                                <div className="py-1">
                                  {filteredLocalidades.map((loc) => {
                                    const isSelected =
                                      formData.localidad === loc.value;
                                    return (
                                      <div
                                        key={loc.value}
                                        onClick={() => {
                                          setFormData({
                                            ...formData,
                                            localidad: loc.value,
                                          });
                                          setLocalidadSearch(loc.value);
                                          setIsLocalidadOpen(false);
                                        }}
                                        className={`px-4 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors text-left flex items-center ${
                                          isSelected
                                            ? "text-brand-chartreuse font-bold bg-brand-chartreuse/5 border-l-2 border-brand-chartreuse"
                                            : "text-gray-300 border-l-2 border-transparent hover:bg-brand-white/5 hover:text-brand-white"
                                        }`}
                                      >
                                        {loc.label}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* FILA 3: CANCHAS Y ESTADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Cantidad de Canchas
                    </label>
                    <div className="flex items-center bg-brand-black border border-brand-white/5 rounded-xl overflow-hidden h-[50px] w-full">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            canchas: Math.max(1, (formData.canchas || 1) - 1),
                          })
                        }
                        className="w-12 h-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white flex items-center justify-center transition-colors cursor-pointer border-r border-brand-white/5 active:scale-95"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        className="no-spinner flex-1 text-center bg-transparent border-none text-brand-white text-sm font-semibold focus:outline-none w-full h-full"
                        value={formData.canchas || 1}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            canchas:
                              e.target.value === ""
                                ? 1
                                : Math.max(1, parseInt(e.target.value)),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            canchas: (formData.canchas || 1) + 1,
                          })
                        }
                        className="w-12 h-full bg-brand-white/5 hover:bg-brand-white/10 text-brand-white flex items-center justify-center transition-colors cursor-pointer border-l border-brand-white/5 active:scale-95"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Estado
                    </label>
                    <CustomDropdown
                      value={formData.estado}
                      onChange={(val) =>
                        setFormData({ ...formData, estado: val })
                      }
                      options={ESTADOS}
                      placeholder="Seleccionar..."
                      haciaArriba={true}
                    />
                  </div>
                </div>

                {/* SECCIÓN: DATOS DE TRANSFERENCIA */}
                <div className="space-y-4 pt-4 border-t border-brand-white/5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-brand-chartreuse" />
                    <span className="text-sm font-bold text-brand-white">Datos de Transferencia (para reservas de usuarios)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                        CBU / CVU
                      </label>
                      <input
                        placeholder="Ej: 00000031000..."
                        className="w-full bg-brand-black px-4 py-3.5 rounded-xl border border-brand-white/5 focus:border-brand-chartreuse/30 focus:outline-none text-sm text-brand-white transition-colors"
                        value={formData.cbu || ""}
                        onChange={(e) => {
                          const numericVal = e.target.value.replace(/\D/g, "");
                          setFormData((prev) => ({ ...prev, cbu: numericVal }));
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Alias
                      </label>
                      <input
                        placeholder="Ej: complejogol.padel"
                        className="w-full bg-brand-black px-4 py-3.5 rounded-xl border border-brand-white/5 focus:border-brand-chartreuse/30 focus:outline-none text-sm text-brand-white transition-colors"
                        value={formData.alias || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, alias: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* SECCIÓN: GEOLOCALIZACIÓN Y MAPA */}
                <div className="space-y-4 pt-4 border-t border-brand-white/5">
                  <div className="flex items-center gap-2">
                    <Map className="size-4 text-brand-chartreuse" />
                    <span className="text-sm font-bold text-brand-white">Ubicación Geográfica</span>
                  </div>


                  {/* MAPA INTERACTIVO */}
                  <div className="relative w-full h-[220px] rounded-2xl border border-brand-white/10 overflow-hidden bg-brand-black">
                    <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />
                  </div>
                  <p className="text-[11px] text-gray-400 text-center">
                    Hacé clic en el mapa o arrastrá el marcador para definir la ubicación exacta.
                  </p>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-4 border-t border-brand-white/5">
                  {editingId && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isSaving}
                      onClick={onDelete}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                    >
                      <Trash2 className="size-4" /> Eliminar Club
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={
                      isSaving ||
                      !formData.nombre ||
                      !formData.localidad ||
                      !formData.provincia
                        ? {}
                        : { scale: 1.02 }
                    }
                    whileTap={
                      isSaving ||
                      !formData.nombre ||
                      !formData.localidad ||
                      !formData.provincia
                        ? {}
                        : { scale: 0.98 }
                    }
                    disabled={
                      isSaving ||
                      !formData.nombre ||
                      !formData.localidad ||
                      !formData.provincia
                    }
                    onClick={onSave}
                    className="flex-2 w-full bg-brand-chartreuse hover:bg-[#b3e600] disabled:bg-brand-white/5 disabled:text-gray-500 text-brand-black font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-chartreuse/10 hover:shadow-brand-chartreuse/20 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none text-sm"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="animate-spin size-4" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />{" "}
                        {editingId ? "Guardar Cambios" : "Crear Club"}
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

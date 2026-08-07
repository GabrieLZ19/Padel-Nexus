# Contexto del Proyecto - Pádel Nexus

Este documento registra el estado actual de la plataforma Pádel Nexus a la fecha (Julio 2026). Sirve como fuente de verdad para evitar pérdida de contexto y garantizar consistencia en la implementación técnica de la **Fase 2** y el **Marketplace (Fase 3)**.

---

## 1. Arquitectura del Espacio de Trabajo
Pádel Nexus utiliza una estructura monorepo gestionada por **Turborepo** y `pnpm`:

*   **`apps/web`**: Aplicación frontend principal construida con **Next.js (App Router, React 19, Next 16)**.
    *   **Estilos**: Tailwind CSS v4, con configuraciones del tema y variables (Chartreuse `#CBFE01`, Forest Moss `#6E8901`, Dark Background `#0B0B0B`) definidas dentro de `app/globals.css` usando `@theme`.
    *   **Gestión de Estado**: Zustand (`store/useProfileStore.ts` y `store/useCartStore.ts`).
    *   **Real-time**: Cliente de Socket.io (`hooks/useSocket.ts`).
    *   **Cliente API**: Instancia de Axios centralizada (`utils/api.ts`) que adjunta automáticamente el token de sesión (leído de la cookie `padel_token`) en las cabeceras `Authorization: Bearer <token>`.
*   **`apps/api`**: Servidor backend en **Node.js** con **Express** y **TypeScript**.
    *   **Base de Datos**: Integración con Supabase mediante el SDK oficial (`@supabase/supabase-js`).
    *   **Real-time**: Servidor Socket.io (`services/socket.service.ts`).
    *   **Controladores y Rutas**: Capa de rutas Express que delega en controladores y estos a su vez en servicios de negocio.
*   **`apps/mobile`**: Estructura base para React Native (fuera del alcance activo en la web y CRM).

---

## 2. Autenticación y Autorización
La seguridad se maneja mediante tokens JWT emitidos por **Supabase Auth** y transmitidos en la cabecera `Authorization: Bearer <JWT>` a la API:

1.  **Validación de Sesión (Backend)**: El middleware `authenticate` (`apps/api/src/middleware/auth.ts`) ejecuta `supabase.auth.getUser(token)` para validar criptográficamente el JWT.
2.  **Validación de Roles**:
    *   **REGLA CRÍTICA**: Nunca se utiliza `user_metadata` para autorizar. El rol se lee directamente desde `app_metadata.rol` dentro del JWT para evitar consultas redundantes a la base de datos y garantizar la inviolabilidad de los datos.
    *   Los roles permitidos definidos en `apps/web/utils/types/user.types.ts` y en la base de datos (`rol_usuario_enum`) son:
        *   `usuario` (Jugador público)
        *   `admin` (Organizador general)
        *   `admin_provincial` (Federativo provincial)
        *   `admin_federacion` (Federativo nacional)
        *   `superadmin` (Administrador del sistema)
    *   El middleware `authorize(rolesPermitidos)` del backend bloquea accesos no autorizados.

---

## 3. Estado de la Base de Datos (Supabase)
El proyecto en Supabase (`tsmgxvygmdskhyhnjqvv` en la región `sa-east-1`) cuenta con las siguientes tablas creadas en el esquema `public`:

### 3.1. Gestión de Clubes y Reservas (Básico)
*   **`public.clubes`**: Almacena los clubes registrados.
*   **`public.canchas`**: Canchas físicas asociadas a un club.
*   **`public.turnos`**: Bloques horarios preestablecidos para las canchas de tenis/pádel.
*   **`public.reservas`**: Alquileres de turnos concretados por fecha.
*   **`public.turnos_fijos`**: Reservas recurrentes semanales para usuarios específicos.
*   **`public.articulos_alquiler`** & **`public.reserva_articulos`**: Alquiler de paletas/pelotas.

### 3.2. Jugadores, Licencias y Afiliaciones
*   **`public.perfiles`**: Tabla central que complementa `auth.users`.
    *   *Campos*: `id` (UUID), `nombre`, `apellido`, `telefono`, `email`, `categoria_padel`, `dni`, `lugar_residencia`, `created_at`.
*   **`public.licencias`**: Gestión de licencias FAP de los jugadores.

### 3.3. Torneos, Llaves y Competencia (FAP)
*   **`public.torneos`**: Configuraciones generales de los torneos federados y abiertos.
*   **`public.inscripciones`**: Duplas inscritas en torneos.
*   **`public.grupos`** & **`public.grupo_parejas`**: Gestión de zonas para formatos mixtos.
*   **`public.cuadros`**: Estructuras de brackets para las llaves eliminatorias.
*   **`public.partidos`**: Enfrentamientos individuales programados o jugados en torneos.

### 3.4. Armado de Partidos
*   **`public.partidos_abiertos`**: Publicaciones del tipo "Busco jugador".
*   **`public.inscripciones_partidos`**: Jugadores inscritos en un partido abierto.

### 3.5. Ecosistema de Marketplace
*   **`public.marketplace_vendedores`**: Registro de vendedores autorizados en el marketplace.
    *   *Restricción Check*: `tipo` debe ser `'jugador'`, `'club'`, `'entrenador'` o `'tienda'`. (Nota: No existe columna `localidad`).
*   **`public.marketplace_productos`**: Publicación física o de servicios.
    *   *Campos*: `id` (UUID), `vendedor_id`, `categoria_id`, `nombre`, `descripcion`, `precio`, `precio_anterior`, `stock`, `marca`, `thumbnail_url`, `imagenes` (Array de URLs en formato text[]), `tipo` (`'producto' | 'servicio'`), `destacado` (bool), `activo` (bool).
*   **`public.marketplace_ordenes`**: Encabezado de transacciones de compra.
*   **`public.marketplace_orden_items`**: Detalle de productos por orden.

---

## 4. Lineamientos de Desarrollo en Frontend (Reglas Clave)
Al modificar el frontend en `apps/web`, se deben seguir obligatoriamente estos lineamientos para mantener la consistencia de la plataforma:

1.  **Notificaciones y Alertas**:
    *   **Prohibido**: Utilizar `window.alert`, `toast` nativo o librerías de alerta secundarias.
    *   **Mandatorio**: Usar siempre el helper centralizado de alertas **`sileo`** (`sileo.success`, `sileo.error`, `sileo.warning`, `sileo.info`).
2.  **Selectores y Desplegables**:
    *   **Mandatorio**: Usar el componente reutilizable **`CustomDropdown`** para ordenar, filtrar o seleccionar opciones en lugar de elementos `<select>` nativos del navegador para asegurar la estética premium y uniforme.
3.  **Manejo de Imágenes de Productos**:
    *   El host `images.unsplash.com` se encuentra configurado en `next.config.ts`.
    *   Al renderizar productos, siempre aplicar el fallback de imagen de manera consistente: si `thumbnail_url` es nulo, recuperar la primera imagen del array `imagenes` (`prod.thumbnail_url || (prod.imagenes && prod.imagenes[0])`).
4.  **Drawer de Carrito (Portales)**:
    *   Para evitar solapamientos de z-index y recortes provocados por clases de contenedores padres (`overflow-hidden` o posiciones relativas en el Navbar), el **`CartDrawer`** se renderiza mediante un **React Portal** (`createPortal(..., document.body)`).
    *   Posee una animación de slide-in y slide-out nativa por keyframes CSS locales y retarda su desmontaje 280ms al cerrar para garantizar fluidez visual responsiva.

---

## 5. Segregación de Roles y Seguridad
Para mantener la seguridad e integridad del CRM del administrador:
*   Los vendedores y tiendas registran y gestionan sus productos, ventas y balances bajo el flujo público de perfil del jugador (`/mi-perfil/vendedor`).
*   La ruta `/dashboard` queda exclusivamente dedicada a administradores generales, federaciones provinciales y nacionales. El CRM del administrador de marketplace (`/dashboard/marketplace`) se utiliza únicamente para aprobar, suspender o auditar vendedores.

---

## 6. Git: dual remote (origin + Whapy)
Un solo working copy local. **No** cambiar `origin` al repo de la empresa (rompe deploys / hábitos de CI). **No** tocar `.env` ni reconectar Vercel/EAS al remoto de Whapy salvo pedido explícito.

| Remote | URL | Rol |
|---|---|---|
| `origin` | `https://github.com/GabrieLZ19/Padel-Nexus.git` | Trabajo diario + deploys |
| `whapy` | `https://github.com/Whapy-Dev/padel-nexus.git` | Entrega / espejo empresa |

`git push` / `git pull` sin args van a **origin** (upstream de `main` = `origin/main`).

### Después de cada commit (obligatorio)
```bash
git push origin main && git push whapy main
```

Playbook completo: `docs/WHAPY_DUAL_REMOTE.md`.

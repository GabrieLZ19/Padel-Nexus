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

---

## 7. Auditorías de producto (al 9 de octubre de 2026)

La fuente de los pedidos del cliente es el documento del 25/9 y `Padel Nexus — Auditoría UX y Requerimientos 27-9`. Lo que falta está en `docs/pendientes-auditoria-27-9.md`: se avanza de arriba hacia abajo, un requerimiento por vez. El estado de abajo es el del código, no el que figuraba como pendiente el 27/9.

### Hecho a partir de las observaciones del 25/9
*   Login con los slogans de marca y la palabra «cuenta» (PUB-03).
*   Torneo gratuito sin estado «Pagó» (ASI-03).
*   Reglamentos FAP y APA, y Amateur solo en Local o Privado (ASI-04, ya verificado en el documento).
*   Numeración de partidos después de las zonas, rondas en español y orden octavos → final (CUA-01, CUA-02).
*   W.O. separado de lesión, y corrección de un resultado ya cargado (RES-02, RES-01).
*   Llave y zonas editables después de cargar resultados. El pase de una pareja de menores a una categoría superior del mismo grupo no regenera la llave: saca a la pareja con bye y la inserta en un hueco o en un partido nuevo, con motivo y auditoría (ASI-05).
*   Ranking nacional filtrable, sin «FAP» fijo en el título (RAN-01, GEN-07 en la parte de ranking). Los puntos del jugador salen del cierre. El ranking por provincia también: se indican los puntos y la ronda desde la que empiezan a sumar, y solo en alcance nacional, porque es el único en el que las parejas representan a su provincia. En el ejemplo de Libres Caballeros 7ª, la segunda «Córdoba B» de octavos es Córdoba E; el total de Córdoba sigue en 12 (RAN-02).
*   Rankings de asociación y club por género y después por categoría, con los nombres de categoría del documento (RAN-03).
*   El programador conserva cancha y horario al rearmar una zona, y permite mover parejas con motivo (parte de PRO-05).
*   Tarjetas de zona legibles en modo claro.

### Circuito competitivo (síntesis del 25/9)
*   El jugador no se afilia a un club para jugar. El cambio de provincia es un pase entre asociaciones (`pases_representacion`), con motivo, un pendiente por jugador, y aprobación de federación o asociación.
*   Alcance `Clasificatorio` para el torneo de un club cuando no hay asociación provincial. No fuerza el reglamento FAP.
*   La afiliación a club que se crea al aprobar una licencia sigue existiendo. Lo que se quitó es la solicitud del jugador.

### Auditoría 27/9 — en curso
*   **ACC-01 (crítica):** una cuenta de asociación solo lista torneos, inscripciones y clubes de su provincia. Los nacionales se ven en lectura y el servidor rechaza editar, eliminar o cargar resultados. Sin provincia asignada, las listas vuelven vacías con un aviso. El club sede de un nacional solo consulta el torneo: no edita, no elimina, no reprograma y no carga resultados, porque solo aporta las instalaciones. Quien organiza (federación o asociación) es quien administra la competencia. El torneo provincial o local que el club organiza sigue editable. El programador de un nacional en el club sede queda en consulta: el servidor rechaza publicar, asignar, limpiar horarios y cargar resultados.
*   **SEC-01:** Estadísticas y Moderación no tenían página y el menú caía en el 404 público. Salieron del menú hasta que esas secciones existan.
*   **ASI-01:** el índice del asistente es una barra horizontal debajo del título. A 1366×641 se ven los 9 pasos, con candado en los bloqueados. En modo claro las pastillas inactivas son tarjetas blancas con borde, y los filtros de Resultados dejan de quedar en negro.
*   **CLU-01:** el alta de un torneo de club cabe en la ventana (el título y el cierre quedan fijos si hace falta desplazar el formulario), exige elegir categoría y nivel, abre el paso 1 al crear, numera los pasos del club sin Fiscales ni Sedes y, en alcance Provincial o Regional, deja como organizadora la asociación de la provincia del club.
*   **CLU-02:** el club confirma, cobra en efectivo, cancela o marca ausencia desde la lista. La fecha arranca en hoy, las pendientes de días anteriores se señalan, y la agenda del día muestra las canchas en columnas.
*   **GEN-01:** el menú de federación muestra los 11 ítems y el usuario a 1366×768 y a 1366×641, sin barra propia. Estadísticas no está: no tiene página.
*   **GEN-02:** a 1366×641, Torneos, Inscripciones, Jugadores y el asistente usan solo el scroll de la página. La tabla de torneos ya no fuerza 1000 px y el chat ocupa el alto del panel, así la lista de conversaciones no tiene barra propia. La llave y el programador siguen aparte.
*   **GEN-09:** con el torneo en curso, el paso de jugadores no deja inscribir ni borrar. Eliminar, revocar e inhabilitar están en el menú «⋯» y piden confirmación con el nombre. Replicar abre sin categorías marcadas.
*   **PER-01:** «Mis torneos» lista las inscripciones del jugador. Mi panel muestra arriba el próximo partido con hora y cancha, y ese recuadro abre la llave. También se ven el puesto en su categoría y los últimos resultados.
*   **PER-02:** el jugador no edita DNI ni categoría. «Solicitar cambio» deja el pedido registrado y la ficha igual. La provincia sigue siendo obligatoria al registrarse y al guardar. El aviso de licencia aprobada usa la misma fecha que el carnet.
*   **GEN-03:** la interfaz web usa Manrope (adaptación digital de Unigeo), alojada en WOFF2 con `font-display: swap` y respaldo Arial. Pesos 400, 500, 600 y 700. La licencia OFL está en `apps/web/public/fonts/manrope/OFL.txt` y en `docs/licencias-terceros.md`. El isologotipo no cambia. La app mobile sigue con MuseoModerno y los PDF con Helvetica.
*   **GEN-08:** el programador separa el estado de la competencia del de los horarios. La recaudación del tablero y la de Inscripciones salen del mismo resumen, y los estados de licencia de Jugadores suman el total que también muestra el tablero. El cliente definió que el torneo pasa a En curso al publicar la programación; cargar un resultado no cambia el estado. En curso siguen habilitados los cambios de cuadro y de horario con motivo y auditoría.
*   Varios ítems que el 27/9 figuraban pendientes ya están hechos y no se rehacen: PUB-03, ASI-03, ASI-04, ASI-05, CUA-01, CUA-02, RES-01, RES-02, RAN-01, RAN-02, RAN-03.

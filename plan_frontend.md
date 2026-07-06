# Plan de Implementación y Refactorización del Frontend Web - Padel Nexus (Junio 2026)

Este documento establece las pautas y tareas específicas para adaptar la plataforma web y el panel de administración (CRM) de Padel Nexus. Se descarta cualquier desarrollo nativo móvil enfocado en carpetas "App", centralizando los esfuerzos en una experiencia web reactiva, fiel a las normativas de la FAP y alineada con el nuevo manual de marca de Junio 2026.

---

## 1. Aplicación del Manual de Uso de Marca (Assets SVG)

Se elimina de forma definitiva el antiguo símbolo de infinito. La nueva identidad visual se basa en el concepto de conexión y puente, utilizando gráficos vectoriales escalables (SVG) para evitar pixelación y garantizar el rendimiento.

### 1.1. Paleta Cromática y Tipografía (Configuración de Tailwind)

De acuerdo con el documento _Manual de uso Padelnexus.pdf_, los colores primarios e institucionales deben reflejar fielmente el espíritu corporativo. Configuraremos el archivo `tailwind.config.js` con las variables exactas:

- **CHARTREUSE (Primario):** `#CBFE01` (RGB 203-254-1) - Utilizado para destacar elementos interactivos principales, fondos de botones de conversión y estados activos.
- **FOREST MOSS (Contraste):** `#6E8901` (RGB 110-137-1) - Para textos secundarios, bordes sutiles o jerarquías tipográficas inferiores.
- **BLACK / WHITE:** `#000000` y `#FFFFFF` - Dominancia de fondo oscuro para el CRM y la interfaz de usuario.
- **TIPOGRAFÍA:** `Unigeo Semibold` como fuente primaria para títulos de secciones, encabezados y destacados institucionales.

### 1.2. Mapeo de Variantes de Isologotipo

- **`LogoGeneric.svg`:** Versión principal con texto "padel nexus" y el isotipo de la marca en disposición vertical u horizontal según contraste (sobre fondos oscuros se utiliza la versión clara/negativa). Se visualiza en la cabecera superior de la Landing Page (`W24_Landing.jpg`) y en el panel del CRM (`W_EditorLlaves.jpg`).
- **`LogoAccessory.svg`:** Icono puramente institucional ("Banderín/Puente de conexión"). **Prohibido su uso para publicidad general o textos extensos**. Se limita estrictamente a componentes con espacio reducido: Favicon del sitio web, avatares de redes sociales institucionales y el contenedor gráfico central destacado en la Landing Page (`W24_Landing.jpg`).

---

## 2. Refactorización de la Landing Page Web (`W24_Landing.jpg`)

La página de aterrizaje pública debe reflejar la consolidación de la plataforma como el ecosistema unificado del pádel.

- **Cabecera (Navbar):**
  - Izquierda: Componente SVG `LogoGeneric.svg` con la paleta tipográfica oficial.
  - Centro: Menú de navegación plano con redirecciones a `Torneos`, `Ranking`, `Reservar`, `Marketplace` y `Clubes`. El enlace activo debe iluminarse en color `brand.chartreuse`.
  - Derecha: Barra de búsqueda global y botón de acción destacado (`#CBFE01` con texto negro) con la leyenda **"Descargar app"** junto al ícono de dispositivo móvil.
- **Bloque Hero Lateral:**
  - Izquierda: Copys tipográficos limpios con interlineado adecuado: _"El ecosistema del pádel, en una sola plataforma"_. Buscador integrado con botones redondeados en Chartreuse.
  - Derecha: Tarjeta con efecto de desenfoque de fondo (_Glassmorphism_) que aloja el accesorio de logotipo destacado (`LogoAccessory.svg`) en un contenedor verde brillante, flanqueado por notificaciones dinámicas de los próximos torneos en curso (Ej: _Apertura Pilar · Sáb_).
- **Contadores del Footer:** Sincronizar de forma síncrona mediante llamadas a la API los componentes de métricas reales del circuito:
  - `+25.000` Jugadores activos
  - `1.200` Torneos por año
  - `340` Clubes adheridos
  - `2.800` Canchas disponibles

---

## 3. Desarrollo del Panel del CRM: Editor de Llaves (`W_EditorLlaves.jpg`)

Esta interfaz representa la herramienta crítica para los organizadores y árbitros de las federaciones provinciales y nacionales. Consumirá de forma directa los servicios del motor deportivo de competencias.

- **Encabezado de Torneo:**
  - Renderizar en texto de alto contraste el formato del evento: `EDITOR DE LLAVES – TORNEO APERTURA PILAR · 5ª CABALLEROS`.
  - Subtítulo explicativo que refuerza el control: _"El sistema armó zonas y siembra automáticamente. Podés ajustar manualmente sin borrar resultados."_
- **Selector de Vistas:** Tres botones conmutadores con estados dinámicos: `Fase de grupos` (activo por defecto), `Llave campeonato` (bloqueado hasta consolidar zonas) y `Auditoría` (para ver la cola de logs).
- **Renderizado de Zonas (Criterios FAP):**
  - Las zonas se organizan en un contenedor Grid de columnas dinámicas (Zona A, Zona B, Zona C, Zona D).
  - De acuerdo a las reglas oficiales del circuito FAP, el frontend debe pintar de forma prioritaria las zonas de 4 parejas al inicio de la matriz (Zonas A y B) si el remanente de inscriptos no fue divisible por 3.
  - Cada fila o slot de pareja dentro de la zona debe mostrar:
    1.  Número pequeño indicador de Siembra / Cabeza de serie (Seed 1, 2, 3, etc.).
    2.  Nombres de la pareja en formato: `APELLIDO, Inicial. / APELLIDO, Inicial.` (Ej: `GIMÉNEZ, M. / ROJAS, P.`).
    3.  Entidad o procedencia de residencia de los perfiles (Ej: `Club Pilar`, `La Horqueta`, `San Isidro`).
    4.  Casillas numéricas a la derecha para la carga directa de los resultados de games y sets de los partidos jugados.
- **Interacciones Avanzadas (Admin Override):**
  - **Control Switch:** Un interruptor de palanca destacado con la etiqueta **"Modificación no destructiva (ON/OFF)"**. Al activarse, habilita el estado de edición del cuadro.
  - **Drag and Drop:** Las tarjetas de las parejas habilitan un _Handler_ de arrastre. El administrador puede mover una pareja de un grupo a otro. El contenedor destino se iluminará con un borde punteado en Chartreuse con la leyenda `+ Soltar aquí` para validar el movimiento visualmente.
  - **Persistencia Segura:** Al presionar **"Guardar cambios"**, la interfaz abrirá un modal flotante obligando al usuario a escribir el motivo de la modificación. Tras la confirmación, se enviará la petición `PUT /api/admin/override/partidos/:partido_id` hacia el backend, actualizando los registros y refrescando la pantalla mediante mutación de estado limpia sin recargar el navegador.

---

## 4. Gestión de Formularios y Control del Checkbox de Pagos (Fase 1)

- **Ficha del Jugador (`/perfil/me`):** Los campos del formulario de actualización de datos deben expandirse para incluir de manera obligatoria la carga del `DNI` y el `Lugar de residencia`, tal como exige el nuevo formato relacional de afiliaciones transversales de la FAP.
- **Checkbox de Inscripciones (CRM):**
  - En la vista de gestión de inscriptos del torneo (`GET /api/torneos/:id/inscripciones`), cada fila expondrá un control transicional de Checkbox interactivo.
  - Si el checkbox está desmarcado (Estado: `Pendiente`), el admin puede pulsarlo para abrir un popover de cobro rápido (Ingreso de monto y selección de medio: Efectivo/Transferencia).
  - Al confirmarse, se despacha la petición `PATCH /api/pagos/confirmar-manual`. El frontend actualizará la fila visualmente a color verde con la etiqueta `Confirmado`, asegurando que la pareja quede habilitada instantáneamente en la bolsa de siembra para el motor de generación de zonas de grupos.

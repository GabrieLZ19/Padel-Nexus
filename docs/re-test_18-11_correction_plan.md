# Plan de Correcciones — Re-test 18/11 (Item por Item)

Plan estructurado exclusivamente con los puntos **NUEVOS**, **PARCIALES** y **SIGUE** del informe `Padel_Nexus_-_Re-test_18-11.pdf` (omitiendo los 35 puntos ya resueltos). Se ordena por prioridad operativa para ejecutarlos uno por uno respetando el flujo Database-First -> Backend -> Frontend.

Decisiones confirmadas para este plan:
- **FEE-8 / FEE-9**: El precio configurado en el torneo es **por jugador** (por plaza). Pagar la pareja completa cobra x2 y toda la UI/textos se unifican a "Por jugador".
- **FEE-1**: La pantalla "Cargo por servicio" se oculta para `superadmin`; cada club, asociación y federación configura su opción A/B desde su panel.

Seguimiento de commits y detalle: [qa-re-test-18-11-progreso.md](qa-re-test-18-11-progreso.md).

## Hecho (código)

- **TOR-47**, **PUB-27**, **FEE-2**, **FEE-3** (ver progreso anterior).
- **FEE-1 + RES-21**, **FEE-5**, **FEE-6**, **FEE-7**, **FEE-8**, **FEE-9** — lote fees MP/inscripciones (commits back + front de nov/2026).
- **FEE-10**, **FEE-4** — desglose checkout y menú Finanzas superadmin (`95ca06f` front; incl. back en `fcbb060`).
- **FEE-12** — sync verificado; **7 commits** pendientes de push a `origin` (detalle: [fee-12-sync-github.md](fee-12-sync-github.md)).
- **TOR-22 + TOR-28** — alta en pase directo FAP (`fcbb060` + `95ca06f`; QA torneo real pendiente).

**Hecho en sesión**: TOR-50 (prevalidación + rollback llave); TOR-24/48 back (conflictos horario llave vs zona + desprogramación al guardar zonas).

**Hecho TOR-46**: número visible en errores de lado W* (`edicionLlaveFap`, test `tor46NumerosVisiblesAvisos`).

**Hecho TOR-36**: CRM llave con `Gan. #N` en huecos pendientes (`MatchCard`, `BracketEditor`).

**Siguiente ítem sugerido**: ops **FEE-3** (credenciales MP prod), **FEE-12** (push git), deploys y QA manual. Bloque 6 limpieza Supabase ejecutado — ver [qa-re-test-18-11-limpieza-supabase.md](qa-re-test-18-11-limpieza-supabase.md).

---

## Bloque 1 — Bloqueantes para el torneo del 28 y 29/11

### 1. TOR-47 — Puntos acreditados no coinciden con la tabla "Puntos por instancia" (ALTA · BLOQUEANTE 28/11)
- **Problema**: Cada pareja suma el valor de la instancia anterior a la que alcanzó y las parejas con pase directo pierden los puntos de la ronda que no jugaron (ej. campeón con pase directo suma 910 en lugar de 1000; cuartos con pase directo suma 0 en lugar de 180).
- **Archivos**:
  - [apps/api/src/utils/otorgarPuntosPartidoTorneo.ts](apps/api/src/utils/otorgarPuntosPartidoTorneo.ts)
  - [apps/api/src/utils/recalcularPuntosTorneoFinalizado.ts](apps/api/src/utils/recalcularPuntosTorneoFinalizado.ts)
  - [apps/api/src/utils/historialRankingRonda.ts](apps/api/src/utils/historialRankingRonda.ts)
  - [apps/api/src/utils/rankingTorneo.ts](apps/api/src/utils/rankingTorneo.ts)
- **Acción**: Acreditar exactamente el valor de la instancia alcanzada según la tabla del torneo (campeón 1000, finalista 600, semis 360, cuartos 180, octavos 90, etc.), asegurando que las parejas con pase directo reciban el total de su instancia alcanzada sin perder puntos de rondas no jugadas. Agregar tests unitarios cubriendo ganador con bye, perdedor en cuartos con bye y sin bye, y recálculo de torneo finalizado.

### 2. PUB-27 — Ranking provincial de Neuquén sale vacío y puesto del panel no coincide (ALTA · BLOQUEANTE 28/11)
- **Problema**: `GET /rankings?scope=Provincial&provincia=Neuquén` filtra por `lugar_residencia` y los jugadores tienen la sigla `"APN"`, devolviendo lista vacía; en Buenos Aires aparecen jugadores de otras provincias; en Mi Panel figura `"40.º"` que no coincide con `/ranking`.
- **Archivos**:
  - [apps/api/src/utils/provinciaRanking.ts](apps/api/src/utils/provinciaRanking.ts)
  - [apps/api/src/services/ranking.service.ts](apps/api/src/services/ranking.service.ts)
  - [apps/api/src/controllers/ranking.controller.ts](apps/api/src/controllers/ranking.controller.ts)
- **Acción**: Resolver la provincia del jugador usando la provincia de su asociación (traduciendo siglas como `APN` -> `Neuquén`) o la provincia de su club, con fallback controlado, en lugar de texto crudo de `lugar_residencia`. Calcular la posición mostrada en Mi Panel a partir de la misma consulta/tabla que `/ranking`.

### 3. FEE-3 — Credenciales de prueba de Mercado Pago en producción (ALTA · OPERATIVO ANTES DEL 28/11)
- **Problema**: `play.padelnexus.app` genera preferencias con la cuenta de prueba `3847361049` en lugar de las credenciales productivas de Padel Nexus SAS (`1897024318`).
- **Acción**: Cambio de variables de entorno en Render/Vercel (y verificación del secret del webhook `x-signature`) antes del 28/11; validar generación de preferencia productiva.

---

## Bloque 2 — Fees y Mercado Pago (Seguridad, Permisos y Funcionalidad)

### 4. FEE-2 — Licencia queda pagada con `payment_id` inventado + limpieza de datos (ALTA)
- **Problema**: `POST /licencias/:id/confirmar-retorno` marca `estado_pago: "pagado"` y genera movimiento `mp_online` + liquidación falsa con cualquier `payment_id`.
- **Archivos**:
  - [apps/api/src/routes/licencia.routes.ts](apps/api/src/routes/licencia.routes.ts)
  - [apps/api/src/controllers/licencia.controller.ts](apps/api/src/controllers/licencia.controller.ts)
  - [apps/api/src/services/licencia.service.ts](apps/api/src/services/licencia.service.ts)
  - [apps/api/src/utils/licenciaPago.ts](apps/api/src/utils/licenciaPago.ts)
- **Acción**: Consultar el pago real en la API de Mercado Pago (igual que reservas e inscripciones), verificando que exista, esté `approved`, el monto coincida y `external_reference` corresponda a la licencia antes de marcarla pagada o registrar el fee.

### 5. FEE-1 + RES-21 + PED-2b — Nadie puede guardar "Absorber fee / Sumar al precio" (ALTA)
- **Problema**: `GET/PUT /platform-fees/preferencias-org` devuelve 400 `"No se pudo resolver la organización del usuario"` para federación/asociación, 403 para `admin_club`, y el panel `/club` no tiene pantalla ni ruta `/club/cargos-servicio`.
- **Archivos**:
  - [apps/api/src/routes/platformFee.routes.ts](apps/api/src/routes/platformFee.routes.ts)
  - [apps/api/src/controllers/platformFee.controller.ts](apps/api/src/controllers/platformFee.controller.ts)
  - [apps/api/src/services/platformFee.service.ts](apps/api/src/services/platformFee.service.ts)
  - [apps/web/app/dashboard/cargos-servicio/page.tsx](apps/web/app/dashboard/cargos-servicio/page.tsx)
  - [apps/web/app/club/layout.tsx](apps/web/app/club/layout.tsx) y nueva vista `/club/cargos-servicio/page.tsx`
  - [apps/web/utils/constants/menuPermissions.ts](apps/web/utils/constants/menuPermissions.ts)
  - [apps/web/utils/services/platformFees.ts](apps/web/utils/services/platformFees.ts)
- **Acción**:
  - Permitir el rol de club (`admin_club` / dueño de club) en `preferencias-org` y resolver correctamente la organización (club, asociación o federación) desde el usuario autenticado en el backend.
  - Exponer la pantalla "Cargo por servicio" dentro de `/club/cargos-servicio` (y en el menú lateral del club) con interruptores por canal (reservas, marketplace, inscripciones).
  - Ocultar "Cargo por servicio" para `superadmin` en menú y permisos.

### 6. FEE-5 — Permisos de saldos de torneo, reporte mensual y liquidaciones (MEDIA)
- **Problema**: Otros clubes/asociaciones pueden ver y generar link de pago del saldo de torneos ajenos; `admin_federacion` ve reporte mensual global de Padel Nexus y puede marcar transferidas liquidaciones ajenas.
- **Archivos**:
  - [apps/api/src/routes/platformFee.routes.ts](apps/api/src/routes/platformFee.routes.ts)
  - [apps/api/src/services/platformFee.service.ts](apps/api/src/services/platformFee.service.ts)
  - [apps/web/utils/constants/menuPermissions.ts](apps/web/utils/constants/menuPermissions.ts)
- **Acción**:
  - Validar ownership del torneo en `/platform-fees/torneos/:id/saldo` y `/saldo/preferencia-mp` (solo el organizador dueño o `superadmin`).
  - Restringir `/reporte-mensual` y `marcar transferida` de `/liquidaciones*` exclusivamente a `superadmin` (si una entidad consulta liquidaciones, filtrar solo las propias en modo solo lectura o restringir a `superadmin`).

### 7. FEE-6 — Cancelar o rechazar una inscripción no anula su fee (MEDIA)
- **Problema**: Cancelar inscripciones deja vivos los movimientos de fee en el saldo del torneo y en el reporte mensual.
- **Archivos**:
  - [apps/api/src/services/inscripcion.service.ts](apps/api/src/services/inscripcion.service.ts)
  - [apps/api/src/services/platformFee.service.ts](apps/api/src/services/platformFee.service.ts)
- **Acción**: Al cancelar o rechazar una inscripción, anular su(s) movimiento(s) de fee si aún no fueron pagados; si ya estaban pagados, generar/marcar crédito a favor del organizador y excluir los anulados del saldo y reporte.

### 8. FEE-7 — Inscripciones en torneos gratuitos no generan fee (MEDIA)
- **Problema**: En torneos marcados como gratuitos, las inscripciones manuales y por planilla dejan el saldo de fees en 0 movimientos.
- **Archivos**:
  - [apps/api/src/services/inscripcion.service.ts](apps/api/src/services/inscripcion.service.ts)
  - [apps/api/src/services/platformFee.service.ts](apps/api/src/services/platformFee.service.ts)
- **Acción**: Generar el movimiento de fee fijo por inscripción/plaza cuando el canal `inscripciones` esté activo con valor > 0, independientemente de que el torneo figure como gratuito.

### 9. FEE-8 — Unificar criterio "Por jugador" en ficha, formulario, cobro y fee (MEDIA)
- **Problema**: La ficha pública dice `"Por pareja"`, pero la carga manual, planilla y checkout MP cobran por plaza (duplicando el monto).
- **Archivos**:
  - [apps/api/src/utils/inscripcionMonto.ts](apps/api/src/utils/inscripcionMonto.ts)
  - [apps/api/src/services/inscripcion.service.ts](apps/api/src/services/inscripcion.service.ts)
  - Ficha pública del torneo, wizard de creación/edición de torneo e inscripción manual en `apps/web/`.
- **Acción**: Adoptar **Por jugador** como criterio único en todo el sistema: actualizar etiquetas en ficha pública, wizard del organizador, planilla y confirmación de pago para que siempre indiquen `"Por jugador"` (y mostrar claramente el total por pareja = 2 plazas cuando corresponda).

### 10. FEE-9 — Permitir pagar solo la plaza propia o las dos en pago online (MEDIA)
- **Problema**: La preferencia de Mercado Pago de inscripciones siempre arma un pago por las 2 plazas juntas.
- **Archivos**:
  - [apps/api/src/services/inscripcion.service.ts](apps/api/src/services/inscripcion.service.ts)
  - [apps/api/src/controllers/inscripcion.controller.ts](apps/api/src/controllers/inscripcion.controller.ts)
  - [apps/api/src/services/platformFeeWebhook.service.ts](apps/api/src/services/platformFeeWebhook.service.ts)
  - Modal/checkout de pago de inscripción en `apps/web/` y [apps/web/utils/services/inscripciones.ts](apps/web/utils/services/inscripciones.ts) (o servicio equivalente).
- **Acción**: Permitir elegir `"Pagar mi plaza"` (1 plaza = precio por jugador) o `"Pagar las dos"` (2 plazas = x2). Registrar el pago por plaza individualmente en BD y confirmar la pareja cuando ambas plazas estén pagadas (evitando doble cobro si una plaza ya está paga).

### 11. FEE-10 — Mostrar desglose de cargo por servicio (Opción B) en checkout y comprobante (MEDIA) — **HECHO en código**
- **Problema**: Con Opción B (`sumar_al_precio`), el cargo no se ve en el resumen de reservas ni marketplace, en inscripciones solo aparece en un toast breve, y la preferencia de licencias no devuelve `cargo_servicio` ni `modo_fee`.
- **Archivos**:
  - [apps/api/src/services/licencia.service.ts](apps/api/src/services/licencia.service.ts) (y servicios de reservas, marketplace, inscripciones)
  - Checkouts y pantallas de confirmación/comprobante de los 4 canales en `apps/web/`.
- **Acción**: Devolver `cargo_servicio` y `modo_fee` en los 4 endpoints de preferencia/preview (incluyendo licencias) y mostrar `"Precio $X · Cargo por servicio $Y · Total $Z"` en el resumen previo a MP y en el comprobante cuando `modo_fee === 'sumar_al_precio'` y `cargo_servicio > 0`.

### 12. FEE-4 — Menú lateral de `superadmin` sin Fees, Finanzas ni Liquidaciones (MEDIA) — **HECHO en código**
- **Problema**: Las rutas `/dashboard/platform-fees`, `/dashboard/finanzas` y `/dashboard/liquidaciones` existen pero no aparecen en ningún grupo del sidebar de `superadmin`.
- **Archivos**:
  - [apps/web/app/dashboard/layout.tsx](apps/web/app/dashboard/layout.tsx)
  - [apps/web/utils/constants/menuPermissions.ts](apps/web/utils/constants/menuPermissions.ts)
- **Acción**: Agregar un grupo `"Finanzas"` en el sidebar con `Fees plataforma`, `Finanzas` y `Liquidaciones` visible para `superadmin` (y verificar que `Cargos servicio` no aparezca para `superadmin`).

### 13. FEE-12 — Sincronizar commits con GitHub (MEDIA · GIT) — **VERIFICADO · push al cierre del plan**
- **Problema (informe)**: Remoto desactualizado vs local (`5e0ddf9` vs lote 17/11).
- **Estado 22/11**: `origin/main` = `bea3c00`; local = `17d82ca` (+7 commits listos). `whapy/main` = `5e0ddf9` (pendiente push equipo).
- **Acción restante**: Al terminar el plan → `git push origin main` y si aplica `git push whapy main`. Detalle: [fee-12-sync-github.md](fee-12-sync-github.md).

---

## Bloque 3 — Torneos, Llaves, Zonas y Planillas

### 14. TOR-22 + TOR-28 — Agregar pareja nueva en pase directo de llave — **HECHO en código (pendiente QA en torneo real)**
- **Problema**: Al agregar una pareja nueva en un pase directo (ej. `1º A`), la pareja nueva pisa/reemplaza al clasificado `1º A` en el cuarto #19 en lugar de crear el octavo `"1º A vs pareja nueva"` cuyo ganador pase al cuarto.
- **Archivos**:
  - [apps/api/src/utils/edicionLlaveFap.ts](apps/api/src/utils/edicionLlaveFap.ts)
  - [apps/api/src/services/torneo.service.ts](apps/api/src/services/torneo.service.ts)
  - Modal de edición de partido de llave en `apps/web/`.
- **Acción**: Implementar la creación real del partido de ronda previa (ej. octavo `"1º A vs Pareja Nueva"`) manteniendo protegido el lado del ganador de partido previo (`Gan. #16`), y enlazar su ganador al cuarto correspondiente.

### 15. TOR-50 — Rollback/validación previa si falla el alta de pareja en la llave (MEDIA)
- **Problema**: Al fallar la asignación en llave con 409 (ej. lado reservado), la inscripción ya se había creado y queda huérfana, bloqueando reintentos por jugador ya inscripto.
- **Archivos**:
  - [apps/api/src/services/torneo.service.ts](apps/api/src/services/torneo.service.ts) / [apps/api/src/utils/edicionLlaveFap.ts](apps/api/src/utils/edicionLlaveFap.ts)
  - Flujo de `"Alta por DNI"` desde el modal de llave en `apps/web/`.
- **Acción**: Validar la elegibilidad/disponibilidad del slot de llave antes de crear la inscripción (y si la asignación falla tras crearla, hacer rollback eliminando la inscripción creada).

### 16. TOR-24 + TOR-48 — Recalcular cupos de llave y horarios al mover pareja entre zonas (PARCIAL / MEDIA)
- **Problema**: Al mover una pareja entre zonas (ej. Zona B queda con 2 y Zona E con 4), la llave sigue pidiendo `"2º B"` sin sumar `"3º E"`, y el partido de zona nuevo queda programado el domingo después de los cruces de llave que dependen de él sin alerta bloqueante.
- **Archivos**:
  - [apps/api/src/utils/gruposTorneo.ts](apps/api/src/utils/gruposTorneo.ts)
  - [apps/api/src/services/programacion.service.ts](apps/api/src/services/programacion.service.ts)
  - [apps/api/src/utils/programacionPartidos.ts](apps/api/src/utils/programacionPartidos.ts)
  - [apps/api/src/services/torneo.service.ts](apps/api/src/services/torneo.service.ts)
- **Acción**:
  - Al guardar cambios de zonas, recalcular los slots clasificatorios de la llave según el nuevo tamaño de cada zona.
  - Reubicar el partido de zona nuevo antes de los cruces de llave (o dejarlo sin asignar) y detectar como conflicto bloqueante (impidiendo `"Publicar"`) cualquier cruce de llave programado antes de que termine alguna zona que lo alimenta.

### 17. TOR-46 — Aviso con número interno de matriz en edición de llave (PARCIAL)
- **Problema**: El error dice `"El lado B está reservado para el ganador del partido de matriz #50"` en lugar del número visible en pantalla (`#16`).
- **Archivos**:
  - [apps/api/src/utils/edicionLlaveFap.ts](apps/api/src/utils/edicionLlaveFap.ts)
- **Acción**: Formatear el mensaje usando el número de partido visible de la llave (`numero_orden` / numeración mostrada en pantalla) en lugar del número interno de matriz.

### 18. TOR-36 — Rival pendiente figura "Libre" / "Por definir" en CRM del club (PARCIAL)
- **Problema**: En el CRM del club (`Cuadros -> Llave`), la semifinal #5 dice `"Libre"` y la #6 `"Por definir"`, mientras que la vista pública ya muestra `"Gan. #2"`, `"Gan. #3 vs Gan. #4"`.
- **Archivos**:
  - Componente de visualización de llave en `apps/web/components/torneos/` (CRM club).
- **Acción**: Reutilizar la misma lógica de etiqueta de rival pendiente (`Gan. #X`) de la vista pública en la vista de llave del CRM.

### 19. TOR-49 — Falso positivo "Revisar horarios publicados" al cargar resultados (BAJA) — HECHO
- **Problema**: Al cargar o corregir cualquier resultado de llave con programación publicada, salta `"Revisar horarios publicados"` por partidos sin conflicto real (incluso ya jugados).
- **Archivos**:
  - [apps/api/src/services/programacion.service.ts](apps/api/src/services/programacion.service.ts) / [apps/api/src/utils/programacionPartidos.ts](apps/api/src/utils/programacionPartidos.ts)
  - [apps/web/components/torneos/wizard/Paso9Arbitraje.tsx](apps/web/components/torneos/wizard/Paso9Arbitraje.tsx)
- **Acción**: Evaluar conflictos reales excluyendo partidos ya finalizados y verificando correctamente los tiempos de fin de zona vs inicio de llave para alertar únicamente cuando exista un conflicto genuino.

### 20. CLI-1 — Importación de planillas: localidad vs provincia (PARCIAL) — HECHO
- **Problema**: Cuando la planilla trae solo localidad, se guarda la localidad en el campo provincia y no se guarda la localidad en `lugar_residencia`.
- **Archivos**:
  - [apps/api/src/utils/inscripcionPlanilla.ts](apps/api/src/utils/inscripcionPlanilla.ts)
  - [apps/api/src/utils/fapPlantillaTorneo.ts](apps/api/src/utils/fapPlantillaTorneo.ts)
- **Acción**: Inferir la provincia a partir de la localidad si es reconocible o dejar provincia vacía con advertencia (sin copiar la localidad como provincia), y persistir la localidad en `lugar_residencia`.

---

## Bloque 4 — Marketplace

### 21. MKT-1 — Vencimiento de órdenes sin pago e ingresos del listado (MEDIA) — HECHO
- **Problema**: Órdenes sin pagar quedan `"pendiente"` indefinidamente y se suman en `"INGRESOS DEL LISTADO"`.
- **Archivos**:
  - [apps/api/src/services/marketplace.service.ts](apps/api/src/services/marketplace.service.ts)
  - Vista de Ventas del marketplace en `apps/web/`.
- **Acción**: Expirar automáticamente órdenes pendientes sin pago tras un plazo configurable (similar a reservas, marcándolas vencidas/sin pago) y sumar en ingresos únicamente órdenes pagadas/cobradas.

### 22. MKT-2 — Unificar conteo de ventas cobradas en tienda, producto y CRM (BAJA) — HECHO
- **Problema**: La tienda pública muestra `"VENTAS 1"` mientras producto y CRM muestran `0` cuando no hay ventas cobradas.
- **Archivos**:
  - [apps/api/src/services/marketplace.service.ts](apps/api/src/services/marketplace.service.ts)
- **Acción**: Calcular el contador de ventas en los tres endpoints/vistas usando exclusivamente órdenes cobradas (`pagado` / `completado`).

### 23. MKT-3 — Limpiar pantalla "Cobros" de la tienda (BAJA)
- **Problema**: Muestra texto interno (`"El split nativo de MP queda para una fase posterior"`) y pide `"COLLECTOR / CUENTA MP"`, incompatible con el modelo de cobro centralizado y liquidación por CBU/alias.
- **Archivos**:
  - [apps/web/components/marketplace/MarketplaceCobrosTab.tsx](apps/web/components/marketplace/MarketplaceCobrosTab.tsx)
- **Acción**: Quitar el texto interno y el campo de cuenta MP; dejar únicamente datos bancarios (titular, banco, CBU, alias) con explicación clara de que Padel Nexus liquida el neto (cobrado menos fee y comisión MP).

### 24. MKT-4 — Tarjetas de productos cortan el nombre en desktop (BAJA)
- **Problema**: En `/marketplace` a 1366px las tarjetas son angostas y truncan el título en una línea.
- **Archivos**:
  - Componente de grilla/tarjeta de catálogo de `/marketplace` en `apps/web/`.
- **Acción**: Permitir 2 líneas (`line-clamp-2`) en el nombre del producto y ajustar el ancho/columnas de la grilla para aprovechar el espacio disponible.

---

## Bloque 5 — Sitio Público, Dominios, Seguridad y Comunicaciones

### 25. DOM-5 — Botón "Ingresar" en `www.padelnexus.app` (MEDIA)
- **Problema**: La landing estática en `www.padelnexus.app` no tiene ningún enlace para ingresar a `https://play.padelnexus.app`.
- **Archivos**:
  - [apps/padelnexus-web/index.html](apps/padelnexus-web/index.html)
- **Acción**: Agregar botón `"Ingresar"` en el header y en el hero apuntando a `https://play.padelnexus.app` (y acceso secundario a `"Ver torneos"` -> `https://play.padelnexus.app/torneos`).

### 26. DOM-6 — Encabezados de seguridad HTTP en `play.padelnexus.app` (MEDIA)
- **Problema**: `play.padelnexus.app` carece de `X-Frame-Options`, `X-Content-Type-Options` y `Referrer-Policy`.
- **Archivos**:
  - [apps/web/next.config.ts](apps/web/next.config.ts)
- **Acción**: Configurar `headers()` en Next.js con `X-Frame-Options: DENY` (y `Content-Security-Policy: frame-ancestors 'none'`), `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`.

### 27. PUB-26 + PUB-21 — Canonicals por ruta, título `/privacidad-menores` y `og:image` PNG/JPG (MEDIA / BAJA)
- **Problema**: `/torneos`, `/ranking`, `/reservar`, `/marketplace`, `/partidos`, `/login`, `/signup`, `/torneos/[id]` y `/privacidad-menores` tienen canonical a la portada; `/privacidad-menores` usa título genérico `"Padel Nexus"`; `og:image` usa `.svg` que no previsualiza en WhatsApp/redes.
- **Archivos**:
  - [apps/web/utils/siteMetadata.ts](apps/web/utils/siteMetadata.ts)
  - [apps/web/app/(public)/privacidad-menores/page.tsx](apps/web/app/(public)/privacidad-menores/page.tsx)
  - Metadata de páginas públicas (`/torneos`, `/torneos/[id]`, `/ranking`, `/reservar`, `/marketplace`, `/partidos`, `/login`, `/signup`)
  - Asset estático `apps/web/public/brand/og-image.png` (1200x630).
- **Acción**: Definir `alternates.canonical` propio en cada ruta (eliminando canonical fijo a portada en layout raíz si hereda mal), fijar título `"Privacidad de menores · Padel Nexus"` en `/privacidad-menores`, y generar/referenciar un PNG 1200x630 en `og:image` y `twitter:image`.

### 28. ENT-33 — Comunicaciones: placeholder y dominios propios (BAJA)
- **Problema**: El placeholder sugiere `https://padelnexus.netlify.app/ranking` y solo se reconocen como propios `netlify.app` y `play.padelnexus.app`, tratando `www` y `app` como externos.
- **Archivos**:
  - [apps/web/components/comunicaciones/ComunicacionesPanel.tsx](apps/web/components/comunicaciones/ComunicacionesPanel.tsx)
  - [apps/api/src/services/comunicaciones.service.ts](apps/api/src/services/comunicaciones.service.ts)
- **Acción**: Cambiar el placeholder a `"/ranking o https://play.padelnexus.app/ranking"` y reconocer como propios `padelnexus.app`, `www.padelnexus.app`, `app.padelnexus.app` y `play.padelnexus.app`.

---

## Bloque 6 — Operativos / Limpieza QA

### 29. Limpieza de datos QA del Re-test 18/11 + PUB-20 (Netlify viejo)
- **Limpieza en Supabase (proyecto `tsmgxvygmdskhyhnjqvv`)**:
  - Volver licencia `PAD-BMZ7RD` (`qa.padel2`) a pago pendiente, borrar movimiento `e0a666a4-9b52-49e4-ad34-14563c71c36f` y la liquidación falsa de Asociación Riojana (`FEE-2`).
  - Borrar los 6 movimientos de fee de `"QA Prueba – Club Elim 5ª"` (`FEE-6`).
  - Borrar torneos `"QA Prueba – Club 18-11"` (`e0227317-fd58-48da-bdd8-125b0486ee72`), `"QA Prueba – Zonas 18-11"` (`63149867-0451-4ee9-94f7-f9a974f3d5e4`), `"QA Prueba – Planilla 18-11"` (`dcac48e7-b9b0-4ed1-8551-2853f01f60a0`), sede `"QA Prueba – Sede 18-11"` (`fb9efe7b-abdf-4fad-9055-657cab7553a7`), órdenes QA pendientes del marketplace (`5c2c8fc7`, `77ef285a-...`) y puntos de prueba tras validar `TOR-47`.
- **PUB-20 (Externo en Netlify)**: Si aún existe acceso al proyecto `padelnexus.netlify.app`, subir `_redirects` con `/* https://play.padelnexus.app/:splat 301`.
- **Nota FEE-11**: En el PDF solo figura el título `"Detalles de Finanzas y Liquidaciones (MEJORA · BAJA)"` sin detalle; queda a confirmar con Dylan si aplica algún ajuste menor.

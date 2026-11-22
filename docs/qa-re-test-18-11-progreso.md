# Re-test 18/11 — Progreso de corrección (Fees / MP)

Seguimiento alineado con [re-test_18-11_correction_plan.md](re-test_18-11_correction_plan.md).

## Lote Fees — FEE-1 a FEE-9 — COMPLETADO en código

Commits: `eb20d70` (back), `65783cb` (front).

Tickets: FEE-1, RES-21, FEE-5, FEE-6, FEE-7, FEE-8, FEE-9.

### FEE-1 + RES-21 — Preferencias cargo por servicio (org por rol)

- `apps/api/src/utils/platformFeeOrgUsuario.ts`: `resolverOrgFeeDesdeUsuario`
- GET `/platform-fees/preferencias-org` incluye `admin_club`
- `apps/web/components/platformFees/CargosServicioPanel.tsx`, ruta `/club/cargos-servicio`, menú club
- `admin_club` sin `/dashboard/cargos-servicio`; `superadmin` sin pantalla de cargos de org
- Tests: `fee1PreferenciasOrg.test.ts`, `fee1CargosServicioClub.test.ts`

### FEE-5 — Permisos saldos / finanzas

- Saldo torneo: solo organizador dueño o `superadmin` (`usuarioPuedeSaldoTorneo`)
- Reporte mensual y liquidaciones: solo `superadmin` en rutas API
- Menú: `admin_federacion` sin finanzas/liquidaciones
- Tests: `fee5PermisosFinanzas.test.ts`, `fee5MenuFinanzas.test.ts`

### FEE-6 — Anular fees al cancelar/rechazar inscripción

- Migración `20261122130000_fee6_movimientos_anulado.sql` (estado `anulado`, aplicada en Supabase)
- `PlatformFeeService.anularFeesPorInscripcion`; hooks en cancelar y rechazo
- Reporte mensual excluye `anulado`; crédito si fee ya estaba cobrado/liquidado
- Tests: `fee6AnulaFeeInscripcion.test.ts`

### FEE-7 — Fee en torneos gratuitos

- `calcularMontoFee`: fee fijo con `montoBruto === 0`
- Manual/planilla/pago manual registran fee sin exigir monto > 0
- Tests: `fee7TorneoGratisFee.test.ts`, actualización `platformFees.test.ts` e integración

### FEE-8 — Unificar "Por jugador"

- `apps/web/utils/inscripcionMonto.ts` (+ API `inscripcionMonto.ts` alineado)
- Ficha pública, wizard, modales manual/confirmar, acciones de pago
- Tests: `fee8PorJugador.test.ts`

### FEE-9 — Pagar 1 plaza o las dos (MP)

- Migración `20261122140000_fee9_inscripcion_plazas_pago.sql` (aplicada en Supabase)
- `inscripcionPlazaPago.service.ts`, `external_reference` con plazas, webhook por plaza
- `crearPreferenciaPago` con `alcance: "mi_plaza" | "todas_pendientes"`
- Front: `InscripcionPagoActions` + servicios `obtenerPlazasPago` / `crearPreferenciaMp(id, alcance)`
- Tests: `fee9PagoPlazasInscripcion.test.ts`

**Pendiente QA manual FEE-9:** pago parcial de pareja, checkout de 2 plazas, webhook/retorno, fees solo por plazas cobradas, inscripciones legacy sin filas (backfill al pagar).

### FEE-10 — Desglose cargo por servicio (Opción B) — HECHO

Commits: `fcbb060` (back), `95ca06f` (front).

- `cargo_servicio` + `modo_fee` en preferencias MP (reservas, marketplace, licencias, inscripciones); previews `preview-checkout-mp`
- UI `CheckoutFeeDesglose` en los 4 canales; comprobante reserva/marketplace
- Tests: `fee10CamposCheckout.test.ts`, `fee10CheckoutFeeDesglose.test.ts`

### FEE-4 — Menú Finanzas superadmin — HECHO

Commit: `95ca06f`.

- Grupo sidebar superadmin "Finanzas" (`GRUPOS_MENU_SUPERADMIN`: platform-fees, finanzas, liquidaciones)
- Test: `fee4MenuSuperadminFinanzas.test.ts`

### FEE-12 — Sync GitHub (verificado; push al cierre del plan)

- **Verificado 22/11:** `main` en `17d82ca`, `origin/main` en `bea3c00` (**7 commits** por delante, sin push).
- **Remoto equipo `whapy`:** `whapy/main` aún en `5e0ddf9` (muy detrás; push planificado al cierre, sin force).
- WIP FEE-10/4/TOR-22 commiteado (`fcbb060`, `95ca06f`).
- Guía: [fee-12-sync-github.md](fee-12-sync-github.md).

### TOR-22 + TOR-28 — Alta de pareja en pase directo (materialización)

- `fapByeMaterializacion`: `corregirAltaEnPaseDirecto`, `inferirSemillaPaseDirectoEnSpec`
- `fapVinculoPartidos.resolverMatchNoFap`: spec FAP aunque `orden` DB no sea matchNo
- `torneo.service.actualizarEquiposPartido`: remapea alta al hueco W*, materializa partido de entrada
- Front: `fapPaseDirectoLlave`, inferencia de semilla al editar, bloqueo alta en lado del clasificado
- Tests: `tor22ByeMaterializacion`, `fapVinculoPartidos`, `tor28EdicionLlaveFap`

Commits: `fcbb060` (back), `95ca06f` (front). Pendiente QA manual en torneo real.

### TOR-50 — Rollback / prevalidación alta en llave — HECHO (código)

- Prevalidación FAP (`prevalidarAltaEnSlotLlaveFap`) **antes** de `ejecutarAltaDesdePayload` en `actualizarEquiposPartido`
- Rollback: `InscripcionService.revertirInscripcionAltaLlave` (sin `assertPasoJugadoresEditable`) + fichas provisionales
- Tests: `tor50RollbackAltaLlave.test.ts` (incl. bye OK vs lado W* inválido, rollback sin `cancelarInscripcion`)

### TOR-24 + TOR-48 — Zonas y horarios vs llave — HECHO (código back)

- TOR-24 (ya en repo): `fapZoneSeeds`, `sincronizarLlaveTrasCambioZonas`, regeneración selectiva en `guardarZonas`
- TOR-48: `programacionZonaLlave.ts` — conflicto llave antes de fin de zona alimentadora; `evaluateProgramacionIssues` + `matrixFap`; al guardar zonas, `aplicarDesprogramacionZonaTrasCambioTorneo` quita horario de partidos de zona regenerada en conflicto
- Tests: `tor48LlaveZonaHorarios.test.ts`, `tor24GuardarZonas.test.ts` (hook desprogramación)

### TOR-46 — Número visible en error lado W* — HECHO

- `crearResolverNumeroVisibleLlave` (`numerosVisiblesPartido.ts`)
- Mensajes en `edicionLlaveFap.ts` (`partido #N`, sin "matriz #matchNo")
- `actualizarEquiposPartido` resuelve numeración del torneo antes de validar
- Test ampliado: `tor46NumerosVisiblesAvisos.test.ts`

### TOR-36 — Gan. #X en llave CRM — HECHO

- `MatchCard`: hueco vacío muestra `Gan. #N` / `1º A` como en vista pública (sin forzar "Por definir" cuando hay origen).
- `BracketEditor`: `matchNoFapDePartidoId` + `matrizFapDePartido`; eliminatoria usa `origenesAlimentadoresEliminatoria`.
- Tests: `tor36EtiquetasLlave.test.ts`, `numeracionLlaveP4.test.ts`.

### TOR-49 — Falsos positivos "Revisar horarios publicados" — HECHO (código)

- `partidoYaFinalizado` + `zonaClasificacionCerrada` en `programacionZonaLlave.ts`
- Avisos al cargar resultado: no revalidan partidos finalizados ni feeders ya jugados (`partidoViolaFeederODescansoPublicado`, `seleccionarPartidosLlaveParaAutoprogramar`)
- `detectarLlaveAntesFinZonaAlimentadora` / `evaluateProgramacionIssues` ignoran zonas cerradas y partidos finalizados
- Tests: `tor49ProgramacionPublicada.test.ts`

### CLI-1 — Planilla: localidad vs provincia — HECHO (código)

- `parseLocalidadProvinciaCelda`: token único = provincia canónica, localidad inferida o solo localidad (no confundir)
- `resolverLugarResidenciaDesdePlanilla` + `PerfilService` persisten localidad en `lugar_residencia`
- `inferirProvinciaDesdeLocalidad` (`localidadProvinciaArgentina.ts`); `advertenciasResidencia` en import API
- Front: parse alineado + toast `sileo.warning` en Paso 4 e inscripciones dashboard
- Tests ampliados: `cli1PlanillaOficial.test.ts`

### MKT-1 — Órdenes sin pago e ingresos del listado — HECHO (código)

- Migración `retiene_hasta` en `marketplace_ordenes` (aplicada Supabase)
- `expirarOrdenesPendientesVencidas`: cancela pendientes, restaura stock, notifica comprador
- Plazo 15 min (`MARKETPLACE_ORDEN_PENDIENTE_MINUTOS`); MP `expiration_date_to`
- `MarketplaceVentasTab`: ingresos del listado solo órdenes `pagada`/`entregada`
- Tests: `mkt1OrdenPendienteExpirada.test.ts`

### MKT-2 — Conteo ventas cobradas unificado — HECHO (código)

- `marketplaceVentasCobradas.ts`: órdenes `pagada`/`entregada`; sync `total_ventas` al confirmar pago
- Tienda pública, CRM (`obtenerTiendaEntidad`, stats), producto (`ventas_cobradas` + vendedor alineado)
- CRM `MarketplaceVentasTab`: ventas totales sin fallback a líneas pendientes
- Tests: `mkt2VentasCobradas.test.ts`

### MKT-3 — Pantalla Cobros de tienda (sin MP collector) — HECHO (código)

- `MarketplaceCobrosTab`: solo datos bancarios (titular, banco, CBU, alias); sin collector ni notas internas
- Copy alineado a cobro centralizado Padel Nexus + liquidación neta por transferencia
- Validación: al menos CBU o alias al guardar

### MKT-4 — Tarjetas catálogo `/marketplace` — HECHO (código)

- Grilla alineada a tienda: `sm:2` / `lg:3` / `xl:4` (sin 5 columnas desde `md`)
- Título del producto: `line-clamp-2` + altura mínima para alinear filas
- Skeleton de carga y `sizes` de imagen ajustados

### DOM-5 — Botón Ingresar en www — HECHO (código)

- `apps/padelnexus-web/index.html`: **Ingresar** en nav (`https://play.padelnexus.app`) y hero primario
- Hero secundario **Ver torneos** → `https://play.padelnexus.app/torneos`; **Explorá** conservado como outline
- Estilos `nav-ingress`, `nav-contact`, `button.outline` en `styles.css`

### DOM-6 — Security headers en play — HECHO (código)

- `apps/web/next.config.ts`: `headers()` global con `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

**Pendiente:** verificar cabeceras en deploy (`curl -I https://play.padelnexus.app`).

### PUB-26 + PUB-21 — Canonicals, OG PNG, privacidad menores — HECHO (código)

- `siteMetadata`: `og-image.png` 1200x630; sin `canonical` fijo en `rootMetadata`
- `path` canónico en home, torneos, ranking, reservar, marketplace, partidos, login, signup
- `privacidad-menores/layout.tsx`: título «Privacidad de menores»
- `torneos/[id]/layout.tsx`: `generateMetadata` + canonical dinámico
- Asset `public/brand/og-image.png`; tests `pub26CanonicalOg.test.ts`, `pub21` actualizado

### ENT-33 — Comunicaciones dominios y placeholder — HECHO (código)

- Placeholder acción: `/ranking o https://play.padelnexus.app/ranking`
- `comunicacionesActionUrl.ts`: hosts `*.padelnexus.app`, apex, netlify legacy, env FRONTEND_URL
- URLs propias normalizan a ruta relativa (`play`, `www`, `app`)
- Test: `ent33ComunicacionesDominios.test.ts`

### Bloque 6 — Limpieza QA Supabase + PUB-20 — HECHO (22/11)

- Supabase `tsmgxvygmdskhyhnjqvv`: fees Club Elim 5ª (6), torneos 18-11 (3), sede QA + canchas, órdenes marketplace QA (2)
- FEE-2 licencia `PAD-BMZ7RD`: ya pendiente; movimiento/liquidación inexistentes
- `deploy/padelnexus-netlify-legacy/_redirects` → `play.padelnexus.app` (solo sitio Netlify legacy)
- Registro: [qa-re-test-18-11-limpieza-supabase.md](qa-re-test-18-11-limpieza-supabase.md)

**Pendiente ops:** FEE-3 (MP prod), FEE-12 (push git), deploy `padelnexus-web` (DOM-5), QA manual FEE-9.

Plan detallado ítem por ítem: [re-test_18-11_correction_plan.md](re-test_18-11_correction_plan.md).
# Actuación de fiscales (Leo) — plan de implementación

Fuente: documento *ACTUACIÓN DE FISCALES EN PADEL NEXUS* + aclaraciones de Leo Acosta (ago 2026).  
Modelo de informe final de referencia: *INFORME FISCALIZACIÓN ALTA BARDA* (fuera de la app).

## Decisiones

- Cada entidad nacional (FAP, APA, PAF, …) tiene **su propio Colegio de Fiscales**. Padrón no global.
- El fiscal **no carga resultados**.
- Informes preliminares son **internos** (no llegan al jugador durante la competencia).
- El panel fiscal **no muta** el perfil público del jugador (`perfiles.categoria_padel`).
- Informe final del torneo: **fuera del sistema**; la app aporta PDFs preliminares.
- Nacional: Fiscal General + adjuntos. Provincial/club: fiscal actuante = autoridad (`rol = general`).
- Planilleros: grillas imprimibles **por cancha** (sin rol de login propio en este slice).

## Entregables

1. `fiscales.asociacion_id` + `UNIQUE (dni, asociacion_id)` y listados/asignaciones scoped.
2. Informes preliminares (`informe_preliminar`) con motivos Leo + PDF por jugador.
3. Revisión del Fiscal General (`aplicada` / `anulada`) + notificación interna.
4. PDF grillas por cancha para planilleros.

## Fuera de alcance

- Informe final automático tipo Alta Barda.
- Chat con adjunto PDF.
- Rol planillero con login.
- Marketplace de contratación de fiscales.

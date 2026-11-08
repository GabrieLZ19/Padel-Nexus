# Checklist QA — Testeo general 06/11/2026

Fuente: plan `qa_testeo_06-11_1f832d0d.plan.md` y PDF del informe.

| Código | Estado | Notas |
|--------|--------|-------|
| PUB-3 | Hecho | GET partidos sin sync de llave en visitantes; `optionalAuthenticate` + lectura paralela |
| PUB-4 | Hecho | Enlaces ranking -> /jugadores/:id; bloque ranking en ficha publica |
| PUB-5 | Hecho | Club/asoc. sin promo marketplace a plataforma; backend + UI |

## Fase D — detalles PUB

| Código | Estado | Notas |
|--------|--------|-------|
| PUB-6 | Hecho | Servicio en checkout: sin Envío ni dirección; solo nombre y teléfono |
| PUB-7 | Hecho | Alta servicio: lugar de prestación validado en paso 2 (form CRM) |
| PUB-8 | Hecho | Chat flotante: margen inferior/derecho móvil; FAB compacto al scroll |
| PUB-9 | Hecho | Ranking sin jugadores sin apellido; desempate; validación API registro/perfil |
| PUB-10 | Hecho | Copy consentimiento: autorizaciones en cuenta menor; enlace no auto-mail |
| PUB-11 | Hecho | notificaciones (ortografía); toasts sileo sin Title Case global |
| PUB-12 | Hecho | metadata por ruta; plantilla «%s · Padel Nexus»; portada server shell |
| PUB-13 | Hecho | Cifras portada: torneos = listado publico; clubes/canchas = listado reservar |
| PUB-14 | Hecho | Visitante: sin GET /perfil/me; sin favoritos ni no-leídos sin cookie |

## Fase D — detalles TOR

| Código | Estado | Notas |
|--------|--------|-------|
| TOR-9 | Hecho | PDF informe: nombre real del fiscal; UX emision; API devuelve fiscales |
| TOR-12 | Hecho | Llave: etiqueta Programado/Pendiente; En juego solo con estado En curso |
| TOR-13 | Hecho | Auditoría cambio pareja: resumen ES, lado, nro partido, antes/ahora |
| TOR-14 | Hecho | Inscripción: error exige carnet federativo vigente (sin sigla FAP) |
| TOR-15 | Hecho | Acta consolidada PDF: columna Resultado con marcador por partido |

## Fase D — detalles RES

| Código | Estado | Notas |
|--------|--------|-------|
| RES-8 | Hecho | Nos falta uno: partido de 4; confirmados al publicar; UI 2/4 |
| RES-9 | Hecho | Agenda club: turnos en franja bloqueada muestran Bloqueado + motivo |
| RES-10 | Hecho | Comunicaciones club: audiencia inicial jugadores_club sin selector provincia |
| RES-11 | Hecho | Montos $8.000, checkout dirección, voseo chat/transferencias, plural notif. |

## Fase D — detalles ENT

| Código | Estado | Notas |
|--------|--------|-------|
| ENT-8 | Hecho | Historial campañas: `formatearFechaHoraArgentina` (24 h, AR) |
| ENT-12 | Hecho | Mi panel: pase pendiente + cancelar; origen = asociación (no club) |
| ENT-13 | Hecho | Sponsors: activa a finalizada si fecha_fin paso (hoy AR); filtro publico listo |
| ENT-14 | Hecho | Licencia copy/club opcional; pago anual; ranking APN; clubes fed; sede tablero; SA marketplace |

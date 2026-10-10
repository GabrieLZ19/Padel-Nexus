# Pendientes — Auditoría UX y requerimientos 27/9

Lista de trabajo al 9 de octubre de 2026. El documento del cliente tiene 52 requerimientos; su columna de estado quedó vieja. Acá solo está lo que falta construir o cerrar. Se avanza de arriba hacia abajo, un ítem por vez.

Al cerrar uno: cambiar `[ ]` por `[x]`, anotar la fecha y no reabrirlo.

## Cómo está armado

1. Primero los críticos que todavía tienen trabajo.
2. Después prioridad alta, media y baja, en el orden del tablero.
3. Lo que ya está en el código y solo pide una mirada queda aparte, para no rehacerlo.
4. Las decisiones del cliente bloquean solo la parte indicada. El resto del ítem se puede avanzar.

## Decisiones que esperan al cliente

No implementar estas partes hasta que respondan.

| Tema | Bloquea | Qué quedó hecho mientras tanto |
|---|---|---|
| Qué evento pasa un torneo a En curso | GEN-08, la regla de transición | El programador ya muestra el estado de la competencia y, aparte, el de los horarios |
| Si el paso Sedes desaparece dentro del programador | ASI-02, quitar el paso 5 | — |
| Qué puede hacer un club sede en un torneo de otra entidad | ACC-01, si hay que cambiar la regla | Propuesta del documento: carga resultados y no edita ni elimina. Probado con New Center |
| Tipografía de los textos corridos | GEN-03, el cuerpo del texto | Unigeo sigue sin cargar (el archivo responde 404) |
| Pareja repetida «Córdoba B» en el ejemplo de puntos | RAN-02, solo ese total | Los puntos 8/6/4/2/1 ya se configuran en el cierre |
| Cómo interviene un fiscal en un torneo en curso | SEC-02, el flujo | El colegio de Federación es el de FAP, no el de la asociación provincial |

## Críticos

- [x] **SEC-01 · Estadísticas sin error 404.** (9/10) El ítem no tenía página. Se sacó del menú de federación, asociación y superadmin, igual que Moderación, que caía en el mismo 404. Cuando exista la sección, vuelve al menú.
- [ ] **GEN-08 · Estados y cifras coherentes.**
  - [x] Rótulos (9/10): el programador muestra el estado de la competencia y, aparte, el de los horarios.
  - [x] Cifras (9/10): la recaudación del tablero sale del mismo resumen que Inscripciones. Jugadores cuenta cada licencia una sola vez y Pendientes + Vigentes + Vencidas + Rechazadas suman el total. El tablero de federación usa esas mismas cifras.
  - [ ] Qué evento pasa un torneo a En curso. Sigue esperando al cliente.

## Prioridad alta

- [x] **ASI-01 · Índice de pasos siempre visible.** (9/10) Barra horizontal debajo del título, en federación y en club. A 1366×641 los 9 pasos entran en una fila, sin scroll propio, con candado en los bloqueados y el paso actual en chartreuse.
- [x] **CLU-01 · Crear un torneo sin fricciones** (cuenta de club). La ventana de alta no entra en 1366×641, «Crear borrador» vuelve al listado en vez de abrir el paso 1, la categoría arranca en 5ª sin elegirla, el índice del club salta el paso de Fiscales, y en Provincial la entidad organizadora arranca en FAP en vez de la asociación de la provincia. Aceptación: se crea un torneo sin desplazar la ventana y se llega al paso 1 con un clic, con pasos numerados sin saltos.
- [x] **CLU-02 · Reservas que se puedan gestionar.** La lista no confirma, cobra, cancela ni marca ausencia, y no hay agenda del día por cancha. Aceptación: el pago se registra desde la lista, se ven al menos 8 reservas a 1366×641 y la agenda muestra las canchas del día.
- [x] **GEN-01 · Menú completo a 1366×768.** Comunicaciones queda cortado y Estadísticas y Chat no se ven. Aceptación: los 11 ítems de Federación y el usuario se ven enteros, sin barra en el menú.
- [x] **GEN-02 · Sin barras horizontales.** A 1366×641 desbordan las pestañas y la tabla de Torneos, el índice del asistente y el chat. La llave y el programador se resuelven en CUA-03 y PRO-05. Aceptación: Torneos, Inscripciones, Jugadores y el asistente no muestran barra horizontal ni scroll dentro de un panel.
- [ ] **GEN-03 · Unigeo.** `/fonts/Unigeo-Semibold.woff2` responde 404 y los títulos caen en la fuente de reemplazo. Aceptación: el archivo responde 200 y los títulos se ven en Unigeo. La fuente de los textos corridos espera la decisión del cliente.
- [x] **GEN-09 · Modo lectura real y acciones destructivas.** En modo lectura siguen habilitados «Nueva inscripción», «Subir planilla» y borrar. Eliminar, revocar e inhabilitar están a un clic, y Replicar abre con categorías ya marcadas. Aceptación: un torneo en curso no deja inscribir ni borrar desde el paso 4, ninguna acción destructiva corre sin confirmar, y Replicar abre sin categorías marcadas.
- [x] **PER-01 · Mis torneos, próximo partido y ranking.** «Mis torneos» abre el listado público. El jugador no ve sus inscripciones, el próximo partido ni su puesto. Aceptación: en el celular, la primera pantalla muestra el próximo partido con hora y cancha, y desde ahí se llega a la llave.
- [x] **PER-02 · Datos oficiales protegidos.** (9/10) DNI y categoría son de solo lectura y «Solicitar cambio» registra el pedido sin modificar la ficha. La provincia sigue siendo obligatoria al registrarse y al guardar. El aviso de licencia aprobada usa la misma fecha que el carnet (31/12 cuando la federación la tiene fija).
- [x] **PRO-05 · Lista de pendientes legible.** (9/10) La lista ocupa el alto libre del programador. Cada partido son dos líneas, las zonas y las rondas se pliegan, y la pestaña Llave agrupa por ronda para arrastrar igual que en Zonas. Mover parejas entre zonas sigue conservando el horario.
- [x] **PUB-02 · Sitio público sin datos de prueba ni cifras ficticias.** (9/10) Sin sesión no aparecen torneos ni jugadores de ensayo. La portada muestra 9 jugadores, 0 torneos, 7 clubes y 14 canchas, que salen de la base. No está «Apertura Pilar» ni el acceso a las tiendas. El panel del club sigue viendo los torneos de prueba.
- [x] **RAN-04 · Desempate y categorías en el ranking público.** (9/10) Abre en 6ª, sin «Todas». 6ª y 6ta comparten la misma tabla. Si empatan en puntos, el orden es por apellido y, si coincide, por nombre. El primero figura «1.º».
- [ ] **SEC-02 · Colegio de Fiscales de la propia entidad.**
  - [x] Colegio (10/10): Federación ve el padrón de FAP (Federación Argentina de Pádel). La Asociación Paranaense queda como asociación provincial, con sigla APP, afiliada a FAP. La sigla APA sigue siendo el reglamento de la Asociación de Pádel Argentina. Alta, edición e inhabilitación del padrón quedan en la federación nacional.
  - [ ] Cómo interviene un fiscal en un torneo en curso. Sigue esperando al cliente.
- [x] **TOR-02 · Agrupar por competencia, rama y categoría.** (10/10) Replicar deja una sola fila de competencia. Se abre en rama (Damas, Caballeros) y después en cada categoría, en el listado de Federación, Asociación y Club.
- [x] **TOR-03 · Abrir el torneo en el paso de su estado.** (10/10) El clic en el nombre abre Datos, Jugadores, Cuadros o Resultados según el estado. En curso y Finalizado abren Resultados; el finalizado queda en lectura. Editar y Replicar muestran texto.

## Prioridad media

- [x] **ASI-02 · Misma numeración en índice y título.** (10/10) El número del índice y el del título coinciden. En el panel completo Cierre es el 7; en el club, que no muestra Fiscales, es el 6. Quitar el paso Sedes sigue esperando al cliente.
- [x] **ASO-01 · Panel de Asociación coherente.** (10/10) Clubes está en el menú y queda marcado al abrirlo. «Activos» cuenta solo los torneos provinciales o regionales del indicador. Las inscripciones usan la categoría del torneo y no aparece «Sin categoría». Si la asociación no puede editar el carnet, queda en una línea.
- [x] **CLU-03 · Inicio del club con datos coherentes.** (10/10) Próximas solo trae turnos desde hoy, en orden cronológico. La ocupación cuenta cada plantilla en su día de la semana: con las 9 reservas de septiembre da 1% (antes 0%) y $148.300. Las canchas se ordenan por número y no se puede repetir un nombre.
- [x] **CUA-03 · Llave al ancho de la pantalla.** (10/10) La llave de 16 abre ajustada al ancho: octavos, cuartos, semifinales y final entran en 1366 sin barra horizontal. El acercamiento manual sigue pudiendo desplazar el lienzo.
- [x] **CUA-04 · La misma pareja en todas las vistas.** (10/10) En un nacional la pareja se lee «Córdoba C · Fuentes / Tomasini» en posiciones, partidos, llave y sitio público. «Por definir» es el rival que falta y «Libre» queda solo para el bye.
- [x] **GEN-04 · 12 px y contraste 4,5:1.** (10/10) Resultados, Cuadros y el paso 1 quedan en 12 px como mínimo. El gris de rótulos y ayudas pasa a #8B93A1 (6,05:1 sobre #121212).
- [x] **GEN-05 · Menos ayudas repetidas.** (10/10) El paso 1, Jugadores y Resultados dejan un solo aviso. Ninguna ayuda repite el alcance elegido, la nota del carnet ni «sin sede/horario» en cada partido.
- [x] **GEN-06 · Voseo, tildes y categorías uniformes.** (10/10) El voseo reemplaza «Verifique», «Selecciona», «Elige» y «Configure». Rankings recupera las tildes. La categoría se ve siempre como «7ª» en listados, asistente, rankings y sitio público.
- [x] **GEN-07 · Entidad rectora configurable.** (10/10) «Puntos», «Reglamento», «licencias», «Plantilla» y «Entidades afiliadas» toman la sigla de la federación. Si la sigla deja de ser FAP, el nombre «Federación Argentina» sigue encontrando la entidad.
- [x] **GEN-10 · 25 filas y menos de 2 s.** (10/10) Torneos e Inscripciones abren con 25 filas y permiten 10, 25 o 50. El tablero pide un resumen y deja de recorrer el padrón completo y las inscripciones de cada torneo.
- [x] **GEN-11 · Error en el campo y aviso que se cierra solo.** (10/10) Si falta un dato del paso 1, solo ese campo queda marcado y el cursor va ahí. Guardar avisa con un toast que se cierra solo.
- [x] **GEN-12 · Teclado y nombres en los íconos.** (10/10) Rama, Alcance y Formato se alcanzan con Tab, flechas y Enter. Cerrar una ventana tiene nombre. El aviso del sistema usa el tema oscuro para que servidor y navegador coincidan.
- [x] **JUG-01 · Jugadores en tabla.** (10/10) Cada jugador es una fila (nombre, DNI, categoría, licencia, estado, vencimiento y acciones). Revocar queda en el menú ⋯. Los parámetros del carnet viven en la pestaña Configuración. A 1366×641 entran al menos 10 jugadores.
- [x] **PER-03 · Reservar en el celular.** (10/10) A 375 px los turnos y «Guardar ajustes» quedan por encima del chat. Sin sesión, Reservar lista los clubes con cancha y pide la cuenta al elegir el turno. «Mis reservas» separa próximas y pasadas. Las notificaciones dicen Éxito, Aviso y Promoción.
- [x] **PUB-01 · Buscador de la portada en la primera pantalla.** (10/10) A 1366×641 el título queda en tres líneas (52 px) y el buscador con el botón Buscar terminan en 489 px.
- [x] **PUB-04 · Torneo público en el celular.** (10/10) El título de zona se lee entero y, si no entra, pasa a otra línea. Esa vista queda en 12 px como mínimo. En el celular el encabezado usa el logo horizontal, legible al lado de los íconos.
- [x] **RES-03 · Resultados más compactos.** (10/10) Cada partido es una fila con número, zona, horario, parejas y sets. El aviso de sede queda una sola vez. A 1366×641 entran al menos 6 partidos de la zona, y Plegar actúa en el encabezado de esa zona.

## Prioridad baja

- [x] **SEC-03 · Textos según el rol.** (10/10) Con la cuenta de Federación, Inscripciones se titula «Inscripciones» y la columna es «Torneo». El chat no ofrece «Reservas» ni muestra la cancha. La tienda nacional no pide provincia.

## Ya en el código: contrastar, no rehacer

Estos figuraban pendientes el 27/9 y el código ya los cubre. Una pasada visual basta para pasarlos a cerrado.

- [ ] **TOR-01.** Cinco vistas con contador: En curso, Por iniciar, Inscripciones abiertas, En preparación, Finalizados. Falta mirar el orden interno y que las pestañas entren sin barra a 1366 px (eso también es GEN-02).
- [ ] **PRO-01.** «Abrir programador visual» abre en otra pestaña, con Volver. Falta confirmar que no queda el menú lateral y que la grilla usa el ancho.
- [ ] **PRO-02.** Jornadas, inicio, fin, turno, descanso, distribución, borrador, asignar y publicar están en el programador.
- [ ] **PRO-03.** «Agregar club / cancha» abre un panel dentro del programador.
- [ ] **PRO-04.** Al abrir se muestra el mínimo de canchas y horas. Falta la advertencia de la regla de las 11 h.
- [ ] **ASI-03.** En un torneo gratuito el pago figura «N/A» y no hay casilla «Pagó». El documento pedía la palabra «Sin costo».

## Cerrado

No se vuelve a abrir.

- **ACC-01.** Asociación limitada a su provincia; nacionales en lectura. Club sede carga resultados y no edita, elimina ni reprograma. Probado con Tucumán y New Center.
- **ASI-04.** Alcance, entidad organizadora y reglamento según el tipo. Verificado el 27/9. El detalle de la entidad por defecto en Provincial está en CLU-01.
- **ASI-05.** Ascenso de menores sin regenerar la llave, con motivo y auditoría.
- **CUA-01 y CUA-02.** Numeración continua y rondas en español, de octavos a la final.
- **RES-01 y RES-02.** Corrección de un resultado ya cargado, y W.O. separado de lesión y abandono.
- **RAN-01, RAN-02 y RAN-03.** Filtros del ranking nacional, puntos de provincia configurables y rankings de asociación y club por rama y categoría.
- **PUB-03.** Login con el texto de marca y la palabra «cuenta».
- **GEN-08, solo el rótulo del programador.** Estado de la competencia y estado de los horarios, por separado.

## Tarea de datos

No es un desarrollo. Borrar el torneo «AUDITORIA UX - borrador de prueba (borrar)» del club New Center cuando se pida. No tocarlo antes.

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
- [ ] **TOR-02 · Agrupar por competencia, rama y categoría.** Replicar crea torneos sueltos. Debe existir una competencia que los agrupe y el listado la muestre como fila desplegable. Aceptación: replicar a 6 categorías deja una sola fila que se abre en rama y después en categoría, igual en Federación, Asociación y Club.
- [ ] **TOR-03 · Abrir el torneo en el paso de su estado.** El centro de control abre el paso 1, bloqueado si el torneo está en curso. Un clic en el nombre debe abrir Datos, Jugadores, Cuadros o Resultados según el estado. Aceptación: en PRUEBA FINAL HR, el clic abre Resultados.

## Prioridad media

- [ ] **ASI-02 · Misma numeración en índice y título.** El índice dice «7. Cierre» y el título dice «PASO 6». Aceptación: el número coincide en los dos lugares. Quitar el paso Sedes espera la decisión del cliente.
- [ ] **ASO-01 · Panel de Asociación coherente.** No hay «Clubes» en el menú, el tablero dice «1 torneo» con la etiqueta «10 activos», hay parejas «Sin categoría» y el carnet ocupa la columna aunque la asociación no lo edita. Aceptación: Clubes se abre desde el menú, no aparece «Sin categoría» y ningún número contradice su etiqueta.
- [ ] **CLU-03 · Inicio del club con datos coherentes.** «Próximas reservas» muestra turnos ya pasados y la ocupación figura 0% con reservas en el mes. Hay dos canchas llamadas «Cancha 3». Aceptación: Próximas solo muestra desde hoy, y la ocupación es mayor que 0% si hay reservas en el mes.
- [ ] **CUA-03 · Llave al ancho de la pantalla.** El lienzo queda chico y hay que desplazarse en los dos sentidos. Depende de ASI-01. Aceptación: a 1366×641 una llave de 16 muestra sus cuatro rondas sin barra horizontal.
- [ ] **CUA-04 · La misma pareja en todas las vistas.** Las posiciones muestran la provincia y los partidos solo los jugadores. «Libre» se confunde con un bye. Aceptación: en un nacional se lee «Córdoba C · Fuentes / Tomasini» en posiciones, partidos, llave y sitio público, y «Por definir» solo cuando falta el rival.
- [ ] **GEN-04 · 12 px y contraste 4,5:1.** Resultados y Cuadros tienen textos de menos de 12 px. El gris de ayuda no llega al contraste pedido. Aceptación: Resultados, Cuadros y el paso 1 no tienen texto informativo de menos de 12 px.
- [ ] **GEN-05 · Menos ayudas repetidas.** El paso 1 repite el alcance elegido, Jugadores repite la nota del carnet y Resultados repite «sin sede/horario» en cada partido. Aceptación: como máximo un aviso informativo por pantalla, y ninguna ayuda repite el valor ya elegido.
- [ ] **GEN-06 · Voseo, tildes y categorías uniformes.** Convivien voseo, usted y tuteo. Faltan tildes y la categoría aparece como «7ª», «7» y «6TA». Aceptación: no aparecen «account», «Verifique», «Selecciona», «categorias» ni «segun», y la categoría se ve igual en todos lados.
- [ ] **GEN-07 · Entidad rectora configurable.** El título del ranking nacional ya no fija «FAP». Siguen en el código «Puntos FAP», «Reglamento FAP», «licencias FAP», «Plantilla FAP» y «Entidades afiliadas FAP». Aceptación: cambiar la sigla en la configuración de la entidad cambia esos textos sin tocar código.
- [ ] **GEN-10 · 25 filas y menos de 2 s.** Torneos e Inscripciones paginan de a 5. El tablero tardó más de 3 s. Aceptación: ambas listas abren con 25 filas y el tablero muestra cifras en menos de 2 s.
- [ ] **GEN-11 · Error en el campo y aviso que se cierra solo.** Falta un campo y aparece una ventana que lista todos. Cada guardado abre «¡Cambios guardados!». Aceptación: solo el campo vacío queda marcado, y guardar no abre una ventana.
- [ ] **GEN-12 · Teclado y nombres en los íconos.** Los desplegables propios no se alcanzan con Tab. Hay botones de solo ícono sin nombre y el error de React #418 en consola. Aceptación: se puede crear un torneo solo con teclado y la consola no muestra ese error.
- [ ] **JUG-01 · Jugadores en tabla.** Cada jugador es una tarjeta alta y el carnet está mezclado con la gestión diaria. Aceptación: a 1366×641 se ven al menos 10 jugadores, y los parámetros del carnet viven en una pestaña Configuración.
- [ ] **PER-03 · Reservar en el celular.** El chat tapa turnos y «Guardar ajustes». Sin sesión, Reservar muestra 0 clubes. «Mis reservas» mezcla pasadas y próximas. Las notificaciones dicen SUCCESS, INFO, PROMO. Aceptación: a 375 px nada queda debajo del chat, y sin sesión se listan los clubes.
- [ ] **PUB-01 · Buscador de la portada en la primera pantalla.** A 1366×641 el título ocupa cinco líneas y el buscador queda abajo del pliegue. Aceptación: el buscador y el botón principal terminan antes de los 641 px.
- [ ] **PUB-04 · Torneo público en el celular.** Los títulos de zona se cortan («POSICIONES · ZO…») y hay textos de menos de 12 px. Aceptación: a 375 px ningún título de zona se corta.
- [ ] **RES-03 · Resultados más compactos.** 13 partidos ocupan varias pantallas y el aviso de sede se repite. Aceptación: a 1366×641 se ven al menos 6 partidos de una zona, y plegar una zona se nota en esa zona.

## Prioridad baja

- [ ] **SEC-03 · Textos según el rol.** Federación ve «reservas» y «cancha» en Inscripciones y en el chat, y la tienda nacional pide provincia. Aceptación: con la cuenta de Federación esos textos no aparecen.

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

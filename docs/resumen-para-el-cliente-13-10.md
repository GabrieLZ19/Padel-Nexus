# Padel Nexus — Resumen de lo implementado

13 de octubre de 2026

Este resumen junta el trabajo hecho a partir de tres documentos:

1. La auditoría funcional del 17 de septiembre.
2. Las observaciones del 25 de septiembre.
3. La auditoría UX y requerimientos del 27 de septiembre.

El documento del 27/9 ya había tomado lo que seguía pendiente de los dos anteriores. Lo que figura abajo es lo que hoy está en la plataforma.

## Marca y sitio público

- El ingreso usa las frases de marca y la palabra «cuenta».
- La interfaz web usa Manrope, la adaptación digital de Unigeo, porque esa fuente no está publicada. Los archivos y la licencia quedan junto a la aplicación. Textos en peso 400, menús y etiquetas en 500, botones y subtítulos en 600, títulos en 700. El isologotipo no cambia. La aplicación mobile sigue en MuseoModerno y los PDF en Helvetica.
- El sitio público, sin sesión, no muestra torneos ni jugadores de prueba. Las cifras de la portada salen de la base.
- El buscador de la portada entra en la primera pantalla.
- El torneo público se lee en el celular, con el logo horizontal en el encabezado.
- El ranking público abre en 6ª categoría. Si hay empate en puntos, el orden es por apellido y después por nombre.

## Torneos

- Publicar la programación pasa un torneo Programado a En curso. Cargar un resultado no cambia el estado.
- Con el torneo en curso se pueden seguir corrigiendo cuadros y horarios, con motivo y registro de la edición.
- El listado agrupa por competencia, después por rama (Damas, Caballeros) y después por categoría. Replicar deja una sola fila de competencia y abre sin categorías marcadas.
- El clic en el nombre abre el paso que corresponde al estado: Datos, Jugadores, Cuadros o Resultados. Un torneo finalizado queda en lectura.
- Un torneo en curso no permite nuevas inscripciones ni borrar jugadores desde ese paso. Eliminar, revocar e inhabilitar piden confirmación.
- Un torneo gratuito no muestra la casilla «Pagó».
- El índice del asistente queda siempre visible, con candado en los pasos bloqueados.
- El paso Sedes salió del asistente. Los clubes y las canchas se cargan dentro del programador. La numeración queda: Fiscales 5, Cierre 6, Cuadros 7 y Resultados 8. En la cuenta de club, que no muestra Fiscales, Cierre es el 5.
- Crear un torneo desde el club cabe en la ventana, pide elegir la categoría y abre el paso 1. En un torneo provincial o regional, la entidad organizadora arranca en la asociación de la provincia del club.

## Cuadros, resultados y ranking

- Los partidos se numeran de corrido después de las zonas. Las rondas están en español, de octavos a la final.
- En un nacional, la pareja se lee igual en todas las vistas, por ejemplo «Córdoba C · Fuentes / Tomasini». «Por definir» es el rival que falta. «Libre» queda solo para el bye.
- La llave de 16 entra en el ancho de la pantalla.
- La llave y las zonas se pueden editar después de cargar resultados, sin regenerar el cuadro. El pase de una pareja de menores a una categoría superior del mismo grupo saca a la pareja con bye y la inserta en un hueco o en un partido nuevo, con motivo y registro.
- Un resultado ya cargado se puede corregir. El W.O. distingue incomparecencia, lesión y abandono.
- Los resultados se ven en filas. Cada zona se pliega desde su encabezado.
- Los puntos de cada jugador salen de la configuración del cierre.
- El ranking por provincia también se configura ahí: los puntos y la ronda desde la que empiezan a sumar. Solo existe en un torneo de alcance nacional, porque es el único en el que las parejas representan a su provincia.
- En el ejemplo de Libres, Caballeros 7ª, la segunda «Córdoba B» de octavos se lee como Córdoba E. El total de Córdoba sigue en 12.
- El ranking nacional se puede filtrar y no lleva «FAP» fijo en el título. Los textos de puntos, reglamento, licencias y entidades afiliadas toman la sigla de la federación.
- Los rankings de asociación y de club se ordenan por rama y después por categoría.

## Programador

- Se abre en otra pestaña, con volver, y usa el ancho de la pantalla. En modo claro el texto y las tarjetas se leen.
- Jornadas, inicio, fin, turno, descanso, distribución, borrador, asignar y publicar están en la misma pantalla.
- «Agregar club / cancha» abre un panel dentro del programador.
- La lista de partidos pendientes ocupa el alto libre. Cada partido son dos líneas, y las zonas y las rondas se pliegan.
- Al rearmar una zona se conservan cancha y horario. Mover parejas pide un motivo.

## Club, jugador y permisos

- El club confirma, cobra, cancela o marca ausencia desde la lista de reservas, y tiene la agenda del día por cancha.
- El inicio del club muestra las próximas reservas desde hoy y la ocupación del día.
- Una asociación solo ve y modifica lo de su provincia. Un nacional se consulta, no se edita.
- El club sede de un nacional solo consulta el torneo: no lo edita, no lo elimina, no lo reprograma y no carga resultados. Solo aporta las instalaciones. Quien organiza es quien administra la competencia. El torneo que el club organiza sigue siendo suyo.
- El jugador ve sus torneos, el próximo partido con hora y cancha, y su puesto. Desde el próximo partido se llega a la llave.
- DNI y categoría no se editan. «Solicitar cambio» registra el pedido y deja la ficha igual. La provincia sigue siendo obligatoria.
- Se puede reservar una cancha desde el celular. Sin sesión, el sitio pide la cuenta al elegir el turno.
- El padrón de jugadores es una tabla. El colegio de fiscales de la federación es el de la Federación Argentina de Pádel. La Asociación Paranaense queda como asociación provincial.
- Estadísticas y Moderación salieron del menú hasta que esas secciones existan. Antes abrían una página de error.

## Lectura y uso

- El menú de federación entra completo en una pantalla de 1366 px, sin barra propia.
- Torneos, Inscripciones, Jugadores y el asistente usan el desplazamiento de la página, sin barras horizontales.
- El texto de la interfaz queda en 12 px como mínimo, con contraste suficiente sobre el fondo oscuro.
- Las ayudas no se repiten en cada fila. El trato es de vos, con tildes, y la categoría se ve siempre como «7ª».
- Los listados abren con 25 filas. Si falta un dato, se marca solo ese campo. Las acciones se alcanzan con teclado.

## Qué queda abierto

Una sola definición sigue esperando respuesta:

- Cómo interviene un fiscal en un torneo que ya está en curso.

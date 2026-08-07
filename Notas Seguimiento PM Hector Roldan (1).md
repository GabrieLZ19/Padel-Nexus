# **📝 Las notas** 

<mark>jul 23, 2026</mark> 

# **Reunión del 23 jul 2026 a las 17:04 GMT-03:00** 

Registros de la reunión Grabación 

## **Resumen** 

La reunión definió la estructura administrativa del sistema, refinó configuraciones de torneos y planificó pruebas en vivo. 

### **Estructura administrativa y módulos** 

La jerarquía de paneles permite que federaciones y asociaciones gestionen datos con total autonomía, integrando módulos de marketplace y fiscales para centralizar la operatividad. 

### **Configuración técnica de torneos** 

La configuración técnica de torneos incluye validaciones de edad obligatorias y edición no destructiva de llaves, reduciendo el margen de error durante las inscripciones. 

### **Validación mediante pruebas reales** 

Se determinó realizar pruebas en torneos reales para validar la funcionalidad del ecosistema completo, permitiendo verificar la estabilidad técnica antes de la liberación final del software. 

## **Próximos pasos** 

[Whapy LLC] Ajustar Torneos: Cambiar la etiqueta nacional para nuevos torneos. [Whapy LLC] Renombrar Módulos: Sustituir la sección clubes por asociaciones o agrupaciones. 

[Whapy LLC] Incorporar Fiscales: Crear el módulo dedicado a la gestión de fiscales registrados. 

[Whapy LLC] Modificar Etiquetas: Cambiar provincia con cobertura por presencia nacional. 

[Whapy LLC] Actualizar Licencias: Renombrar licencias emitidas a licencias vigentes. 

[Whapy LLC] Clasificar Jugadores: Desglosar el recuento de federados en mayores y menores. 

[Whapy LLC] Consultar Diseño: Validar con el equipo de desarrollo la implementación de un mapa interactivo para asociaciones. 

[Whapy LLC] Cambiar Premiación: Sustituir recompensas por premiación en los torneos. 

[Whapy LLC] Configurar Torneos: Eliminar la opción FAP estándar y ajustar los cupos máximos por zonas. 

[Whapy LLC] Reorganizar Sedes: Eliminar la sección de complejos y canchas del inicio del torneo y centralizar esta información exclusivamente en la configuración de sedes, donde se debe permitir la carga de clubes, cantidad de canchas y horarios. 

[Whapy LLC] Configurar Carnet Federativo: Implementar un checkbox para configurar si el torneo requiere pago de carnet federativo, incluyendo la posibilidad de definir el valor asociado. 

[Whapy LLC] Mover Fiscales: Trasladar la sección de asignación de fiscales fuera del apartado de sedes para que sea una opción independiente y accesible. 

[Whapy LLC] Restringir Puntuación: Establecer una restricción condicional en la configuración de puntuación de partidos para que no sea posible seleccionar punto de oro y set point de manera simultánea. 

[Whapy LLC] Limitar Set: Limitar el valor máximo de puntos para el tercer set a 11 en el sistema de selección. 

[Whapy LLC] Editar Llaves: Desarrollar una funcionalidad de edición de llaves que permita agregar o eliminar parejas una vez iniciado el torneo, asegurando que el sistema realice la redistribución automática según el reglamento preestablecido. 

[Enzo Roldán] Documentar Casos: Identificar y documentar todos los casos de modificación no destructiva en el torneo, incluyendo la modificación de grupos antes del inicio y la edición de llaves durante el desarrollo, para facilitar la programación de las reglas lógicas. 

[Whapy LLC] Corregir base datos: Resolver el error de base de datos que impide la creación de nuevos torneos en el sistema. 

[Whapy LLC] Arreglar interfaz usuario: Ajustar la interfaz del modal para permitir que el botón de cierre funcione correctamente. 

[Whapy LLC] Mejorar calendario reservas: Implementar la selección múltiple de días y la edición masiva de precios en el módulo de reservas para mejorar la gestión. 

[Enzo Roldán] Compartir archivos diseño: Compartir los activos visuales y las fuentes de diseño recibidas de la diseñadora con el equipo de desarrollo. 

[Whapy LLC] Enviar guía tiendas: Enviar la guía instructiva para la gestión de cuentas y publicación en Google Play y App Store. 

[Whapy LLC] Agregar seccion ranking: Incluir una nueva sección dedicada a los rankings federativos y nacionales dentro del menú general de la aplicación. 

[Whapy LLC] Enviar guia: Proporcionar el instructivo detallado para la configuracion de la cuenta de desarrollador. 

[Enzo Roldan] Revisar panel: Analizar el panel de asociacion y enviar los comentarios o correcciones pertinentes. 

[Whapy LLC] Compartir grabacion: Enviar el registro audiovisual del encuentro actual al equipo de desarrollo. 

[Whapy LLC] Transmitir cambios: Comunicar al equipo tecnico las modificaciones solicitadas para el modulo especifico. 

[Hector Roldan, Enzo Roldan] Documentar modificaciones: Elaborar un documento de presentacion o diapositivas con capturas de pantalla de los cambios necesarios. 

## **Detalles** 

- **Panel de administración de la federación** : Hector Roldan y Enzo Roldán revisaron el panel administrativo de la entidad, solicitando modificar el nombre de la sección de "Clubes" por "Asociaciones o agrupaciones", ya que las federaciones no administran clubes directamente. Asimismo, se acordó cambiar la denominación de "Torneo Nacional" a "Torneo" para brindar flexibilidad a las federaciones en la organización de eventos provinciales o de distinto alcance. 

- **Incorporación de módulos** : Se acordó la adición de dos módulos que no figuran actualmente en el panel: el "Marketplace" de la federación y una base de datos específica para la gestión de fiscales. 

- **Jerarquía de paneles de usuario** : Se debatió la estructura de los paneles administrativos. Hector Roldan enfatizó que la plataforma debe permitir una jerarquía donde el administrador general (Padel Nexus) asigne paneles a las federaciones, y estas, a su vez, asignen paneles a sus asociaciones afiliadas, asegurando que cada nivel tenga control sobre sus propios datos y configuraciones. 

- **Alcance de los torneos** : Se aclaró que los torneos nacionales son competencia exclusiva de las federaciones o asociaciones madre, mientras que las asociaciones provinciales o regionales organizan eventos locales o privados. Se determinó que los paneles deben restringir las opciones de creación de torneos según el perfil del usuario para evitar errores. 

- **Ajustes en el dashboard de la federación** : Se revisaron los seis cuadrantes del dashboard administrativo. Los participantes solicitaron cambiar "Torneos Nacionales" por "Torneos" (reflejando el total del circuito), "Cobertura" por "Presencia nacional", y "Licencias" por "Licencias/Carnet federativo" para mayor claridad terminológica. 

- **Gestión de asociaciones y presencia nacional** : Se definió que el dato de "Presencia nacional" debe calcularse automáticamente a partir del registro de asociaciones en la 

base de datos. Enzo Roldán advirtió la necesidad de implementar un proceso de aprobación para los registros de nuevas agrupaciones, a lo que Hector Roldan coincidió, añadiendo que se deben enviar avisos automáticos para gestionar estas altas. 

- **Visualización de datos de jugadores** : Se acordó ajustar el bloque de "Jugadores federados" para incluir una distinción clara entre mayores y menores. Esto es crucial para gestionar la recaudación, ya que los menores suelen estar exentos de pago de carnet, a diferencia de los mayores. 

- **Visualización de asociaciones** : Ante la consulta de cómo mostrar las asociaciones, Hector Roldan propuso una segmentación geográfica o el uso de un mapa interactivo para facilitar la navegación en lugar de una lista simple. Whapy LLC se comprometió a consultar con su equipo la mejor opción de diseño. 

- **Información requerida para asociaciones** : Se estableció que al acceder a una asociación específica, el sistema debe mostrar detalles como los torneos organizados (históricos y programados), los jugadores afiliados y los resultados de las competencias asociadas. 

- **Gestión de la base de datos de fiscales** : Se acordó integrar la base de datos de fiscales, incluyendo el alcance de cada uno (nacional, regional o local). Hector Roldan aclaró que esta base debe permitir el registro de datos personales y la asignación según lo disponga el Colegio de Fiscales, sin que los fiscales tengan permisos para autogestionarse en los torneos. 

- **Estructura de torneos nacionales** : Hector Roldan explicó que, a efectos del sistema, un torneo nacional se compone de múltiples eventos (uno por cada categoría, como quinta, sexta, séptima, etc., en ramas masculinas y femeninas). El sistema debe permitir la creación de estos sub-torneos de forma estructurada. 

- **Configuración de parámetros del torneo** : Se acordó simplificar los campos de configuración del torneo, eliminando opciones redundantes de diagramación (como zonas de cuatro). Se solicitó reemplazar el término "Recompensas" por "Premiación" y establecer un cupo máximo claro para cada torneo. 

- **Gestión de sedes y canchas** : Se discutió la lógica de asignación de canchas. Se acordó eliminar el campo de "Sede principal" de la configuración inicial, delegando la selección de complejos y la asignación de canchas específicas a un apartado posterior donde se pueda detallar la cantidad de pistas y horarios necesarios según la inscripción. 

- **Requisitos de inscripción y licencias** : Se solicitó incluir un checkbox para exigir o no el pago del "Carnet federativo" al momento de la inscripción. Esto permitirá flexibilidad, ya que en ciertos torneos, como los de menores, el pago de dicho carnet no es obligatorio. 

- **Validación de edad** : Hector Roldan subrayó la necesidad de aplicar una validación de edad obligatoria en categorías específicas, como veteranos (+30, +40, +60), para impedir que jugadores que no cumplen con los requisitos de edad puedan inscribirse. 

- **Implementación de inscripción masiva (CSV)** : Se aprobó la funcionalidad de carga masiva de inscripciones mediante archivos CSV. Se acordó que el sistema debe validar los DNI contra la base de datos de usuarios registrados; aquellos que no estén registrados deben ser marcados para evitar que avancen en el proceso de inscripción. 

- **Modelo de carga de datos** : Para evitar errores de formato en la carga de archivos, se acordó que la plataforma proveerá un modelo de planilla predefinido que los usuarios deberán descargar y completar, asegurando que los datos (como DNI sin puntos) sigan el formato correcto que el sistema espera. 

- **Plantillas de registro de jugadores** : Enzo Roldán y Hector Roldan revisaron la plantilla descargable para la carga de jugadores. Confirmaron que el formato requiere que el usuario ingrese ya sea un correo electrónico o un número de DNI, junto con la información de pago, validando que el sistema ya reconoce correctamente estas entradas. 

- **Organización de sedes y fiscales** : Los participantes acordaron que la sección de "Fiscales" debe estar separada de la sección de "Sedes" dentro de la interfaz. Esta decisión busca mejorar la experiencia de usuario (UX), facilitando la navegación para personas mayores o aquellos que busquen la información de manera más directa. 

- **Sistema de puntuación y definición de sets** : El equipo discutió la configuración de los partidos, estableciendo que el "punto de oro" y el "start point" deben ser excluyentes mediante lógica condicional en el sistema. Además, se acordó que la definición del tercer set tendrá un máximo de 11 puntos con una diferencia requerida de dos puntos, configurándose mediante una lista seleccionable. 

- **Visualización de estadísticas en llaves** : Hector Roldan aclaró el significado de las siglas en la visualización de los cuadros, como "SF" (sets a favor), "SC" (sets en contra) y "STB" (super tiebreak), destacando que actualmente el sistema carece de la funcionalidad para cargar los resultados de los partidos jugados. 

- **Concepto de modificación no destructiva** : Hector Roldan presentó la necesidad de implementar una "modificación no destructiva" para los torneos. Esta herramienta permitiría editar llaves, añadiendo o eliminando parejas sin invalidar el torneo completo, lo cual es fundamental para proteger a los menores de edad de errores en la inscripción realizados por adultos o entrenadores. 

- **Lógica para edición de grupos y llaves** : El grupo definió que, antes de que comiencen los partidos, el sistema debe permitir mover jugadores entre grupos y regenerar el torneo. En el caso de las llaves de campeonato, se requiere una funcionalidad para agregar o quitar parejas con una redistribución automática que respete la ventaja deportiva de quienes clasificaron primeros en sus zonas. 

- **Formatos de competencia para clubes** : Hector Roldan enfatizó que el módulo de "Clubes" requiere flexibilidad para soportar formatos comerciales como "americano", "super 12" o "super 8". Estos torneos, a menudo basados en sets únicos o sumatorias de juegos, son distintos a los torneos nacionales y deben permitir configuraciones específicas dentro de la plataforma. 

- **Sección de carga de resultados** : Los participantes acordaron renombrar el módulo de "Arbitraje" a "Carga de resultados". Esta sección debe replicar la estructura de las zonas (por ejemplo, 1 vs 2, 2 vs 3, 1 vs 3 para grupos de tres) para permitir a los usuarios registrar el desglose de los puntos de cada partido. 

- **Rankings y visualización de clasificaciones** : Enzo Roldán sugirió añadir una sección dedicada a los rankings nacionales en el menú general. Hector Roldan clarificó que las zonas y las tablas de posiciones deben mostrarse como secciones independientes para mejorar la claridad de la información. 

- **Configuración del Super Tiebreak** : Se discutió la configuración del Super Tiebreak (STB). Hector Roldan solicitó que el sistema permita definir hasta qué instancia del torneo se jugará con STB (por ejemplo, hasta cuartos de final), permitiendo luego cambiar a sets completos en instancias finales. 

- **Impresión de grillas y gestión de partidos** : Hector Roldan destacó la importancia de poder imprimir grillas de partidos para el personal en cancha (planilleros). Estas grillas deben incluir identificadores únicos de partido que coincidan con los códigos internos del sistema para facilitar el control de horarios y canchas. 

- **Errores y bugs en la interfaz** : Hector Roldan reportó un error de base de datos al intentar crear un torneo ("5 Center error") y problemas de diseño donde la ventana emergente de cierre no funciona correctamente. Whapy LLC se comprometió a solucionar estos problemas. 

- **Gestión de precios de alquiler** : Hector Roldan solicitó funciones adicionales para la gestión de canchas, incluyendo la capacidad de editar precios de forma masiva (por porcentaje o monto fijo) y ajustar valores según franjas horarias específicas, en lugar de realizar cambios manuales individuales. 

- **Simplificación de plantillas de turnos** : Para mejorar la dinámica de reserva de canchas, el equipo discutió la necesidad de simplificar la carga de horarios. Se acordó implementar una función que permita aplicar una plantilla de turnos a múltiples días de la semana simultáneamente, evitando la carga día por día. 

- **Identidad visual y estrategia de desarrollo** : Whapy LLC confirmó que están a la espera de los archivos de identidad visual ("key visual") para proceder con los ajustes. Se acordó realizar todas las correcciones en la plataforma web primero para asegurar estabilidad antes de replicar los cambios en la aplicación móvil. 

- **Acceso de superadministrador (CRM)** : Hector Roldan aclaró el requisito de tener un acceso de superadministrador en el CRM. Esto permitirá a Padel Nexus supervisar 

el entorno completo, incluyendo federaciones y asociaciones, manteniendo la capacidad de habilitar o suspender cuentas mientras permite que las federaciones gestionen sus propios espacios de forma independiente. 

- **Pruebas de la plataforma en torneos reales** : Hector Roldan propuso realizar pruebas funcionales de la plataforma utilizando un torneo real, específicamente colaborando con la Federación Argentina de Padel para probar el sistema en un entorno controlado. El objetivo es realizar estas pruebas con un torneo privado, de menor escala que uno nacional, para observar la interacción de todo el ecosistema, incluyendo a los jugadores, los dirigentes, la asociación y la federación. Se espera que estas pruebas permitan validar procesos como la descarga de la aplicación, la creación de torneos, la carga de resultados, la visualización de la clasificación y la gestión de parejas y rankings. 

- **Gestión de cuentas en tiendas de aplicaciones** : Whapy LLC se comprometió a enviar una guía para que el equipo pueda realizar el trámite de creación de sus propias cuentas de desarrollador en Google Play y App Store. Whapy LLC señaló que, mientras que Google Play es sencillo de gestionar, App Store presenta mayores restricciones y requiere más tiempo, por lo que es necesario comenzar con antelación. Para facilitar el testeo inicial, Whapy LLC publicará las aplicaciones desde su propia cuenta de desarrollador y, una vez finalizado el proyecto y obtenida la aprobación, transferirá la titularidad de las aplicaciones a la cuenta del equipo. 

- **Condiciones de transferencia y financiamiento** : Hector Roldan aclaró que la transferencia de la titularidad del proyecto está sujeta a la finalización de los plazos de financiamiento establecidos contractualmente. Además, se mencionó que existe un acuerdo fuera de lo contractual para garantizar la utilización del producto durante un periodo de 12 meses. 

- **Logística técnica para pruebas de usuario** : Whapy LLC recomendó que las aplicaciones estén disponibles en ambas tiendas para el periodo de prueba, ya que iOS no permite visualizar las versiones "beta" o de prueba de la misma manera que Android. Hector Roldan confirmó que los jugadores, clubes y organizaciones participantes, posiblemente en circuitos de la provincia de Buenos Aires o Entre Ríos, deberán descargar la aplicación para completar el proceso de inscripción y registro de datos, permitiendo así verificar cómo el sistema procesa la información en tiempo real. 

- **Ajustes y funcionalidades del panel de asociación** : Enzo Roldán y Hector Roldan analizaron el panel de asociación, coincidiendo en que debe ser similar al panel de la federación con ciertos ajustes necesarios. Enzo Roldán destacó que no todos los torneos son clasificatorios, por lo que el botón de llamado a la acción debe revisarse, y planteó dudas sobre cómo se gestiona el recuento de duplas inscritas dado que las parejas pueden variar durante la temporada. Se acordó incluir secciones específicas para rankings nacionales, provinciales y locales. Para avanzar con estos cambios, Enzo Roldán revisará el panel detalladamente y enviará las observaciones y 

modificaciones deseadas al equipo mediante capturas de pantalla o documentos, asegurando que el equipo de desarrollo reciba las instrucciones claras para implementar las mejoras. 

_Revisa las notas de Gemini para asegurarte de que sean precisas. Obtén sugerencias y_ _<u>descubre cómo Gemini toma notas</u>_ 

_Cómo es la calidad de_ **_estas notas específicas?_** _<u>Responde una breve encuesta</u> para darnos tu opinión; por ejemplo, cuán útiles te resultaron las notas._ 


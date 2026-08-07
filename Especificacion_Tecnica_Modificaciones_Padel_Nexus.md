**PADEL NEXUS — ESPECIFICACIÓN TÉCNICA** 

**Cliente / Dominio:** Héctor Roldán & Enzo Roldán  | **Líder Técnico:** Leo (Whapy LLC)  | **Fecha:** Julio 2026 

Documento Consolidado de Modificaciones, Requerimientos y Reglas de Negocio 

# **1. Resumen Ejecutivo y Alcance** 

Este documento especifica de manera integral todas las modificaciones de arquitectura, reglas de negocio, reestructuración modular, corrección de errores (bugs) y flujos operativos requeridos para la plataforma multi-tenant de administración de torneos de pádel **Padel Nexus** . 

# **2. Arquitectura General y Jerarquía Multi-inquilino** 

La plataforma se articula bajo una estructura jerárquica en cascada que delimita las responsabilidades y visibilidad del sistema: 

- **Nivel 0 — Superadmin (CRM Padel Nexus):** Control global de la infraestructura. Monitoreo de todas las federaciones y asociaciones, capacidad de habilitación/suspensión de entidades y auditoría. 

- **Nivel 1 — Federación Nacional (Entidad Madre):** Administra el circuito nacional y sus asociaciones provinciales/ regionales vinculadas (ej. FAP, APA, PAF). 

- **Nivel 2 — Asociación Provincial / Regional:** Asociada a una federación nacional. Gestiona torneos locales/ provinciales y la afiliación de clubes/jugadores dentro de su provincia. 

- **Nivel 3 — Club / Complejo Deportivo:** Administración de complejos, alquiler de canchas, turnos comerciales y torneos internos/locales. 

**Restricción de Roles:** Los clubes no deben visualizar opciones de "Torneo Nacional". Las asociaciones provinciales solo ven torneos de alcance provincial, regional o local. Cada rol visualiza un panel adaptado a su jurisdicción. 

# **3. Rediseño del Dashboard (Panel Federación)** 

Reestructuración técnica de los 6 cuadrantes del dashboard administrativo: 

|**Cuadrante**|**Nombre**<br>**Anterior**|**Nuevo Nombre**|**Lógica de Negocio y Cálculo**|
|---|---|---|---|
|**1**|Torneos<br>Nacionales|**Torneos**|Conteo general del circuito (torneos de la federación + sumatoria de<br>eventos de sus asociaciones afiliadas).|
|**2**|Cobertura|**Presencia Nacional**|Cantidad de provincias con asociaciones vinculadas. Cálculo<br>automático en base de datos.|
|**3**|Licencias|**Licencias / Carnet**<br>**Vigentes**|Total de licencias deportivas o carnets anuales activos en el período<br>actual.|
|**4**|Jugadores<br>Federados|**Jugadores**<br>**Federados**|Conteo acumulado con**desglose obligatorio: Mayores / Menores**<br>(ej. 1500 / 250). Esencial para la proyección financiera (menores<br>exentos de pago).|
|**5**|Clubes|**Asociaciones**<br>**Registradas**|Total de asociaciones regionales/provinciales afiliadas a la federación<br>madre.|
|**6**|N/A|||



Página 1 de 4 

|**Cuadrante**|**Nombre**<br>**Anterior**|**Nuevo Nombre**|**Lógica de Negocio y Cálculo**|
|---|---|---|---|
|||**Visualización de**|Segmentación geográfica o mapa interactivo (factibilidad UI/UX a|
|||**Asociaciones**|validar con diseño).|



# **4. Modificación y Creación de Módulos** 

## **4.1 Renombrado de Secciones** 

- **"Clubes" ➔ "Asociaciones o Agrupaciones":** Debido a que la federación coordina asociaciones y no clubes directamente. 

- **"Arbitraje" ➔ "Carga de Resultados":** Módulo para la entrada puntual de marcadores. 

- **"Recompensas" ➔ "Premiación":** Denominación estandarizada para premios, trofeos y puntos. 

## **4.2 Nuevos Módulos Incorporados** 

- **Módulo "Colegio de Fiscales":** Registro independiente para la gestión de árbitros y fiscales. Permite definir asignación de alcance (Nacional, Regional o Local). Los fiscales no autogestionan torneos; la asignación es centralizada. Se ubica fuera de la sección de sedes como módulo independiente. 

- **Módulo "Marketplace":** Pestaña independiente para comercialización corporativa y patrocinadores. 

- **Sección de "Rankings":** Incorporar pestaña general de rankings federativos y nacionales desglosados por categorías en la App y Web. 

# **5. Configuración Técnica de Torneos** 

- **Eliminación de Prefijos:** Quitar la etiqueta fija "Nacional" en los formularios de creación para dar flexibilidad a eventos locales y provinciales. 

- **Sede Principal / Centro de Cómputos:** Cambiar "Club Organizador" por "Sede Principal / Centro de Cómputos" (punto de mando de los delegados y fiscal general). 

- **Reorganización de Sedes:** Eliminar el campo "Sede principal" inicial y centralizar la carga de complejos, canchas y horarios exclusivamente en la sección dedicada a la **Configuración de Sedes**. 

- **Validación de Edad Obligatoria:** En categorías específicas como *Veteranos* o *Ladies* (+30, +40, +50, +60), el sistema debe validar la fecha de nacimiento/DNI e impedir la inscripción de jugadores no elegibles. Se desactiva en categorías *Libres*. 

- **Checkbox Carnet Federativo:** Control opcional `[ ] ¿Requiere pago de Carnet Federativo?` con campo para especificar el monto a cobrar. 

# **6. Lógica de "Modificación No Destructiva" de Cuadros (Draws)** 

Permite corregir errores de inscripción o categoría (especialmente en torneos de menores) sin anular el torneo completo ni perder el historial: 

#### **Flujo de Edición de Llaves:** 

1. **Quitar Pareja:** Transforma el cruce en Walkover (W.O.) o Bye, avanzando al rival sin romper el gráfico. 

2. **Agregar Pareja:** Incorpora la pareja como última sembrada en la llave. 

3. **Redistribución Automática:** El sistema reorganiza el cuadro respetando la **Ventaja Deportiva** (los 1° de zona deben ubicarse en los extremos opuestos del cuadro). 

Página 2 de 4 

# **7. Reglas de Juego, Puntuación y Resultados** 

- **Exclusión Mutua:** Imposibilitar la selección simultánea de "Punto de oro" y "Set point" (ventaja). Son mutuamente excluyentes. 

- **Tercer Set y Super Tiebreak (STB):** Permitir definir el tercer set como STB con límite máximo de 11 puntos (diferencia de 2) en el selector. Configurable por instancia (ej. STB hasta Octavos; a partir de Cuartos, tercer set completo). 

- **Grillas Imprimibles (PDF):** Generación de grillas en PDF para planilleros de campo. Cada partido debe llevar un **código/ID único visible** que coincida con la base de datos interna. 

# **8. Módulo de Reservas y Clubes** 

- **Entrada de Horarios:** Permitir la entrada directa por teclado de horarios, evitando depender exclusivamente del selector tipo "reloj". 

- **Edición Masiva de Precios:** Selección de franjas horarias y actualización masiva por porcentaje (%) o monto fijo ($). 

- **Plantillas de Turnos:** Creación y aplicación masiva de esquemas de disponibilidad a múltiples días. 

# **9. Corrección de Bugs y Proceso de Aprobación** 



### **Bug Crítico #1: "5 Center Error"** 

Resolver prioritariamente el fallo en la base de datos que bloquea la creación de nuevos torneos. 



### **Bug Crítico #2: Modales UI** 

Corregir el botón de cierre (`X` / `Cancelar`) en las ventanas emergentes del sistema. 

**Aprobación de Asociaciones:** Cuando una nueva asociación se registra, el sistema debe enviar un aviso automático a la federación madre para su **Aprobación o Rechazo** manual antes de activarse. 

# **10. Estrategia de Lanzamiento y Pruebas en Vivo** 

- **Publicación en Tiendas:** Whapy LLC enviará las guías para la creación de cuentas corporativas en Google Play y App Store. Inicialmente, las Apps se subirán desde la cuenta de Whapy LLC para agilizar el testeo en iOS/Android y luego se realizará la transferencia de titularidad. 

- **Pruebas "En Espejo":** Realización de una prueba piloto en un torneo real controlado (ej. Buenos Aires, Entre Ríos o Neuquén) junto a la FAP, corriendo la plataforma en paralelo con el sistema antiguo para verificar el ecosistema en vivo. 

# **11. Matriz de Asignación de Tareas** 

|**Responsable**|**Código / Tarea**|**Descripción del Entregable**|
|---|---|---|
|**Whapy LLC**|**Whapy LLC**|Corregir error de BD ("5 Center Error") y fallo de cierre en modales UI.|
|**Whapy LLC**|**Whapy LLC**|Renombrar "Clubes" por "Asociaciones" y quitar etiqueta fija "Nacional" en torneos.|
|**Whapy LLC**|**Whapy LLC**|Implementar módulo independiente de "Colegio de Fiscales" fuera de sedes.|
|**Whapy LLC**|**Whapy LLC**|Ajustar métricas del Dashboard (Presencia Nacional, Carnets Vigentes, Mayores/Menores).|



Página 3 de 4 

|**Responsable**|**Código / Tarea**|**Descripción del Entregable**|
|---|---|---|
|**Whapy LLC**|**Whapy LLC**|Desarrollar lógica de Modificación No Destructiva de Llaves (edición con ventaja deportiva).|
|**Whapy LLC**|**Whapy LLC**|Implementar reglas de puntuación (Punto de oro vs Ventaja, STB límite 11 puntos).|
|**Whapy LLC**|**Whapy LLC**|Añadir selección múltiple de días, plantillas y edición masiva de precios en reservas.|
|**Whapy LLC**|**Whapy LLC**|Enviar guía instructiva para cuentas en Google Play y App Store.|
|**Enzo Roldán**|**Enzo Roldán**|Documentar casos de uso para modificación no destructiva de cuadros (zonas y llaves).|
|**Enzo Roldán**|**Enzo Roldán**|Revisar panel de asociación y enviar capturas/comentarios de ajustes.|
|**Enzo Roldán**|**Enzo Roldán**|Compartir Key Visual y fuentes entregadas por la diseñadora.|
|**Héctor / Enzo**|**H. / E. Roldán**|Elaborar presentación/diapositivasinstitucionales con capturas de pantalla de los cambios.|



Página 4 de 4 


import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_PAGO, FAP_ESTADOS_TORNEO } from "../constants/fap";

interface ParejaRanking {
  inscripcionId: string;
  puntosTotales: number;
  clubes: string[]; // Para la regla de evitar mismos clubes en zona
}

interface Zona {
  nombre: string;
  capacidad: number;
  parejas: ParejaRanking[];
}

export class CompetenciaService {
  /**
   * Genera las zonas y partidos de la fase de grupos basándose en el reglamento FAP.
   */
  static async generarFaseGrupos(torneoId: string, size?: number) {
    // 0. LIMPIEZA PREVIA PARA EVITAR DUPLICADOS
    await supabaseAdmin.from("partidos").delete().eq("torneo_id", torneoId);
    
    const { data: gruposViejos } = await supabaseAdmin
      .from("grupos")
      .select("id")
      .eq("torneo_id", torneoId);
      
    if (gruposViejos && gruposViejos.length > 0) {
      const grupoIds = gruposViejos.map((g) => g.id);
      await supabaseAdmin.from("grupo_parejas").delete().in("grupo_id", grupoIds);
    }
    await supabaseAdmin.from("grupos").delete().eq("torneo_id", torneoId);

    // 1. OBTENER INSCRIPCIONES
    const { data: todasInscripciones, error: errInsc } = await supabaseAdmin
      .from("inscripciones")
      .select(
        `
        id, 
        usuario_id, 
        usuario2_id,
        estado_pago,
        perfiles!fk_inscripciones_usuario (lugar_residencia),
        perfiles_jugador2:perfiles!inscripciones_usuario2_id_fkey (lugar_residencia)
      `,
      )
      .eq("torneo_id", torneoId);

    if (errInsc || !todasInscripciones || todasInscripciones.length < 3) {
      throw new Error(
        "No hay suficientes parejas para armar un torneo.",
      );
    }

    const pendientes = todasInscripciones.filter(
      (i) => i.estado_pago !== FAP_ESTADOS_PAGO.CONFIRMADO,
    );
    if (pendientes.length > 0) {
      throw new Error(
        `Hay ${pendientes.length} inscripciones pendientes de pago. Todos los inscritos deben estar confirmados/aprobados para generar las zonas.`,
      );
    }

    const inscripciones = todasInscripciones;



    if (inscripciones.length % 2 !== 0) {
      throw new Error(
        `La cantidad de participantes confirmados debe ser un número par. Actualmente hay ${inscripciones.length} inscritos confirmados.`
      );
    }

    // 2. CALCULAR RANKING POR PAREJA (Suma de puntos de ambos jugadores)
    const parejas: ParejaRanking[] = await Promise.all(
      inscripciones.map(async (ins) => {
        // En un sistema ideal, harías un JOIN directo en SQL. Lo simplificamos para el algoritmo.
        const ids = ins.usuario2_id
          ? [ins.usuario_id, ins.usuario2_id]
          : [ins.usuario_id];

        const { data: rankings } = await supabaseAdmin
          .from("rankings")
          .select("puntos")
          .in("usuario_id", ids);

        const puntosTotales =
          rankings?.reduce((acc, curr) => acc + (curr.puntos || 0), 0) || 0;

        // Extraemos los clubes/instituciones para la regla de cruces
        const clubes = [
          (ins.perfiles as any)?.lugar_residencia,
          (ins.perfiles_jugador2 as any)?.lugar_residencia,
        ].filter(Boolean);

        return { inscripcionId: ins.id, puntosTotales, clubes };
      }),
    );

    // Ordenamos de mayor a menor ranking (Pareja 1 es la mejor rankeada)
    parejas.sort((a, b) => b.puntosTotales - a.puntosTotales);

    // 3. CALCULAR CANTIDAD DE ZONAS Y CAPACIDADES SEGÚN REGLAMENTO OFICIAL FAP/APA (SUMA TOTAL = totalParejas)
    const totalParejas = parejas.length;
    const S = Number(size) === 4 ? 4 : 3; // Forzamos a que sea únicamente 3 o 4 por reglamento FAP/APA

    const getZonasFAP = (total: number, preferredSize: number): number[] => {
      if (total < 3) return [total];
      if (preferredSize === 3) {
        const mod = total % 3;
        if (mod === 0) return Array(total / 3).fill(3);
        if (mod === 1) {
          const count3 = Math.floor((total - 4) / 3);
          if (count3 >= 0) return [...Array(count3).fill(3), 4];
        }
        if (mod === 2) {
          const count3 = Math.floor((total - 8) / 3);
          if (count3 >= 0) return [...Array(count3).fill(3), 4, 4];
        }
        if (total === 5) return [3, 2];
        if (total === 4) return [4];
      } else {
        const mod = total % 4;
        if (mod === 0) return Array(total / 4).fill(4);
        if (mod === 1) {
          const count4 = Math.floor((total - 9) / 4);
          if (count4 >= 0) return [...Array(count4).fill(4), 3, 3, 3];
        }
        if (mod === 2) {
          const count4 = Math.floor((total - 6) / 4);
          if (count4 >= 0) return [...Array(count4).fill(4), 3, 3];
        }
        if (mod === 3) {
          const count4 = Math.floor((total - 3) / 4);
          if (count4 >= 0) return [...Array(count4).fill(4), 3];
        }
        if (total === 5) return [3, 2];
        if (total === 3) return [3];
      }
      const count = Math.max(1, Math.floor(total / preferredSize));
      const baseCap = Math.floor(total / count);
      const remainder = total % count;
      return Array.from({ length: count }).map((_, idx) => idx < remainder ? baseCap + 1 : baseCap);
    };

    const capacidadesZonas = getZonasFAP(totalParejas, S);
    const cantidadZonas = capacidadesZonas.length;

    const zonas: Zona[] = capacidadesZonas.map((capacidad, index) => ({
      nombre: `Zona ${String.fromCharCode(65 + index)}`, // Convierte 0 -> A, 1 -> B
      capacidad,
      parejas: [],
    }));

    // 4. DISTRIBUCIÓN SERPIENTE (SNAKE DRAFT) CON TOPE DE CAPACIDAD Y RESGUARDO DE BUCLE INFINITO
    let zonaActual = 0;
    let direccion = 1;

    for (const pareja of parejas) {
      // Buscar la siguiente zona que tenga espacio
      let attempts = 0;
      while (
        zonas[zonaActual].parejas.length >= zonas[zonaActual].capacidad &&
        attempts < cantidadZonas * 2
      ) {
        zonaActual += direccion;
        if (zonaActual >= cantidadZonas) {
          zonaActual = cantidadZonas - 1;
          direccion = -1;
        } else if (zonaActual < 0) {
          zonaActual = 0;
          direccion = 1;
        }
        attempts++;
      }

      // Si por alguna anomalía se agotaron todas las capacidades de las zonas, forzamos inserción en la zona actual
      zonas[zonaActual].parejas.push(pareja);

      // Lógica de movimiento Serpiente tradicional (1..N, N..1)
      zonaActual += direccion;
      if (zonaActual >= cantidadZonas) {
        zonaActual = cantidadZonas - 1;
        direccion = -1; // Rebota hacia arriba
      } else if (zonaActual < 0) {
        zonaActual = 0;
        direccion = 1; // Rebota hacia abajo
      }
    }

    // 5. PERSISTENCIA EN BASE DE DATOS
    for (const zona of zonas) {
      // Crear el Grupo
      const { data: grupoInsertado } = await supabaseAdmin
        .from("grupos")
        .insert({ torneo_id: torneoId, nombre_grupo: zona.nombre })
        .select()
        .single();

      if (!grupoInsertado) continue;

      const p = zona.parejas;

      // Insertar en grupo_parejas
      const grupoParejasData = p.map((pareja, idx) => ({
        grupo_id: grupoInsertado.id,
        inscripcion_id: pareja.inscripcionId,
        seed: idx + 1,
      }));
      if (grupoParejasData.length > 0) {
        await supabaseAdmin.from("grupo_parejas").insert(grupoParejasData);
      }

      // Generar Partidos según la cantidad de parejas en la zona
      const partidos = [];

      if (zona.capacidad === 3 && p.length === 3) {
        // ZONA DE 3: Todos contra todos
        partidos.push({
          torneo_id: torneoId,
          ronda: zona.nombre,
          orden: 1,
          equipo_a_id: p[0].inscripcionId,
          equipo_b_id: p[1].inscripcionId,
        }); // 1 vs 2
        partidos.push({
          torneo_id: torneoId,
          ronda: zona.nombre,
          orden: 2,
          equipo_a_id: p[1].inscripcionId,
          equipo_b_id: p[2].inscripcionId,
        }); // 2 vs 3
        partidos.push({
          torneo_id: torneoId,
          ronda: zona.nombre,
          orden: 3,
          equipo_a_id: p[0].inscripcionId,
          equipo_b_id: p[2].inscripcionId,
        }); // 1 vs 3
      } else if (zona.capacidad === 4 && p.length === 4) {
        // ZONA DE 4 (Regla FAP: Mayor vs Menor / Medio vs Medio)
        partidos.push({
          torneo_id: torneoId,
          ronda: zona.nombre,
          orden: 1,
          equipo_a_id: p[0].inscripcionId,
          equipo_b_id: p[3].inscripcionId,
        }); // 1 vs 4
        partidos.push({
          torneo_id: torneoId,
          ronda: zona.nombre,
          orden: 2,
          equipo_a_id: p[1].inscripcionId,
          equipo_b_id: p[2].inscripcionId,
        }); // 2 vs 3

        // Los siguientes partidos de la zona de 4 dependen de los ganadores,
        // se insertan como "por definir" (TBD - To Be Determined)
        partidos.push({
          torneo_id: torneoId,
          ronda: zona.nombre,
          orden: 3,
          estado_partido: "Pendiente Ganadores",
        }); // G1 vs G2
        partidos.push({
          torneo_id: torneoId,
          ronda: zona.nombre,
          orden: 4,
          estado_partido: "Pendiente Perdedores",
        }); // P1 vs P2
      } else {
        // Fallback genérico: Todos contra todos (Round Robin) para cualquier otro tamaño
        let orden = 1;
        for (let i = 0; i < p.length; i++) {
          for (let j = i + 1; j < p.length; j++) {
            partidos.push({
              torneo_id: torneoId,
              ronda: zona.nombre,
              orden: orden++,
              equipo_a_id: p[i].inscripcionId,
              equipo_b_id: p[j].inscripcionId,
            });
          }
        }
      }

      if (partidos.length > 0) {
        await supabaseAdmin.from("partidos").insert(partidos);
      }
    }

    // 6. GENERAR PARTIDOS DE PLAYOFF EN BLANCO (LLAVES)
    const roundsConfig = [
      { name: "OCTAVOS", matches: 8 },
      { name: "CUARTOS", matches: 4 },
      { name: "SEMIS", matches: 2 },
      { name: "FINAL", matches: 1 },
    ];
    
    const getPlayoffSize = (zonasCount: number): number => {
      if (zonasCount <= 1) return 2;
      if (zonasCount === 2 || zonasCount === 3) return 4;
      if (zonasCount >= 4 && zonasCount <= 6) return 8;
      if (zonasCount >= 7 && zonasCount <= 12) return 16;
      return 32;
    };
    
    // El número de jugadores que avanzan es playoffSize
    const advancingPlayers = getPlayoffSize(cantidadZonas);
    const startIndex = roundsConfig.findIndex((r) => r.matches === advancingPlayers / 2);
    
    if (startIndex !== -1) {
      const playoffPartidos = [];
      let playoffOrden = 100; // Un orden alto para que queden después de los partidos de zona
      
      for (let i = startIndex; i < roundsConfig.length; i++) {
        const round = roundsConfig[i];
        for (let j = 0; j < round.matches; j++) {
          playoffPartidos.push({
            torneo_id: torneoId,
            equipo_a_id: null,
            equipo_b_id: null,
            ronda: round.name,
            orden: playoffOrden++,
            estado_partido: "Programado",
          });
        }
      }
      
      if (playoffPartidos.length > 0) {
        await supabaseAdmin.from("partidos").insert(playoffPartidos);
      }
    }

    // Actualizamos el estado del torneo
    await supabaseAdmin
      .from("torneos")
      .update({ estado: FAP_ESTADOS_TORNEO.EN_CURSO })
      .eq("id", torneoId);

    return {
      exito: true,
      mensaje: "Zonas y cruces generados correctamente",
      zonas,
    };
  }

  /**
   * Obtiene la estructura de zonas con parejas y sus seeds.
   */
  static async obtenerZonas(torneoId: string) {
    const { data: grupos, error } = await supabaseAdmin
      .from("grupos")
      .select(
        `
        id,
        nombre_grupo,
        grupo_parejas (
          id,
          seed,
          inscripcion_id,
          inscripciones (
            id,
            jugador1_nombre,
            jugador2_nombre,
            usuario_id,
            usuario2_id
          )
        )
      `,
      )
      .eq("torneo_id", torneoId)
      .order("nombre_grupo");

    if (error) {
      throw new Error(`Error al obtener zonas: ${error.message}`);
    }

    if (!grupos) return [];

    // Obtener los ids de usuario para consultar afiliaciones activas
    const userIds: string[] = [];
    grupos.forEach((g) => {
      g.grupo_parejas?.forEach((gp: any) => {
        if (gp.inscripciones) {
          if (gp.inscripciones.usuario_id) userIds.push(gp.inscripciones.usuario_id);
          if (gp.inscripciones.usuario2_id) userIds.push(gp.inscripciones.usuario2_id);
        }
      });
    });

    const afiliacionesMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: afs } = await supabaseAdmin
        .from("afiliaciones")
        .select("usuario_id, entidad")
        .eq("estado", "activo")
        .in("usuario_id", userIds);

      afs?.forEach((a) => {
        afiliacionesMap[a.usuario_id] = a.entidad;
      });
    }

    // Mapear el nombre del club a la respuesta
    const gruposConClub = grupos.map((g) => ({
      ...g,
      grupo_parejas: (g.grupo_parejas || []).map((gp: any) => {
        const club1 = gp.inscripciones?.usuario_id ? afiliacionesMap[gp.inscripciones.usuario_id] : null;
        const club2 = gp.inscripciones?.usuario2_id ? afiliacionesMap[gp.inscripciones.usuario2_id] : null;

        let clubName = "Sin club asignado";
        if (club1 && club2) {
          clubName = `${club1} / ${club2}`;
        } else if (club1) {
          clubName = club1;
        } else if (club2) {
          clubName = club2;
        }

        return {
          ...gp,
          clubName,
        };
      }),
    }));

    return gruposConClub;
  }

  /**
   * Override administrativo: mueve una pareja de una zona a otra, guardando motivo.
   */
  static async moverPareja(
    inscripcionId: string,
    grupoOrigenId: string,
    grupoDestinoId: string,
    motivo: string,
    adminId: string,
  ) {
    // Obtener información de los grupos para saber el torneo_id y nombres de zonas
    const { data: origenGrupo } = await supabaseAdmin
      .from("grupos")
      .select("torneo_id, nombre_grupo")
      .eq("id", grupoOrigenId)
      .single();

    const { data: destinoGrupo } = await supabaseAdmin
      .from("grupos")
      .select("nombre_grupo")
      .eq("id", grupoDestinoId)
      .single();

    if (!origenGrupo || !destinoGrupo) {
      throw new Error("No se encontraron los grupos de origen o destino.");
    }

    const torneoId = origenGrupo.torneo_id;

    // 1. Eliminar de la zona original
    const { error: errDel } = await supabaseAdmin
      .from("grupo_parejas")
      .delete()
      .eq("grupo_id", grupoOrigenId)
      .eq("inscripcion_id", inscripcionId);

    if (errDel) throw new Error(`Error quitando pareja: ${errDel.message}`);

    // 2. Insertar en la zona destino
    const { error: errIns } = await supabaseAdmin.from("grupo_parejas").insert({
      grupo_id: grupoDestinoId,
      inscripcion_id: inscripcionId,
      seed: 0, // Se inserta sin seed o se recalcula si es necesario
    });

    if (errIns) throw new Error(`Error insertando pareja: ${errIns.message}`);

    // 3. Re-generar los partidos para ambos grupos afectados
    await CompetenciaService.regenerarPartidosDeGrupo(torneoId, grupoOrigenId, origenGrupo.nombre_grupo);
    await CompetenciaService.regenerarPartidosDeGrupo(torneoId, grupoDestinoId, destinoGrupo.nombre_grupo);

    // 4. Registrar auditoría
    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: "mover_pareja_zona",
      entidad_afectada: inscripcionId,
      detalles: {
        grupo_origen: grupoOrigenId,
        grupo_destino: grupoDestinoId,
        motivo: motivo,
      },
    });

    return { exito: true, mensaje: "Pareja movida exitosamente" };
  }

  /**
   * Regenera los partidos de un grupo específico a partir de las parejas actuales.
   */
  static async regenerarPartidosDeGrupo(
    torneoId: string,
    grupoId: string,
    nombreGrupo: string,
  ) {
    // 1. Eliminar partidos previos de este grupo (solo si no tienen resultados cargados)
    await supabaseAdmin
      .from("partidos")
      .delete()
      .eq("torneo_id", torneoId)
      .eq("ronda", nombreGrupo);

    // 2. Obtener parejas actuales en el grupo ordenadas por seed
    const { data: parejas } = await supabaseAdmin
      .from("grupo_parejas")
      .select("inscripcion_id, seed")
      .eq("grupo_id", grupoId)
      .order("seed", { ascending: true });

    if (!parejas || parejas.length < 2) return;

    const partidos = [];
    if (parejas.length === 3) {
      partidos.push({
        torneo_id: torneoId,
        ronda: nombreGrupo,
        orden: 1,
        equipo_a_id: parejas[0].inscripcion_id,
        equipo_b_id: parejas[1].inscripcion_id,
      });
      partidos.push({
        torneo_id: torneoId,
        ronda: nombreGrupo,
        orden: 2,
        equipo_a_id: parejas[1].inscripcion_id,
        equipo_b_id: parejas[2].inscripcion_id,
      });
      partidos.push({
        torneo_id: torneoId,
        ronda: nombreGrupo,
        orden: 3,
        equipo_a_id: parejas[0].inscripcion_id,
        equipo_b_id: parejas[2].inscripcion_id,
      });
    } else if (parejas.length === 4) {
      partidos.push({
        torneo_id: torneoId,
        ronda: nombreGrupo,
        orden: 1,
        equipo_a_id: parejas[0].inscripcion_id,
        equipo_b_id: parejas[3].inscripcion_id,
      });
      partidos.push({
        torneo_id: torneoId,
        ronda: nombreGrupo,
        orden: 2,
        equipo_a_id: parejas[1].inscripcion_id,
        equipo_b_id: parejas[2].inscripcion_id,
      });
      partidos.push({
        torneo_id: torneoId,
        ronda: nombreGrupo,
        orden: 4,
        estado_partido: "Pendiente Perdedores",
      });
    } else {
      // Fallback genérico: Todos contra todos (Round Robin) para cualquier otro tamaño
      let orden = 1;
      for (let i = 0; i < parejas.length; i++) {
        for (let j = i + 1; j < parejas.length; j++) {
          partidos.push({
            torneo_id: torneoId,
            ronda: nombreGrupo,
            orden: orden++,
            equipo_a_id: parejas[i].inscripcion_id,
            equipo_b_id: parejas[j].inscripcion_id,
          });
        }
      }
    }

    if (partidos.length > 0) {
      await supabaseAdmin.from("partidos").insert(partidos);
    }
  }

  /**
   * Guarda la disposición completa de las zonas y regenera sus respectivos fixtures.
   */
  static async guardarZonas(
    torneoId: string,
    zonas: { id: string; nombre: string; parejas: { id: string }[] }[],
    motivo: string,
    adminId: string,
  ) {
    // 1. Guardar la nueva distribución de parejas para cada zona
    for (const z of zonas) {
      // Eliminar las parejas anteriores del grupo
      const { error: errDel } = await supabaseAdmin
        .from("grupo_parejas")
        .delete()
        .eq("grupo_id", z.id);

      if (errDel) {
        throw new Error(`Error limpiando parejas de ${z.nombre}: ${errDel.message}`);
      }

      // Insertar las parejas actuales en el nuevo orden (los seeds quedan según su índice)
      const toInsert = z.parejas.map((p, idx) => ({
        grupo_id: z.id,
        inscripcion_id: p.id,
        seed: idx + 1,
      }));

      if (toInsert.length > 0) {
        const { error: errIns } = await supabaseAdmin
          .from("grupo_parejas")
          .insert(toInsert);
        if (errIns) {
          throw new Error(`Error guardando parejas en ${z.nombre}: ${errIns.message}`);
        }
      }
    }

    // 2. Regenerar los partidos para cada una de las zonas guardadas
    for (const z of zonas) {
      await CompetenciaService.regenerarPartidosDeGrupo(torneoId, z.id, z.nombre);
    }

    // 3. Registrar auditoría única
    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: "guardar_zonas_completo",
      entidad_afectada: torneoId,
      detalles: {
        zonas_actualizadas: zonas.map((z) => ({
          grupo_id: z.id,
          nombre: z.nombre,
          parejas: z.parejas.map((p) => p.id),
        })),
        motivo: motivo,
      },
    });

    return { exito: true, mensaje: "Distribución de zonas guardada exitosamente" };
  }
}

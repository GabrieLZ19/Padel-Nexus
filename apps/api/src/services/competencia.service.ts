import { supabase } from "../config/supabase";
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
  static async generarFaseGrupos(torneoId: string) {
    // 1. OBTENER INSCRIPCIONES CONFIRMADAS
    const { data: inscripciones, error: errInsc } = await supabase
      .from("inscripciones")
      .select(
        `
        id, 
        usuario_id, 
        usuario2_id,
        perfiles!fk_inscripciones_usuario (lugar_residencia),
        perfiles_jugador2:perfiles!inscripciones_usuario2_id_fkey (lugar_residencia)
      `,
      )
      .eq("torneo_id", torneoId)
      .eq("estado_pago", FAP_ESTADOS_PAGO.CONFIRMADO); // Solo armamos llaves con los que pagaron

    if (errInsc || !inscripciones || inscripciones.length < 3) {
      throw new Error(
        "No hay suficientes parejas confirmadas para armar un torneo.",
      );
    }

    // 2. CALCULAR RANKING POR PAREJA (Suma de puntos de ambos jugadores)
    const parejas: ParejaRanking[] = await Promise.all(
      inscripciones.map(async (ins) => {
        // En un sistema ideal, harías un JOIN directo en SQL. Lo simplificamos para el algoritmo.
        const ids = ins.usuario2_id
          ? [ins.usuario_id, ins.usuario2_id]
          : [ins.usuario_id];

        const { data: rankings } = await supabase
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

    // 3. CALCULAR CANTIDAD DE ZONAS Y CAPACIDADES SEGÚN REGLAMENTO
    const totalParejas = parejas.length;
    const cantidadZonas = Math.floor(totalParejas / 3);
    const resto = totalParejas % 3;

    // Regla FAP: Si sobra 1 -> Zona A es de 4. Si sobran 2 -> Zona A y B son de 4.
    const zonas: Zona[] = Array.from({ length: cantidadZonas }).map(
      (_, index) => {
        let capacidad = 3;
        if (resto === 1 && index === 0) capacidad = 4; // Zona A
        if (resto === 2 && (index === 0 || index === 1)) capacidad = 4; // Zona A y B

        return {
          nombre: `Zona ${String.fromCharCode(65 + index)}`, // Convierte 0 -> A, 1 -> B
          capacidad,
          parejas: [],
        };
      },
    );

    // 4. DISTRIBUCIÓN SERPIENTE (SNAKE DRAFT) CON TOPE DE CAPACIDAD
    let zonaActual = 0;
    let direccion = 1;

    for (const pareja of parejas) {
      // Buscar la siguiente zona que tenga espacio
      while (zonas[zonaActual].parejas.length >= zonas[zonaActual].capacidad) {
        zonaActual += direccion;
        if (zonaActual >= cantidadZonas) {
          zonaActual = cantidadZonas - 1;
          direccion = -1;
        } else if (zonaActual < 0) {
          zonaActual = 0;
          direccion = 1;
        }
      }

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
      const { data: grupoInsertado } = await supabase
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
        seed: idx + 1
      }));
      if (grupoParejasData.length > 0) {
        await supabase.from("grupo_parejas").insert(grupoParejasData);
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
      }

      if (partidos.length > 0) {
        await supabase.from("partidos").insert(partidos);
      }
    }

    // Actualizamos el estado del torneo
    await supabase
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
    const { data: grupos, error } = await supabase
      .from("grupos")
      .select(`
        id,
        nombre_grupo,
        grupo_parejas (
          id,
          seed,
          inscripcion_id,
          inscripciones (
            id,
            jugador1_nombre,
            jugador2_nombre
          )
        )
      `)
      .eq("torneo_id", torneoId)
      .order("nombre_grupo");

    if (error) {
      throw new Error(`Error al obtener zonas: ${error.message}`);
    }

    return grupos;
  }

  /**
   * Override administrativo: mueve una pareja de una zona a otra, guardando motivo.
   */
  static async moverPareja(
    inscripcionId: string,
    grupoOrigenId: string,
    grupoDestinoId: string,
    motivo: string,
    adminId: string
  ) {
    // 1. Eliminar de la zona original
    const { error: errDel } = await supabase
      .from("grupo_parejas")
      .delete()
      .eq("grupo_id", grupoOrigenId)
      .eq("inscripcion_id", inscripcionId);

    if (errDel) throw new Error(`Error quitando pareja: ${errDel.message}`);

    // 2. Insertar en la zona destino
    const { error: errIns } = await supabase
      .from("grupo_parejas")
      .insert({
        grupo_id: grupoDestinoId,
        inscripcion_id: inscripcionId,
        seed: 0 // Se inserta sin seed o se recalcula si es necesario
      });

    if (errIns) throw new Error(`Error insertando pareja: ${errIns.message}`);

    // 3. Registrar auditoría
    await supabase.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: "mover_pareja_zona",
      entidad_afectada: inscripcionId,
      detalles: {
        grupo_origen: grupoOrigenId,
        grupo_destino: grupoDestinoId,
        motivo: motivo
      }
    });

    return { exito: true, mensaje: "Pareja movida exitosamente" };
  }
}

import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { supabaseAdmin } from "../config/supabase";
import {
  MARKETPLACE_ESTADOS_ORDEN,
  MARKETPLACE_ESTADOS_VENDEDOR,
} from "../constants/marketplace";
import { MarketplaceStorageService } from "./marketplace-storage.service";
import { NotificacionService } from "./notificacion.service";

interface FiltrosProducto {
  categoria_id?: string;
  busqueda?: string;
  precio_min?: number;
  precio_max?: number;
  marca?: string;
  tipo?: "producto" | "servicio";
  orden?: "precio_asc" | "precio_desc" | "destacados" | "recientes";
  pagina?: number;
  por_pagina?: number;
}

interface ItemCarrito {
  productoId: string;
  cantidad: number;
}

interface DatosEnvio {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  notes?: string;
}

interface DatosVendedor {
  nombre_tienda: string;
  tipo: "jugador" | "club" | "entrenador" | "tienda";
  descripcion?: string;
  provincia?: string;
}

interface DatosProducto {
  categoria_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_anterior?: number;
  stock: number;
  marca?: string;
  tipo: "producto" | "servicio";
  modalidad_servicio?: string;
  ubicacion_servicio?: string;
}

const ITEMS_POR_PAGINA = 12;

export class MarketplaceService {
  static async listarCategorias() {
    const { data, error } = await supabaseAdmin
      .from("marketplace_categorias")
      .select("*")
      .order("orden", { ascending: true });

    if (error) throw new Error(`Error al listar categorías: ${error.message}`);

    const { data: conteos } = await supabaseAdmin
      .from("marketplace_productos")
      .select("categoria_id")
      .eq("activo", true);

    const conteoPorCategoria: Record<string, number> = {};
    conteos?.forEach((p) => {
      conteoPorCategoria[p.categoria_id] =
        (conteoPorCategoria[p.categoria_id] || 0) + 1;
    });

    return data.map((cat) => ({
      ...cat,
      total_productos: conteoPorCategoria[cat.id] || 0,
    }));
  }

  static async listarProductos(filtros: FiltrosProducto) {
    const pagina = filtros.pagina || 1;
    const porPagina = filtros.por_pagina || ITEMS_POR_PAGINA;
    const desde = (pagina - 1) * porPagina;
    const hasta = desde + porPagina - 1;

    let query = supabaseAdmin
      .from("marketplace_productos")
      .select(
        `
        id, nombre, precio, precio_anterior, stock, marca, thumbnail_url, imagenes, tipo, destacado, created_at,
        vendedor:marketplace_vendedores!inner(id, nombre_tienda, tipo, provincia, valoracion_promedio),
        categoria:marketplace_categorias!inner(id, nombre, slug)
      `,
        { count: "exact" },
      )
      .eq("activo", true);

    if (filtros.categoria_id) {
      query = query.eq("categoria_id", filtros.categoria_id);
    }
    if (filtros.tipo) {
      query = query.eq("tipo", filtros.tipo);
    }
    if (filtros.marca) {
      query = query.ilike("marca", filtros.marca);
    }
    if (filtros.precio_min !== undefined) {
      query = query.gte("precio", filtros.precio_min);
    }
    if (filtros.precio_max !== undefined) {
      query = query.lte("precio", filtros.precio_max);
    }
    if (filtros.busqueda) {
      query = query.or(
        `nombre.ilike.%${filtros.busqueda}%,descripcion.ilike.%${filtros.busqueda}%,marca.ilike.%${filtros.busqueda}%`,
      );
    }

    switch (filtros.orden) {
      case "precio_asc":
        query = query.order("precio", { ascending: true });
        break;
      case "precio_desc":
        query = query.order("precio", { ascending: false });
        break;
      case "recientes":
        query = query.order("created_at", { ascending: false });
        break;
      case "destacados":
      default:
        query = query
          .order("destacado", { ascending: false })
          .order("created_at", { ascending: false });
        break;
    }

    query = query.range(desde, hasta);

    const { data, error, count } = await query;

    if (error)
      throw new Error(`Error al listar productos: ${error.message}`);

    return {
      productos: data || [],
      total: count || 0,
      pagina,
      por_pagina: porPagina,
      total_paginas: Math.ceil((count || 0) / porPagina),
    };
  }

  static async obtenerProducto(productoId: string) {
    const { data: producto, error } = await supabaseAdmin
      .from("marketplace_productos")
      .select(
        `
        *,
        vendedor:marketplace_vendedores!inner(id, usuario_id, nombre_tienda, tipo, descripcion, logo_url, provincia, valoracion_promedio, total_ventas),
        categoria:marketplace_categorias!inner(id, nombre, slug)
      `,
      )
      .eq("id", productoId)
      .single();

    if (error || !producto) {
      throw new Error("Producto no encontrado.");
    }

    const { data: statsVal } = await supabaseAdmin
      .from("marketplace_valoraciones")
      .select("puntuacion")
      .eq("producto_id", productoId);

    const totalValoraciones = statsVal?.length || 0;
    const promedioValoraciones =
      totalValoraciones > 0
        ? statsVal!.reduce((sum, v) => sum + v.puntuacion, 0) /
          totalValoraciones
        : 0;

    return {
      ...producto,
      total_valoraciones: totalValoraciones,
      promedio_valoraciones: Math.round(promedioValoraciones * 10) / 10,
    };
  }

  static async listarMarcas(categoriaId?: string) {
    let query = supabaseAdmin
      .from("marketplace_productos")
      .select("marca")
      .eq("activo", true)
      .not("marca", "is", null);

    if (categoriaId) {
      query = query.eq("categoria_id", categoriaId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error al listar marcas: ${error.message}`);

    const marcasUnicas = [...new Set(data?.map((p) => p.marca).filter(Boolean))];
    return marcasUnicas.sort();
  }

  static async registrarVendedor(usuarioId: string, datos: DatosVendedor) {
    const { data: existente } = await supabaseAdmin
      .from("marketplace_vendedores")
      .select("id")
      .eq("usuario_id", usuarioId)
      .single();

    if (existente) {
      throw new Error("Ya estás registrado como vendedor.");
    }

    const { data, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .insert({
        usuario_id: usuarioId,
        nombre_tienda: datos.nombre_tienda,
        tipo: datos.tipo,
        descripcion: datos.descripcion || null,
        provincia: datos.provincia || null,
        estado: MARKETPLACE_ESTADOS_VENDEDOR.ACTIVO,
      })
      .select()
      .single();

    if (error) throw new Error(`Error al registrar vendedor: ${error.message}`);
    return data;
  }

  static async obtenerMiPerfilVendedor(usuarioId: string) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .select("*")
      .eq("usuario_id", usuarioId)
      .single();

    if (error || !data) return null;
    return data;
  }

  static async actualizarPerfilVendedor(
    usuarioId: string,
    datos: Partial<DatosVendedor> & { logo_url?: string },
  ) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .update(datos)
      .eq("usuario_id", usuarioId)
      .select()
      .single();

    if (error)
      throw new Error(`Error al actualizar perfil: ${error.message}`);
    return data;
  }

  static async listarMisProductos(vendedorId: string, pagina: number = 1) {
    const desde = (pagina - 1) * ITEMS_POR_PAGINA;
    const hasta = desde + ITEMS_POR_PAGINA - 1;

    const { data, error, count } = await supabaseAdmin
      .from("marketplace_productos")
      .select(
        `
        *,
        categoria:marketplace_categorias(nombre, slug)
      `,
        { count: "exact" },
      )
      .eq("vendedor_id", vendedorId)
      .order("created_at", { ascending: false })
      .range(desde, hasta);

    if (error)
      throw new Error(`Error al listar productos: ${error.message}`);

    return { productos: data || [], total: count || 0 };
  }

  static async crearProducto(
    vendedorId: string,
    datos: DatosProducto,
    imagenesBase64: string[] = [],
  ) {
    const { data: vendedor } = await supabaseAdmin
      .from("marketplace_vendedores")
      .select("id, estado")
      .eq("id", vendedorId)
      .single();

    if (!vendedor || vendedor.estado !== MARKETPLACE_ESTADOS_VENDEDOR.ACTIVO) {
      throw new Error(
        "Tu cuenta de vendedor no está activa. No puedes publicar productos.",
      );
    }

    const { data: producto, error } = await supabaseAdmin
      .from("marketplace_productos")
      .insert({
        vendedor_id: vendedorId,
        categoria_id: datos.categoria_id,
        nombre: datos.nombre,
        descripcion: datos.descripcion || null,
        precio: datos.precio,
        precio_anterior: datos.precio_anterior || null,
        stock: datos.stock,
        marca: datos.marca || null,
        tipo: datos.tipo,
        modalidad_servicio: datos.modalidad_servicio || null,
        ubicacion_servicio: datos.ubicacion_servicio || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Error al crear producto: ${error.message}`);

    if (imagenesBase64.length > 0) {
      try {
        const { imagenes, thumbnailUrl } =
          await MarketplaceStorageService.subirImagenes(
            vendedorId,
            producto.id,
            imagenesBase64,
          );

        await supabaseAdmin
          .from("marketplace_productos")
          .update({ imagenes, thumbnail_url: thumbnailUrl })
          .eq("id", producto.id);

        return { ...producto, imagenes, thumbnail_url: thumbnailUrl };
      } catch (imgError: any) {
        console.error("⚠️ Producto creado pero error en imágenes:", imgError.message);
        return producto;
      }
    }

    return producto;
  }

  static async editarProducto(
    vendedorId: string,
    productoId: string,
    datos: Partial<DatosProducto>,
    imagenesExistentes: string[] = [],
    imagenesNuevasBase64: string[] = [],
  ) {
    const { data: productoActual } = await supabaseAdmin
      .from("marketplace_productos")
      .select("id, vendedor_id")
      .eq("id", productoId)
      .eq("vendedor_id", vendedorId)
      .single();

    if (!productoActual) {
      throw new Error("Producto no encontrado o no tienes permiso para editarlo.");
    }

    let imagenesUpdate: Record<string, any> = {};
    if (imagenesNuevasBase64.length > 0 || imagenesExistentes.length > 0) {
      const { imagenes, thumbnailUrl } =
        await MarketplaceStorageService.actualizarImagenes(
          vendedorId,
          productoId,
          imagenesExistentes,
          imagenesNuevasBase64,
        );
      imagenesUpdate = { imagenes, thumbnail_url: thumbnailUrl };
    }

    const { data, error } = await supabaseAdmin
      .from("marketplace_productos")
      .update({ ...datos, ...imagenesUpdate })
      .eq("id", productoId)
      .select()
      .single();

    if (error) throw new Error(`Error al editar producto: ${error.message}`);
    return data;
  }

  static async desactivarProducto(vendedorId: string, productoId: string) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_productos")
      .update({ activo: false })
      .eq("id", productoId)
      .eq("vendedor_id", vendedorId)
      .select()
      .single();

    if (error)
      throw new Error(`Error al desactivar producto: ${error.message}`);
    return data;
  }

  static async listarMisVentas(vendedorId: string, pagina: number = 1) {
    const desde = (pagina - 1) * ITEMS_POR_PAGINA;
    const hasta = desde + ITEMS_POR_PAGINA - 1;

    const { data, error, count } = await supabaseAdmin
      .from("marketplace_items_orden")
      .select(
        `
        id, cantidad, precio_unitario, created_at,
        producto:marketplace_productos(nombre, thumbnail_url),
        orden:marketplace_ordenes!inner(id, estado, comprador_id, created_at,
          comprador:perfiles!marketplace_ordenes_comprador_id_fkey(nombre, apellido, email)
        )
      `,
        { count: "exact" },
      )
      .eq("vendedor_id", vendedorId)
      .order("created_at", { ascending: false })
      .range(desde, hasta);

    if (error) throw new Error(`Error al listar ventas: ${error.message}`);
    return { ventas: data || [], total: count || 0 };
  }

  static async obtenerEstadisticas(vendedorId: string) {
    const { data: vendedor } = await supabaseAdmin
      .from("marketplace_vendedores")
      .select("balance, total_ventas, valoracion_promedio")
      .eq("id", vendedorId)
      .single();

    const { count: productosActivos } = await supabaseAdmin
      .from("marketplace_productos")
      .select("id", { count: "exact", head: true })
      .eq("vendedor_id", vendedorId)
      .eq("activo", true);

    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const { data: ventasMes } = await supabaseAdmin
      .from("marketplace_items_orden")
      .select(
        "precio_unitario, cantidad, orden:marketplace_ordenes!inner(estado, created_at)",
      )
      .eq("vendedor_id", vendedorId)
      .gte(
        "marketplace_ordenes.created_at",
        hace30Dias.toISOString(),
      );

    const ingresosMes =
      ventasMes
        ?.filter((v: any) => v.orden?.estado === MARKETPLACE_ESTADOS_ORDEN.PAGADA)
        .reduce(
          (sum: number, v: any) => sum + v.precio_unitario * v.cantidad,
          0,
        ) || 0;

    return {
      balance: vendedor?.balance || 0,
      total_ventas: vendedor?.total_ventas || 0,
      valoracion_promedio: vendedor?.valoracion_promedio || 0,
      productos_activos: productosActivos || 0,
      ingresos_mes: ingresosMes,
    };
  }

  static async crearOrden(
    compradorId: string,
    items: ItemCarrito[],
    datosEnvio?: DatosEnvio,
  ) {
    const productosIds = items.map((i) => i.productoId);
    const { data: productos, error: errProd } = await supabaseAdmin
      .from("marketplace_productos")
      .select("id, nombre, precio, stock, vendedor_id, tipo, activo")
      .in("id", productosIds);

    if (errProd || !productos) {
      throw new Error("Error al obtener productos del carrito.");
    }

    const productosMap = new Map(productos.map((p) => [p.id, p]));
    let total = 0;

    for (const item of items) {
      const producto = productosMap.get(item.productoId);
      if (!producto) {
        throw new Error(`Producto ${item.productoId} no encontrado.`);
      }
      if (!producto.activo) {
        throw new Error(`El producto "${producto.nombre}" ya no está disponible.`);
      }
      if (producto.tipo === "producto" && producto.stock < item.cantidad) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`,
        );
      }
      total += producto.precio * item.cantidad;
    }

    const { data: orden, error: errOrden } = await supabaseAdmin
      .from("marketplace_ordenes")
      .insert({
        comprador_id: compradorId,
        total,
        datos_envio: datosEnvio || null,
      })
      .select()
      .single();

    if (errOrden || !orden) {
      throw new Error(`Error al crear la orden: ${errOrden?.message}`);
    }

    const itemsOrden = items.map((item) => {
      const producto = productosMap.get(item.productoId)!;
      return {
        orden_id: orden.id,
        producto_id: item.productoId,
        vendedor_id: producto.vendedor_id,
        cantidad: item.cantidad,
        precio_unitario: producto.precio,
      };
    });

    const { error: errItems } = await supabaseAdmin
      .from("marketplace_items_orden")
      .insert(itemsOrden);

    if (errItems) {
      await supabaseAdmin
        .from("marketplace_ordenes")
        .delete()
        .eq("id", orden.id);
      throw new Error(`Error al crear items de la orden: ${errItems.message}`);
    }

    for (const item of items) {
      const producto = productosMap.get(item.productoId)!;
      if (producto.tipo === "producto") {
        await supabaseAdmin
          .from("marketplace_productos")
          .update({ stock: producto.stock - item.cantidad })
          .eq("id", item.productoId);
      }
    }

    return orden;
  }

  static async crearPreferenciaMercadoPago(ordenId: string) {
    const { data: orden, error: errOrden } = await supabaseAdmin
      .from("marketplace_ordenes")
      .select(
        `
        id, total, estado,
        items:marketplace_items_orden(
          cantidad, precio_unitario,
          producto:marketplace_productos(id, nombre)
        )
      `,
      )
      .eq("id", ordenId)
      .single();

    if (errOrden || !orden) {
      throw new Error("Orden no encontrada.");
    }

    if (orden.estado !== MARKETPLACE_ESTADOS_ORDEN.PENDIENTE) {
      throw new Error("Esta orden ya fue procesada.");
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!token || token === "TEST") {
      console.warn("⚠️ MP Access Token no configurado. Simulando checkout.");
      const mockUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/marketplace/checkout?payment=success&orden_id=${ordenId}`;
      return {
        preferenceId: "mock-marketplace-pref",
        initPoint: mockUrl,
        sandboxInitPoint: mockUrl,
      };
    }

    const mpClient = new MercadoPagoConfig({ accessToken: token });
    const preference = new Preference(mpClient);

    const baseUrl =
      process.env.FRONTEND_URL || "http://localhost:3000";
    const backendUrl =
      process.env.BACKEND_URL || "http://localhost:4000";

    const mpItems = (orden as any).items.map((item: any) => ({
      id: item.producto?.id || "producto",
      title: item.producto?.nombre || "Producto Padel Nexus",
      quantity: item.cantidad,
      unit_price: Number(item.precio_unitario),
      currency_id: "ARS",
    }));

    const response = await preference.create({
      body: {
        items: mpItems,
        back_urls: {
          success: `${baseUrl}/marketplace/checkout?payment=success&orden_id=${ordenId}`,
          failure: `${baseUrl}/marketplace/checkout?payment=failure&orden_id=${ordenId}`,
          pending: `${baseUrl}/marketplace/checkout?payment=pending&orden_id=${ordenId}`,
        },
        auto_return: baseUrl.startsWith("https://") ? "approved" : undefined,
        external_reference: ordenId,
        notification_url: `${backendUrl}/api/marketplace/webhook/mercadopago`,
      },
    });

    await supabaseAdmin
      .from("marketplace_ordenes")
      .update({ mp_preference_id: response.id })
      .eq("id", ordenId);

    return {
      preferenceId: response.id,
      initPoint:
        token.startsWith("TEST-")
          ? response.sandbox_init_point
          : response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
    };
  }

  static async confirmarPagoOrden(
    ordenId: string,
    mpPaymentId: string,
  ) {
    const { data: orden, error: errOrden } = await supabaseAdmin
      .from("marketplace_ordenes")
      .update({
        estado: MARKETPLACE_ESTADOS_ORDEN.PAGADA,
        mp_payment_id: mpPaymentId,
      })
      .eq("id", ordenId)
      .eq("estado", MARKETPLACE_ESTADOS_ORDEN.PENDIENTE)
      .select()
      .single();

    if (errOrden || !orden) {
      console.error("⚠️ Orden no encontrada o ya procesada:", ordenId);
      return null;
    }

    const { data: items } = await supabaseAdmin
      .from("marketplace_items_orden")
      .select("vendedor_id, cantidad, precio_unitario")
      .eq("orden_id", ordenId);

    if (items) {
      const montosPorVendedor: Record<string, number> = {};
      items.forEach((item) => {
        const monto = item.precio_unitario * item.cantidad;
        montosPorVendedor[item.vendedor_id] =
          (montosPorVendedor[item.vendedor_id] || 0) + monto;
      });

      for (const [vendedorId, monto] of Object.entries(montosPorVendedor)) {
        const { data: vendedor } = await supabaseAdmin
          .from("marketplace_vendedores")
          .select("balance, total_ventas")
          .eq("id", vendedorId)
          .single();

        if (vendedor) {
          await supabaseAdmin
            .from("marketplace_vendedores")
            .update({
              balance: Number(vendedor.balance) + monto,
              total_ventas: vendedor.total_ventas + 1,
            })
            .eq("id", vendedorId);
        }
      }
    }

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: orden.comprador_id,
      accion: "PAGO_MARKETPLACE",
      entidad_afectada: `marketplace_ordenes_id: ${ordenId}`,
      detalles: {
        monto: orden.total,
        mp_payment_id: mpPaymentId,
        fecha_pago: new Date().toISOString(),
      },
    });

    try {
      await NotificacionService.crearNotificacion({
        usuario_id: orden.comprador_id,
        titulo: "¡Compra confirmada!",
        mensaje: `Tu compra por $${orden.total} en el Marketplace ha sido confirmada.`,
        tipo: "success",
      });
    } catch (err) {
      console.error("Error al notificar compra:", err);
    }

    return orden;
  }

  static async listarMisOrdenes(compradorId: string, pagina: number = 1) {
    const desde = (pagina - 1) * ITEMS_POR_PAGINA;
    const hasta = desde + ITEMS_POR_PAGINA - 1;

    const { data, error, count } = await supabaseAdmin
      .from("marketplace_ordenes")
      .select(
        `
        id, total, estado, created_at, mp_payment_id,
        items:marketplace_items_orden(
          id, cantidad, precio_unitario,
          producto:marketplace_productos(id, nombre, thumbnail_url)
        )
      `,
        { count: "exact" },
      )
      .eq("comprador_id", compradorId)
      .order("created_at", { ascending: false })
      .range(desde, hasta);

    if (error) throw new Error(`Error al listar órdenes: ${error.message}`);
    return { ordenes: data || [], total: count || 0 };
  }

  static async obtenerOrden(ordenId: string, compradorId: string) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_ordenes")
      .select(
        `
        *,
        items:marketplace_items_orden(
          id, cantidad, precio_unitario,
          producto:marketplace_productos(id, nombre, thumbnail_url, imagenes),
          vendedor:marketplace_vendedores(id, nombre_tienda)
        )
      `,
      )
      .eq("id", ordenId)
      .eq("comprador_id", compradorId)
      .single();

    if (error || !data) throw new Error("Orden no encontrada.");
    return data;
  }

  static async crearValoracion(
    compradorId: string,
    productoId: string,
    ordenId: string,
    puntuacion: number,
    comentario?: string,
  ) {
    const { data: orden } = await supabaseAdmin
      .from("marketplace_ordenes")
      .select("id, estado, comprador_id")
      .eq("id", ordenId)
      .eq("comprador_id", compradorId)
      .eq("estado", MARKETPLACE_ESTADOS_ORDEN.PAGADA)
      .single();

    if (!orden) {
      throw new Error(
        "Solo puedes valorar productos de órdenes pagadas que te pertenezcan.",
      );
    }

    const { data: itemOrden } = await supabaseAdmin
      .from("marketplace_items_orden")
      .select("id")
      .eq("orden_id", ordenId)
      .eq("producto_id", productoId)
      .single();

    if (!itemOrden) {
      throw new Error("Este producto no pertenece a la orden especificada.");
    }

    const { data, error } = await supabaseAdmin
      .from("marketplace_valoraciones")
      .insert({
        producto_id: productoId,
        comprador_id: compradorId,
        orden_id: ordenId,
        puntuacion,
        comentario: comentario || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ya has valorado este producto en esta orden.");
      }
      throw new Error(`Error al crear valoración: ${error.message}`);
    }

    const { data: producto } = await supabaseAdmin
      .from("marketplace_productos")
      .select("vendedor_id")
      .eq("id", productoId)
      .single();

    if (producto) {
      await this.recalcularPromedioVendedor(producto.vendedor_id);
    }

    return data;
  }

  static async listarValoraciones(productoId: string, pagina: number = 1) {
    const desde = (pagina - 1) * 10;
    const hasta = desde + 9;

    const { data, error, count } = await supabaseAdmin
      .from("marketplace_valoraciones")
      .select(
        `
        id, puntuacion, comentario, created_at,
        comprador:perfiles!marketplace_valoraciones_comprador_id_fkey(nombre, apellido, avatar_url)
      `,
        { count: "exact" },
      )
      .eq("producto_id", productoId)
      .order("created_at", { ascending: false })
      .range(desde, hasta);

    if (error)
      throw new Error(`Error al listar valoraciones: ${error.message}`);
    return { valoraciones: data || [], total: count || 0 };
  }

  private static async recalcularPromedioVendedor(vendedorId: string) {
    const { data: productos } = await supabaseAdmin
      .from("marketplace_productos")
      .select("id")
      .eq("vendedor_id", vendedorId);

    if (!productos || productos.length === 0) return;

    const productoIds = productos.map((p) => p.id);

    const { data: valoraciones } = await supabaseAdmin
      .from("marketplace_valoraciones")
      .select("puntuacion")
      .in("producto_id", productoIds);

    const promedio =
      valoraciones && valoraciones.length > 0
        ? valoraciones.reduce((sum, v) => sum + v.puntuacion, 0) /
          valoraciones.length
        : 0;

    await supabaseAdmin
      .from("marketplace_vendedores")
      .update({ valoracion_promedio: Math.round(promedio * 10) / 10 })
      .eq("id", vendedorId);
  }

  static async toggleFavorito(usuarioId: string, productoId: string) {
    const { data: existente } = await supabaseAdmin
      .from("marketplace_favoritos")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("producto_id", productoId)
      .single();

    if (existente) {
      await supabaseAdmin
        .from("marketplace_favoritos")
        .delete()
        .eq("id", existente.id);
      return { favorito: false };
    }

    await supabaseAdmin.from("marketplace_favoritos").insert({
      usuario_id: usuarioId,
      producto_id: productoId,
    });

    return { favorito: true };
  }

  static async listarFavoritos(usuarioId: string) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_favoritos")
      .select(
        `
        id, created_at,
        producto:marketplace_productos!inner(
          id, nombre, precio, precio_anterior, thumbnail_url, marca, tipo, activo,
          vendedor:marketplace_vendedores(nombre_tienda)
        )
      `,
      )
      .eq("usuario_id", usuarioId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Error al listar favoritos: ${error.message}`);
    return data || [];
  }

  static async esFavorito(usuarioId: string, productoId: string) {
    const { data } = await supabaseAdmin
      .from("marketplace_favoritos")
      .select("id")
      .eq("usuario_id", usuarioId)
      .eq("producto_id", productoId)
      .single();

    return { es_favorito: !!data };
  }

  static async listarVendedores(filtroEstado?: string) {
    let query = supabaseAdmin
      .from("marketplace_vendedores")
      .select(
        `
        *,
        usuario:perfiles!marketplace_vendedores_usuario_id_fkey(nombre, apellido, email, avatar_url)
      `,
      )
      .order("created_at", { ascending: false });

    if (filtroEstado) {
      query = query.eq("estado", filtroEstado);
    }

    const { data, error } = await query;
    if (error)
      throw new Error(`Error al listar vendedores: ${error.message}`);
    return data || [];
  }

  static async suspenderVendedor(
    vendedorId: string,
    adminId: string,
    motivo: string,
  ) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .update({ estado: MARKETPLACE_ESTADOS_VENDEDOR.SUSPENDIDO })
      .eq("id", vendedorId)
      .select()
      .single();

    if (error)
      throw new Error(`Error al suspender vendedor: ${error.message}`);

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: "SUSPENDER_VENDEDOR_MARKETPLACE",
      entidad_afectada: `marketplace_vendedores_id: ${vendedorId}`,
      detalles: { motivo, fecha: new Date().toISOString() },
    });

    return data;
  }

  static async reactivarVendedor(vendedorId: string, adminId: string) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .update({ estado: MARKETPLACE_ESTADOS_VENDEDOR.ACTIVO })
      .eq("id", vendedorId)
      .select()
      .single();

    if (error)
      throw new Error(`Error al reactivar vendedor: ${error.message}`);

    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: adminId,
      accion: "REACTIVAR_VENDEDOR_MARKETPLACE",
      entidad_afectada: `marketplace_vendedores_id: ${vendedorId}`,
      detalles: { fecha: new Date().toISOString() },
    });

    return data;
  }
}

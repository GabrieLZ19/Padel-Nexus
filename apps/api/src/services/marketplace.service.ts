import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { supabaseAdmin } from "../config/supabase";
import {
  buildMercadoPagoBackUrls,
  getMercadoPagoAccessToken,
  isMercadoPagoConfigured,
  resolveMercadoPagoInitPoint,
} from "../config/mercadopago";
import {
  MARKETPLACE_ESTADOS_ORDEN,
  MARKETPLACE_ESTADOS_VENDEDOR,
  type AudienciaPromocion,
  type EntidadMarketplaceTipo,
} from "../constants/marketplace";
import { MarketplaceStorageService } from "./marketplace-storage.service";
import { NotificacionService } from "./notificacion.service";
import {
  MarketplaceEntityAuthService,
  type EntidadMarketplaceRef,
} from "./marketplace-entity-auth.service";

interface FiltrosProducto {
  categoria_id?: string;
  vendedor_id?: string;
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
  tipo: EntidadMarketplaceTipo;
  descripcion?: string;
  provincia?: string;
}

interface DatosTiendaEntidad extends DatosVendedor {
  entidad_tipo: EntidadMarketplaceTipo;
  entidad_id: string;
  logo_base64?: string;
}

interface DatosProducto {
  categoria_id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  precio_anterior?: number | null;
  stock: number;
  marca?: string;
  tipo: "producto" | "servicio";
  modalidad_servicio?: string;
  ubicacion_servicio?: string;
}

function pickDatosProductoUpdate(
  datos: Partial<DatosProducto> & Record<string, unknown>,
): Partial<DatosProducto> {
  const payload: Partial<DatosProducto> = {};
  if (datos.categoria_id !== undefined) payload.categoria_id = datos.categoria_id;
  if (datos.nombre !== undefined) payload.nombre = datos.nombre;
  if (datos.descripcion !== undefined) payload.descripcion = datos.descripcion;
  if (datos.precio !== undefined) payload.precio = datos.precio;
  if (datos.precio_anterior !== undefined) {
    payload.precio_anterior = datos.precio_anterior ?? null;
  }
  if (datos.stock !== undefined) payload.stock = datos.stock;
  if (datos.marca !== undefined) payload.marca = datos.marca;
  if (datos.tipo !== undefined) payload.tipo = datos.tipo;
  if (datos.modalidad_servicio !== undefined) {
    payload.modalidad_servicio = datos.modalidad_servicio;
  }
  if (datos.ubicacion_servicio !== undefined) {
    payload.ubicacion_servicio = datos.ubicacion_servicio;
  }
  return payload;
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

    const { data: vendedoresActivos } = await supabaseAdmin
      .from("marketplace_vendedores")
      .select("id")
      .eq("estado", MARKETPLACE_ESTADOS_VENDEDOR.ACTIVO)
      .not("entidad_id", "is", null);

    const vendedorIds = vendedoresActivos?.map((v) => v.id) || [];
    if (vendedorIds.length === 0) {
      return {
        productos: [],
        total: 0,
        pagina,
        por_pagina: porPagina,
        total_paginas: 0,
      };
    }

    let query = supabaseAdmin
      .from("marketplace_productos")
      .select(
        `
        id, nombre, precio, precio_anterior, stock, marca, thumbnail_url, imagenes, tipo, destacado, created_at,
        vendedor:marketplace_vendedores!inner(
          id, nombre_tienda, tipo, provincia, valoracion_promedio,
          entidad_tipo, entidad_id, logo_url
        ),
        categoria:marketplace_categorias!inner(id, nombre, slug)
      `,
        { count: "exact" },
      )
      .eq("activo", true)
      .in("vendedor_id", vendedorIds);

    if (filtros.categoria_id) {
      query = query.eq("categoria_id", filtros.categoria_id);
    }
    if (filtros.vendedor_id) {
      query = query.eq("vendedor_id", filtros.vendedor_id);
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

  static async registrarTiendaEntidad(
    usuarioId: string,
    rol: string | undefined,
    datos: DatosTiendaEntidad,
  ) {
    const ref: EntidadMarketplaceRef = {
      entidad_tipo: datos.entidad_tipo,
      entidad_id: datos.entidad_id,
    };

    await MarketplaceEntityAuthService.verificarAccesoEntidad(
      usuarioId,
      rol,
      ref,
    );

    const { data: existente } = await supabaseAdmin
      .from("marketplace_vendedores")
      .select("id")
      .eq("entidad_tipo", datos.entidad_tipo)
      .eq("entidad_id", datos.entidad_id)
      .maybeSingle();

    if (existente) {
      throw new Error("Esta entidad ya tiene una tienda registrada.");
    }

    const nombreEntidad =
      await MarketplaceEntityAuthService.obtenerNombreEntidad(ref);

    const { data, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .insert({
        usuario_id: usuarioId,
        creado_por: usuarioId,
        entidad_tipo: datos.entidad_tipo,
        entidad_id: datos.entidad_id,
        nombre_tienda: datos.nombre_tienda || nombreEntidad,
        tipo: datos.entidad_tipo,
        descripcion: datos.descripcion || null,
        provincia: datos.provincia || null,
        estado: MARKETPLACE_ESTADOS_VENDEDOR.ACTIVO,
      })
      .select()
      .single();

    if (error) throw new Error(`Error al registrar tienda: ${error.message}`);

    if (datos.logo_base64) {
      const logoUrl = await MarketplaceStorageService.subirLogoTienda(
        data.id,
        datos.logo_base64,
      );
      const { data: actualizada } = await supabaseAdmin
        .from("marketplace_vendedores")
        .update({ logo_url: logoUrl })
        .eq("id", data.id)
        .select()
        .single();
      return actualizada || data;
    }

    return data;
  }

  static async obtenerTiendaEntidad(ref: EntidadMarketplaceRef) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .select("*")
      .eq("entidad_tipo", ref.entidad_tipo)
      .eq("entidad_id", ref.entidad_id)
      .maybeSingle();

    if (error) throw new Error(`Error al obtener tienda: ${error.message}`);
    return data;
  }

  static async assertGestionTiendaEntidad(
    usuarioId: string,
    rol: string | undefined,
    ref: EntidadMarketplaceRef,
  ) {
    await MarketplaceEntityAuthService.verificarAccesoEntidad(
      usuarioId,
      rol,
      ref,
    );

    const tienda = await this.obtenerTiendaEntidad(ref);
    if (!tienda) {
      throw new Error(
        "La entidad no tiene tienda activa. Registrala desde el módulo Marketplace.",
      );
    }
    if (tienda.estado !== MARKETPLACE_ESTADOS_VENDEDOR.ACTIVO) {
      throw new Error("La tienda de esta entidad está suspendida.");
    }
    return tienda;
  }

  /** @deprecated Registro libre de usuarios — usar registrarTiendaEntidad */
  static async registrarVendedor(usuarioId: string, _datos: DatosVendedor) {
    void usuarioId;
    throw new Error(
      "El registro de vendedores individuales fue deshabilitado. Solo entidades pueden vender desde el CRM.",
    );
  }

  /** @deprecated Usar obtenerTiendaEntidad */
  static async obtenerMiPerfilVendedor(_usuarioId: string) {
    return null;
  }

  static async actualizarTiendaEntidad(
    usuarioId: string,
    rol: string | undefined,
    ref: EntidadMarketplaceRef,
    datos: Partial<DatosVendedor> & { logo_url?: string; logo_base64?: string },
  ) {
    const tienda = await this.assertGestionTiendaEntidad(usuarioId, rol, ref);

    const { logo_base64, ...rest } = datos;
    const updatePayload: Record<string, unknown> = { ...rest };

    if (logo_base64) {
      updatePayload.logo_url = await MarketplaceStorageService.subirLogoTienda(
        tienda.id,
        logo_base64,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .update(updatePayload)
      .eq("id", tienda.id)
      .select()
      .single();

    if (error)
      throw new Error(`Error al actualizar tienda: ${error.message}`);
    return data;
  }

  /** @deprecated */
  static async actualizarPerfilVendedor(
    _usuarioId: string,
    _datos: Partial<DatosVendedor> & { logo_url?: string },
  ) {
    throw new Error(
      "La gestión de tienda se realiza desde el módulo Marketplace del CRM.",
    );
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

    let imagenesUpdate: Record<string, unknown> = {};
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

    const updatePayload = pickDatosProductoUpdate(
      datos as Partial<DatosProducto> & Record<string, unknown>,
    );

    const { data, error } = await supabaseAdmin
      .from("marketplace_productos")
      .update({ ...updatePayload, ...imagenesUpdate })
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

  static async activarProducto(vendedorId: string, productoId: string) {
    const { data, error } = await supabaseAdmin
      .from("marketplace_productos")
      .update({ activo: true })
      .eq("id", productoId)
      .eq("vendedor_id", vendedorId)
      .select()
      .single();

    if (error)
      throw new Error(`Error al activar producto: ${error.message}`);
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

  static async crearPreferenciaMercadoPago(
    ordenId: string,
    options?: { mobile?: boolean },
  ) {
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

    const token = getMercadoPagoAccessToken();

    if (!isMercadoPagoConfigured()) {
      console.warn(
        "⚠️ MP Access Token no configurado. Simulando checkout (confirmación inmediata).",
      );
      const mockPaymentId = `mock-mp-${Date.now()}`;
      await MarketplaceService.confirmarPagoOrden(ordenId, mockPaymentId);
      return {
        preferenceId: "mock-marketplace-pref",
        initPoint: null,
        sandboxInitPoint: null,
        mockConfirmed: true,
        paymentId: mockPaymentId,
      };
    }

    const mpClient = new MercadoPagoConfig({ accessToken: token! });
    const preference = new Preference(mpClient);

    const backendUrl =
      process.env.BACKEND_URL || "http://localhost:4000";

    const backUrls = buildMercadoPagoBackUrls({
      mobile: options?.mobile,
      webPath: "/marketplace/checkout",
      mobileParams: { orden_id: ordenId },
    });

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
        back_urls: backUrls,
        auto_return: backUrls.success.startsWith("https://")
          ? "approved"
          : undefined,
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
      initPoint: resolveMercadoPagoInitPoint(
        token!,
        response.init_point,
        response.sandbox_init_point,
      ),
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

      const { data: itemsVendedor } = await supabaseAdmin
        .from("marketplace_items_orden")
        .select("vendedor_id")
        .eq("orden_id", ordenId);

      const vendedorIds = [
        ...new Set((itemsVendedor || []).map((i) => i.vendedor_id)),
      ];

      for (const vendedorId of vendedorIds) {
        const { data: vendedor } = await supabaseAdmin
          .from("marketplace_vendedores")
          .select("id, usuario_id, creado_por, entidad_tipo, entidad_id, nombre_tienda")
          .eq("id", vendedorId)
          .single();

        if (!vendedor) continue;

        const contactoId =
          await MarketplaceEntityAuthService.resolverContactoVendedor(vendedor);

        if (contactoId) {
          await NotificacionService.crearNotificacion({
            usuario_id: contactoId,
            titulo: "Nueva venta en tu tienda",
            mensaje: `Recibiste una nueva compra en ${vendedor.nombre_tienda}. Revisá el módulo Marketplace.`,
            tipo: "info",
          });
        }
      }
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
      .select("*")
      .not("entidad_id", "is", null)
      .order("created_at", { ascending: false });

    if (filtroEstado) {
      query = query.eq("estado", filtroEstado);
    }

    const { data, error } = await query;
    if (error)
      throw new Error(`Error al listar tiendas: ${error.message}`);

    const tiendas = data || [];
    const enriquecidas = await Promise.all(
      tiendas.map(async (tienda) => {
        let entidad_nombre: string | null = null;
        if (tienda.entidad_tipo && tienda.entidad_id) {
          entidad_nombre = await MarketplaceEntityAuthService.obtenerNombreEntidad(
            {
              entidad_tipo: tienda.entidad_tipo as EntidadMarketplaceTipo,
              entidad_id: tienda.entidad_id,
            },
          );
        }
        return { ...tienda, entidad_nombre };
      }),
    );

    return enriquecidas;
  }

  static async listarEntidadesParaMarketplace(
    usuarioId: string,
    rol: string | undefined,
  ) {
    if (!MarketplaceEntityAuthService.puedeGestionarMarketplace(rol)) {
      throw new Error("No tenés permisos para gestionar marketplace.");
    }

    if (rol === "admin_club") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("club_id, clubes:clubes!perfiles_club_id_fkey(id, nombre, provincia)")
        .eq("id", usuarioId)
        .single();

      if (!perfil?.club_id) return { clubes: [], asociaciones: [], federaciones: [] };

      const clubRaw = perfil.clubes as
        | { id: string; nombre: string; provincia?: string }
        | { id: string; nombre: string; provincia?: string }[]
        | null;
      const club = Array.isArray(clubRaw) ? clubRaw[0] : clubRaw;
      return {
        clubes: club ? [club] : [],
        asociaciones: [],
        federaciones: [],
      };
    }

    const [clubes, asociaciones, federaciones] = await Promise.all([
      supabaseAdmin.from("clubes").select("id, nombre, provincia").order("nombre"),
      supabaseAdmin.from("asociaciones").select("id, nombre, sigla, provincia").order("nombre"),
      supabaseAdmin.from("federaciones").select("id, nombre, sigla").order("nombre"),
    ]);

    return {
      clubes: clubes.data || [],
      asociaciones: asociaciones.data || [],
      federaciones: federaciones.data || [],
    };
  }

  static async enviarPromocionEntidad(
    usuarioId: string,
    rol: string | undefined,
    ref: EntidadMarketplaceRef,
    payload: {
      titulo: string;
      mensaje: string;
      audiencia: AudienciaPromocion;
      producto_id?: string;
      categoria_id?: string;
    },
  ) {
    const tienda = await this.assertGestionTiendaEntidad(usuarioId, rol, ref);

    const destinatarios = await this.resolverDestinatariosPromocion(
      tienda.id,
      ref,
      payload.audiencia,
    );

    if (destinatarios.length === 0) {
      throw new Error("No hay destinatarios para la audiencia seleccionada.");
    }

    let categoriaNombre: string | null = null;
    if (payload.categoria_id) {
      const { data: categoria } = await supabaseAdmin
        .from("marketplace_categorias")
        .select("nombre")
        .eq("id", payload.categoria_id)
        .maybeSingle();
      categoriaNombre = categoria?.nombre || null;
    }

    const actionUrl = this.buildPromoActionUrl(tienda.id, {
      producto_id: payload.producto_id,
      categoria_id: payload.categoria_id,
    });

    const metadata = {
      origen: "marketplace_promo",
      vendedor_id: tienda.id,
      nombre_tienda: tienda.nombre_tienda,
      categoria_id: payload.categoria_id || null,
      categoria_nombre: categoriaNombre,
      producto_id: payload.producto_id || null,
      action_url: actionUrl,
    };

    await Promise.all(
      destinatarios.map((uid) =>
        NotificacionService.crearNotificacion({
          usuario_id: uid,
          titulo: payload.titulo,
          mensaje: payload.mensaje,
          tipo: "info",
          metadata,
        }),
      ),
    );

    const { data, error } = await supabaseAdmin
      .from("marketplace_promociones")
      .insert({
        vendedor_id: tienda.id,
        titulo: payload.titulo,
        mensaje: payload.mensaje,
        audiencia: payload.audiencia,
        producto_id: payload.producto_id || null,
        enviado_por: usuarioId,
        total_destinatarios: destinatarios.length,
      })
      .select()
      .single();

    if (error) throw new Error(`Error al registrar promoción: ${error.message}`);
    return { promocion: data, total_destinatarios: destinatarios.length };
  }

  private static buildPromoActionUrl(
    vendedorId: string,
    opts: { producto_id?: string; categoria_id?: string },
  ): string {
    if (opts.producto_id) {
      return `/marketplace/producto/${opts.producto_id}`;
    }

    const params = new URLSearchParams();
    if (opts.categoria_id) {
      params.set("categoria_id", opts.categoria_id);
    }
    const query = params.toString();
    return query
      ? `/marketplace/tienda/${vendedorId}?${query}`
      : `/marketplace/tienda/${vendedorId}`;
  }

  static async obtenerTiendaPublica(vendedorId: string) {
    const { data: tienda, error } = await supabaseAdmin
      .from("marketplace_vendedores")
      .select(
        "id, nombre_tienda, tipo, descripcion, logo_url, provincia, valoracion_promedio, total_ventas, entidad_tipo, entidad_id, estado, created_at",
      )
      .eq("id", vendedorId)
      .maybeSingle();

    if (error || !tienda) {
      throw new Error("Tienda no encontrada.");
    }
    if (tienda.estado !== MARKETPLACE_ESTADOS_VENDEDOR.ACTIVO) {
      throw new Error("Esta tienda no está disponible.");
    }
    if (!tienda.entidad_id) {
      throw new Error("Tienda no disponible.");
    }

    let entidad_nombre: string | null = null;
    if (tienda.entidad_tipo && tienda.entidad_id) {
      entidad_nombre = await MarketplaceEntityAuthService.obtenerNombreEntidad({
        entidad_tipo: tienda.entidad_tipo as EntidadMarketplaceTipo,
        entidad_id: tienda.entidad_id,
      });
    }

    const { count: productosActivos } = await supabaseAdmin
      .from("marketplace_productos")
      .select("id", { count: "exact", head: true })
      .eq("vendedor_id", vendedorId)
      .eq("activo", true);

    const { data: categoriasTienda } = await supabaseAdmin
      .from("marketplace_productos")
      .select("categoria_id, categoria:marketplace_categorias(id, nombre, slug)")
      .eq("vendedor_id", vendedorId)
      .eq("activo", true);

    const categoriasMap = new Map<string, { id: string; nombre: string; slug: string; total: number }>();
    for (const row of categoriasTienda || []) {
      const catRaw = row.categoria as
        | { id: string; nombre: string; slug: string }
        | { id: string; nombre: string; slug: string }[]
        | null;
      const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
      if (!cat?.id) continue;
      const prev = categoriasMap.get(cat.id);
      categoriasMap.set(cat.id, {
        ...cat,
        total: (prev?.total || 0) + 1,
      });
    }

    return {
      ...tienda,
      entidad_nombre,
      productos_activos: productosActivos || 0,
      categorias: Array.from(categoriasMap.values()).sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      ),
    };
  }

  private static async resolverDestinatariosPromocion(
    vendedorId: string,
    ref: EntidadMarketplaceRef,
    audiencia: AudienciaPromocion,
  ): Promise<string[]> {
    if (audiencia === "plataforma") {
      const { data } = await supabaseAdmin
        .from("perfiles")
        .select("id")
        .eq("rol", "usuario");
      return (data || []).map((p) => p.id);
    }

    if (audiencia === "compradores_previos") {
      const { data: items } = await supabaseAdmin
        .from("marketplace_items_orden")
        .select("orden:marketplace_ordenes!inner(comprador_id, estado)")
        .eq("vendedor_id", vendedorId);

      const ids = new Set<string>();
      for (const item of items || []) {
        const orden = item.orden as { comprador_id?: string; estado?: string };
        if (orden?.estado === MARKETPLACE_ESTADOS_ORDEN.PAGADA && orden.comprador_id) {
          ids.add(orden.comprador_id);
        }
      }
      return [...ids];
    }

    // afiliados de la entidad
    let query = supabaseAdmin.from("afiliaciones").select("usuario_id").eq("estado", "habilitado");

    if (ref.entidad_tipo === "club") {
      query = query.eq("club_id", ref.entidad_id);
    } else if (ref.entidad_tipo === "asociacion") {
      query = query.eq("asociacion_id", ref.entidad_id);
    } else {
      const { data: asocs } = await supabaseAdmin
        .from("asociaciones")
        .select("id")
        .eq("federacion_id", ref.entidad_id);

      const asocIds = (asocs || []).map((a) => a.id);
      if (asocIds.length === 0) return [];
      query = query.in("asociacion_id", asocIds);
    }

    const { data } = await query;
    return [...new Set((data || []).map((a) => a.usuario_id).filter(Boolean))];
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

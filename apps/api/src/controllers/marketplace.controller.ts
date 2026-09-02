import { Request, Response } from "express";
import { MarketplaceService } from "../services/marketplace.service";
import { MarketplaceEntityAuthService } from "../services/marketplace-entity-auth.service";
import type { EntidadMarketplaceTipo } from "../constants/marketplace";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { getMercadoPagoAccessToken } from "../config/mercadopago";

function parseEntidadRef(req: Request): {
  entidad_tipo: EntidadMarketplaceTipo;
  entidad_id: string;
} {
  const entidad_tipo = (req.query.entidad_tipo ||
    req.body.entidad_tipo) as EntidadMarketplaceTipo;
  const entidad_id = (req.query.entidad_id ||
    req.body.entidad_id) as string;

  if (!entidad_tipo || !entidad_id) {
    throw new Error("Se requiere entidad_tipo y entidad_id.");
  }

  return { entidad_tipo, entidad_id };
}

export class MarketplaceController {
  static async listarCategorias(req: Request, res: Response) {
    try {
      const categorias = await MarketplaceService.listarCategorias();
      res.json(categorias);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async listarProductos(req: Request, res: Response) {
    try {
      const filtros = {
        categoria_id: req.query.categoria_id as string,
        vendedor_id: req.query.vendedor_id as string,
        busqueda: req.query.busqueda as string,
        precio_min: req.query.precio_min
          ? Number(req.query.precio_min)
          : undefined,
        precio_max: req.query.precio_max
          ? Number(req.query.precio_max)
          : undefined,
        marca: req.query.marca as string,
        tipo: req.query.tipo as "producto" | "servicio" | undefined,
        orden: req.query.orden as any,
        pagina: req.query.pagina ? Number(req.query.pagina) : 1,
        por_pagina: req.query.por_pagina ? Number(req.query.por_pagina) : 12,
      };
      const resultado = await MarketplaceService.listarProductos(filtros);
      res.json(resultado);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async obtenerProducto(req: Request, res: Response) {
    try {
      const producto = await MarketplaceService.obtenerProducto(
        req.params.id,
      );
      res.json(producto);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }

  static async obtenerTiendaPublica(req: Request, res: Response) {
    try {
      const tienda = await MarketplaceService.obtenerTiendaPublica(req.params.id);
      res.json(tienda);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }

  static async listarMarcas(req: Request, res: Response) {
    try {
      const marcas = await MarketplaceService.listarMarcas(
        req.query.categoria_id as string,
      );
      res.json(marcas);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async listarValoracionesProducto(req: Request, res: Response) {
    try {
      const pagina = req.query.pagina ? Number(req.query.pagina) : 1;
      const resultado = await MarketplaceService.listarValoraciones(
        req.params.id,
        pagina,
      );
      res.json(resultado);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async crearOrden(req: Request, res: Response) {
    try {
      const { items, datos_envio } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ message: "Se requiere al menos un item." });
      }

      const orden = await MarketplaceService.crearOrden(
        req.user!.id,
        items,
        datos_envio,
      );
      res.status(201).json(orden);
    } catch (err: any) {
      const status = err.message.includes("Stock insuficiente") ? 409 : 500;
      res.status(status).json({ message: err.message });
    }
  }

  static async pagarOrden(req: Request, res: Response) {
    try {
      const mobile = (req.get("x-padel-client") || "").toLowerCase() === "mobile";
      const preferencia =
        await MarketplaceService.crearPreferenciaMercadoPago(req.params.id, {
          mobile,
        });
      res.json(preferencia);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async confirmarRetornoPago(req: Request, res: Response) {
    try {
      const { payment_id } = req.body;
      const paymentId =
        payment_id || `mobile-return-${Date.now()}`;

      const orden = await MarketplaceService.confirmarPagoOrden(
        req.params.id,
        String(paymentId),
      );

      if (!orden) {
        // Puede estar ya pagada: devolver estado actual
        const actual = await MarketplaceService.obtenerOrden(
          req.params.id,
          req.user!.id,
        );
        return res.json(actual);
      }

      res.json(orden);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async listarMisOrdenes(req: Request, res: Response) {
    try {
      const pagina = req.query.pagina ? Number(req.query.pagina) : 1;
      const resultado = await MarketplaceService.listarMisOrdenes(
        req.user!.id,
        pagina,
      );
      res.json(resultado);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async obtenerOrden(req: Request, res: Response) {
    try {
      const orden = await MarketplaceService.obtenerOrden(
        req.params.id,
        req.user!.id,
      );
      res.json(orden);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }

  static async crearValoracion(req: Request, res: Response) {
    try {
      const { producto_id, orden_id, puntuacion, comentario } = req.body;

      if (!producto_id || !orden_id || !puntuacion) {
        return res.status(400).json({
          message: "Se requiere producto_id, orden_id y puntuacion (1-5).",
        });
      }

      if (puntuacion < 1 || puntuacion > 5) {
        return res
          .status(400)
          .json({ message: "La puntuación debe estar entre 1 y 5." });
      }

      const valoracion = await MarketplaceService.crearValoracion(
        req.user!.id,
        producto_id,
        orden_id,
        puntuacion,
        comentario,
      );
      res.status(201).json(valoracion);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async toggleFavorito(req: Request, res: Response) {
    try {
      const resultado = await MarketplaceService.toggleFavorito(
        req.user!.id,
        req.params.productoId,
      );
      res.json(resultado);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async listarFavoritos(req: Request, res: Response) {
    try {
      const favoritos = await MarketplaceService.listarFavoritos(
        req.user!.id,
      );
      res.json(favoritos);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async verificarFavorito(req: Request, res: Response) {
    try {
      const resultado = await MarketplaceService.esFavorito(
        req.user!.id,
        req.params.productoId,
      );
      res.json(resultado);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async webhookMercadoPago(req: Request, res: Response) {
    try {
      const { type, data } = req.body;

      if (type === "payment") {
        const paymentId = data?.id;
        if (!paymentId) {
          return res.status(200).send("OK");
        }

        const token = getMercadoPagoAccessToken();
        if (token) {
          const mpClient = new MercadoPagoConfig({ accessToken: token });
          const payment = new Payment(mpClient);
          const paymentInfo = await payment.get({ id: paymentId });

          if (paymentInfo.status === "approved" && paymentInfo.external_reference) {
            await MarketplaceService.confirmarPagoOrden(
              paymentInfo.external_reference,
              String(paymentId),
            );
          }
        }
      }

      res.status(200).send("OK");
    } catch (err: any) {
      console.error("❌ Error en webhook marketplace MP:", err.message);
      res.status(200).send("OK");
    }
  }

  static async registrarVendedor(_req: Request, res: Response) {
    return res.status(403).json({
      message:
        "El registro de vendedores individuales fue deshabilitado. Solo entidades pueden vender desde el CRM.",
    });
  }

  static async obtenerPerfilVendedor(_req: Request, res: Response) {
    return res.status(404).json({
      message: "La gestión de tienda se realiza desde el módulo Marketplace del CRM.",
    });
  }

  static async actualizarPerfilVendedor(_req: Request, res: Response) {
    return res.status(403).json({
      message: "La gestión de tienda se realiza desde el módulo Marketplace del CRM.",
    });
  }

  static async listarMisProductos(_req: Request, res: Response) {
    return res.status(403).json({
      message: "Gestioná productos desde el módulo Marketplace del CRM.",
    });
  }

  static async crearProducto(_req: Request, res: Response) {
    return res.status(403).json({
      message: "Gestioná productos desde el módulo Marketplace del CRM.",
    });
  }

  static async editarProducto(_req: Request, res: Response) {
    return res.status(403).json({
      message: "Gestioná productos desde el módulo Marketplace del CRM.",
    });
  }

  static async desactivarProducto(_req: Request, res: Response) {
    return res.status(403).json({
      message: "Gestioná productos desde el módulo Marketplace del CRM.",
    });
  }

  static async listarMisVentas(_req: Request, res: Response) {
    return res.status(403).json({
      message: "Consultá ventas desde el módulo Marketplace del CRM.",
    });
  }

  static async obtenerEstadisticas(_req: Request, res: Response) {
    return res.status(403).json({
      message: "Consultá estadísticas desde el módulo Marketplace del CRM.",
    });
  }

  // ─── CRM: Marketplace por entidad ─────────────────────────────────────

  static async listarEntidadesCrm(req: Request, res: Response) {
    try {
      const entidades = await MarketplaceService.listarEntidadesParaMarketplace(
        req.user!.id,
        req.user!.rol,
      );
      res.json(entidades);
    } catch (err: any) {
      res.status(403).json({ message: err.message });
    }
  }

  static async obtenerTiendaEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      await MarketplaceEntityAuthService.verificarAccesoEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
      );
      const tienda = await MarketplaceService.obtenerTiendaEntidad(ref);
      res.json(tienda);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async registrarTiendaEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const { nombre_tienda, descripcion, provincia, logo_base64 } = req.body;

      const tienda = await MarketplaceService.registrarTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        {
          entidad_tipo: ref.entidad_tipo,
          entidad_id: ref.entidad_id,
          nombre_tienda: nombre_tienda || "",
          tipo: ref.entidad_tipo,
          descripcion,
          provincia,
          logo_base64,
        },
      );
      res.status(201).json(tienda);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async actualizarTiendaEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const tienda = await MarketplaceService.actualizarTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
        req.body,
      );
      res.json(tienda);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async listarProductosEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const tienda = await MarketplaceService.assertGestionTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
      );
      const pagina = req.query.pagina ? Number(req.query.pagina) : 1;
      const resultado = await MarketplaceService.listarMisProductos(
        tienda.id,
        pagina,
      );
      res.json(resultado);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async crearProductoEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const tienda = await MarketplaceService.assertGestionTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
      );

      const { imagenes_base64, ...datos } = req.body;
      if (!datos.nombre || !datos.precio || !datos.categoria_id) {
        return res.status(400).json({
          message: "Se requiere nombre, precio y categoria_id.",
        });
      }

      const producto = await MarketplaceService.crearProducto(
        tienda.id,
        datos,
        imagenes_base64 || [],
      );
      res.status(201).json(producto);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async editarProductoEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const tienda = await MarketplaceService.assertGestionTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
      );

      const { imagenes_existentes, imagenes_nuevas_base64, ...datos } =
        req.body;

      const producto = await MarketplaceService.editarProducto(
        tienda.id,
        req.params.id,
        datos,
        imagenes_existentes || [],
        imagenes_nuevas_base64 || [],
      );
      res.json(producto);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async desactivarProductoEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const tienda = await MarketplaceService.assertGestionTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
      );

      const producto = await MarketplaceService.desactivarProducto(
        tienda.id,
        req.params.id,
      );
      res.json(producto);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async activarProductoEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const tienda = await MarketplaceService.assertGestionTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
      );

      const producto = await MarketplaceService.activarProducto(
        tienda.id,
        req.params.id,
      );
      res.json(producto);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async listarVentasEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const tienda = await MarketplaceService.assertGestionTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
      );
      const pagina = req.query.pagina ? Number(req.query.pagina) : 1;
      const resultado = await MarketplaceService.listarMisVentas(
        tienda.id,
        pagina,
      );
      res.json(resultado);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async obtenerEstadisticasEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const tienda = await MarketplaceService.assertGestionTiendaEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
      );
      const stats = await MarketplaceService.obtenerEstadisticas(tienda.id);
      res.json(stats);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async enviarPromocionEntidad(req: Request, res: Response) {
    try {
      const ref = parseEntidadRef(req);
      const { titulo, mensaje, audiencia, producto_id, categoria_id } = req.body;

      if (!titulo || !mensaje || !audiencia) {
        return res.status(400).json({
          message: "Se requiere titulo, mensaje y audiencia.",
        });
      }

      const resultado = await MarketplaceService.enviarPromocionEntidad(
        req.user!.id,
        req.user!.rol,
        ref,
        { titulo, mensaje, audiencia, producto_id, categoria_id },
      );
      res.status(201).json(resultado);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async listarVendedoresAdmin(req: Request, res: Response) {
    try {
      const estado = req.query.estado as string | undefined;
      const vendedores = await MarketplaceService.listarVendedores(estado);
      res.json(vendedores);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async suspenderVendedor(req: Request, res: Response) {
    try {
      const { motivo } = req.body;
      if (!motivo) {
        return res
          .status(400)
          .json({ message: "Se requiere un motivo para suspender." });
      }

      const vendedor = await MarketplaceService.suspenderVendedor(
        req.params.id,
        req.user!.id,
        motivo,
      );
      res.json(vendedor);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async reactivarVendedor(req: Request, res: Response) {
    try {
      const vendedor = await MarketplaceService.reactivarVendedor(
        req.params.id,
        req.user!.id,
      );
      res.json(vendedor);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
}

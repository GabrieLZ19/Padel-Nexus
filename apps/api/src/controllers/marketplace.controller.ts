import { Request, Response } from "express";
import { MarketplaceService } from "../services/marketplace.service";
import { MercadoPagoConfig, Payment } from "mercadopago";

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
      const preferencia =
        await MarketplaceService.crearPreferenciaMercadoPago(req.params.id);
      res.json(preferencia);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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

        const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (token && token !== "TEST") {
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

  static async registrarVendedor(req: Request, res: Response) {
    try {
      const { nombre_tienda, tipo, descripcion, provincia } = req.body;

      if (!nombre_tienda || !tipo) {
        return res
          .status(400)
          .json({ message: "Se requiere nombre_tienda y tipo." });
      }

      const vendedor = await MarketplaceService.registrarVendedor(
        req.user!.id,
        { nombre_tienda, tipo, descripcion, provincia },
      );
      res.status(201).json(vendedor);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async obtenerPerfilVendedor(req: Request, res: Response) {
    try {
      const perfil = await MarketplaceService.obtenerMiPerfilVendedor(
        req.user!.id,
      );
      if (!perfil) {
        return res
          .status(404)
          .json({ message: "No estás registrado como vendedor." });
      }
      res.json(perfil);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async actualizarPerfilVendedor(req: Request, res: Response) {
    try {
      const perfil = await MarketplaceService.actualizarPerfilVendedor(
        req.user!.id,
        req.body,
      );
      res.json(perfil);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async listarMisProductos(req: Request, res: Response) {
    try {
      const vendedor = await MarketplaceService.obtenerMiPerfilVendedor(
        req.user!.id,
      );
      if (!vendedor) {
        return res
          .status(404)
          .json({ message: "No estás registrado como vendedor." });
      }

      const pagina = req.query.pagina ? Number(req.query.pagina) : 1;
      const resultado = await MarketplaceService.listarMisProductos(
        vendedor.id,
        pagina,
      );
      res.json(resultado);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async crearProducto(req: Request, res: Response) {
    try {
      const vendedor = await MarketplaceService.obtenerMiPerfilVendedor(
        req.user!.id,
      );
      if (!vendedor) {
        return res
          .status(404)
          .json({ message: "No estás registrado como vendedor." });
      }

      const { imagenes_base64, ...datos } = req.body;

      if (!datos.nombre || !datos.precio || !datos.categoria_id) {
        return res.status(400).json({
          message: "Se requiere nombre, precio y categoria_id.",
        });
      }

      const producto = await MarketplaceService.crearProducto(
        vendedor.id,
        datos,
        imagenes_base64 || [],
      );
      res.status(201).json(producto);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async editarProducto(req: Request, res: Response) {
    try {
      const vendedor = await MarketplaceService.obtenerMiPerfilVendedor(
        req.user!.id,
      );
      if (!vendedor) {
        return res
          .status(404)
          .json({ message: "No estás registrado como vendedor." });
      }

      const { imagenes_existentes, imagenes_nuevas_base64, ...datos } =
        req.body;

      const producto = await MarketplaceService.editarProducto(
        vendedor.id,
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

  static async desactivarProducto(req: Request, res: Response) {
    try {
      const vendedor = await MarketplaceService.obtenerMiPerfilVendedor(
        req.user!.id,
      );
      if (!vendedor) {
        return res
          .status(404)
          .json({ message: "No estás registrado como vendedor." });
      }

      const producto = await MarketplaceService.desactivarProducto(
        vendedor.id,
        req.params.id,
      );
      res.json(producto);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  static async listarMisVentas(req: Request, res: Response) {
    try {
      const vendedor = await MarketplaceService.obtenerMiPerfilVendedor(
        req.user!.id,
      );
      if (!vendedor) {
        return res
          .status(404)
          .json({ message: "No estás registrado como vendedor." });
      }

      const pagina = req.query.pagina ? Number(req.query.pagina) : 1;
      const resultado = await MarketplaceService.listarMisVentas(
        vendedor.id,
        pagina,
      );
      res.json(resultado);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  static async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const vendedor = await MarketplaceService.obtenerMiPerfilVendedor(
        req.user!.id,
      );
      if (!vendedor) {
        return res
          .status(404)
          .json({ message: "No estás registrado como vendedor." });
      }

      const stats = await MarketplaceService.obtenerEstadisticas(vendedor.id);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
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

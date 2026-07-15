import { Router } from "express";
import { MarketplaceController } from "../controllers/marketplace.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/categorias", MarketplaceController.listarCategorias);
router.get("/productos", MarketplaceController.listarProductos);
router.get("/productos/:id", MarketplaceController.obtenerProducto);
router.get(
  "/productos/:id/valoraciones",
  MarketplaceController.listarValoracionesProducto,
);
router.get("/marcas", MarketplaceController.listarMarcas);

router.post(
  "/webhook/mercadopago",
  MarketplaceController.webhookMercadoPago,
);

router.use(authenticate);

router.post("/ordenes", MarketplaceController.crearOrden);
router.post("/ordenes/:id/pagar", MarketplaceController.pagarOrden);
router.get("/mis-ordenes", MarketplaceController.listarMisOrdenes);
router.get("/mis-ordenes/:id", MarketplaceController.obtenerOrden);
router.post("/valoraciones", MarketplaceController.crearValoracion);

router.post(
  "/favoritos/:productoId",
  MarketplaceController.toggleFavorito,
);
router.get("/favoritos", MarketplaceController.listarFavoritos);
router.get(
  "/favoritos/:productoId/check",
  MarketplaceController.verificarFavorito,
);

router.get(
  "/vendedor/perfil",
  MarketplaceController.obtenerPerfilVendedor,
);
router.post(
  "/vendedor/registrar",
  MarketplaceController.registrarVendedor,
);
router.put(
  "/vendedor/perfil",
  MarketplaceController.actualizarPerfilVendedor,
);
router.get(
  "/vendedor/productos",
  MarketplaceController.listarMisProductos,
);
router.post(
  "/vendedor/productos",
  MarketplaceController.crearProducto,
);
router.put(
  "/vendedor/productos/:id",
  MarketplaceController.editarProducto,
);
router.delete(
  "/vendedor/productos/:id",
  MarketplaceController.desactivarProducto,
);
router.get("/vendedor/ventas", MarketplaceController.listarMisVentas);
router.get(
  "/vendedor/estadisticas",
  MarketplaceController.obtenerEstadisticas,
);

router.get(
  "/admin/vendedores",
  authorize(["superadmin", "admin_federacion", "admin_provincial", "admin"]),
  MarketplaceController.listarVendedoresAdmin,
);
router.patch(
  "/admin/vendedores/:id/suspender",
  authorize(["superadmin", "admin_federacion", "admin"]),
  MarketplaceController.suspenderVendedor,
);
router.patch(
  "/admin/vendedores/:id/reactivar",
  authorize(["superadmin", "admin_federacion", "admin"]),
  MarketplaceController.reactivarVendedor,
);

export default router;

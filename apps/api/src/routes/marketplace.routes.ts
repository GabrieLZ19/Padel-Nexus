import { Router } from "express";
import { MarketplaceController } from "../controllers/marketplace.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

const ROLES_CRM_MARKETPLACE = [
  "superadmin",
  "admin",
  "admin_federacion",
  "admin_provincial",
  "admin_club",
];

router.get("/categorias", MarketplaceController.listarCategorias);
router.get("/productos", MarketplaceController.listarProductos);
router.get("/productos/:id", MarketplaceController.obtenerProducto);
router.get(
  "/productos/:id/valoraciones",
  MarketplaceController.listarValoracionesProducto,
);
router.get("/marcas", MarketplaceController.listarMarcas);
router.get("/tiendas/:id", MarketplaceController.obtenerTiendaPublica);

router.post(
  "/webhook/mercadopago",
  MarketplaceController.webhookMercadoPago,
);

router.use(authenticate);

router.post("/ordenes", MarketplaceController.crearOrden);
router.post("/ordenes/:id/pagar", MarketplaceController.pagarOrden);
router.post(
  "/ordenes/:id/confirmar-retorno",
  MarketplaceController.confirmarRetornoPago,
);
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

// Rutas legacy de vendedor individual — deshabilitadas
router.get("/vendedor/perfil", MarketplaceController.obtenerPerfilVendedor);
router.post("/vendedor/registrar", MarketplaceController.registrarVendedor);
router.put("/vendedor/perfil", MarketplaceController.actualizarPerfilVendedor);
router.get("/vendedor/productos", MarketplaceController.listarMisProductos);
router.post("/vendedor/productos", MarketplaceController.crearProducto);
router.put("/vendedor/productos/:id", MarketplaceController.editarProducto);
router.delete(
  "/vendedor/productos/:id",
  MarketplaceController.desactivarProducto,
);
router.get("/vendedor/ventas", MarketplaceController.listarMisVentas);
router.get("/vendedor/estadisticas", MarketplaceController.obtenerEstadisticas);

// CRM: marketplace por entidad
router.get(
  "/crm/entidades",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.listarEntidadesCrm,
);
router.get(
  "/crm/tienda",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.obtenerTiendaEntidad,
);
router.post(
  "/crm/tienda",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.registrarTiendaEntidad,
);
router.put(
  "/crm/tienda",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.actualizarTiendaEntidad,
);
router.get(
  "/crm/productos",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.listarProductosEntidad,
);
router.post(
  "/crm/productos",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.crearProductoEntidad,
);
router.put(
  "/crm/productos/:id",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.editarProductoEntidad,
);
router.delete(
  "/crm/productos/:id",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.desactivarProductoEntidad,
);
router.patch(
  "/crm/productos/:id/activar",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.activarProductoEntidad,
);
router.get(
  "/crm/ventas",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.listarVentasEntidad,
);
router.get(
  "/crm/estadisticas",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.obtenerEstadisticasEntidad,
);
router.post(
  "/crm/promociones",
  authorize(ROLES_CRM_MARKETPLACE),
  MarketplaceController.enviarPromocionEntidad,
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

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import warehousesRouter from "./warehouses";
import productsRouter from "./products";
import requisitionsRouter from "./requisitions";
import inventoryRouter from "./inventory";
import dashboardRouter from "./dashboard";
import physicalCountsRouter from "./physical-counts";
import suppliersRouter from "./suppliers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(suppliersRouter);
router.use(warehousesRouter);
router.use(productsRouter);
router.use(requisitionsRouter);
router.use(inventoryRouter);
router.use(dashboardRouter);
router.use(physicalCountsRouter);

export default router;

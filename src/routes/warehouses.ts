import { Router, type IRouter } from "express";
import { db, warehousesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/warehouses", requireAuth, async (_req, res): Promise<void> => {
  const warehouses = await db.select().from(warehousesTable);
  res.json(warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
  })));
});

export default router;

import { Router, type IRouter } from "express";
import { db, productsTable, requisitionsTable, inventoryMovementsTable, warehousesTable, areasTable, usersTable, categoriesTable } from "@workspace/db";
import { eq, and, sql, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.isActive, true));
  const [lowStockCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable).where(
    and(
      eq(productsTable.isActive, true),
      sql`${productsTable.currentStock} <= ${productsTable.minimumStock}`,
    )
  );
  const [pendingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(requisitionsTable).where(eq(requisitionsTable.status, "enviada"));
  const [valueResult] = await db.select({
    total: sql<number>`coalesce(sum(${productsTable.currentStock}::numeric * ${productsTable.averageCost}::numeric), 0)::float`,
  }).from(productsTable).where(eq(productsTable.isActive, true));
  const [warehouseCount] = await db.select({ count: sql<number>`count(*)::int` }).from(warehousesTable);
  const [todayMovements] = await db.select({ count: sql<number>`count(*)::int` }).from(inventoryMovementsTable).where(
    sql`${inventoryMovementsTable.createdAt} >= current_date`
  );

  res.json({
    totalProducts: productCount?.count ?? 0,
    lowStockCount: lowStockCount?.count ?? 0,
    pendingRequisitions: pendingCount?.count ?? 0,
    totalInventoryValue: valueResult?.total ?? 0,
    totalWarehouses: warehouseCount?.count ?? 0,
    todayMovements: todayMovements?.count ?? 0,
  });
});

router.get("/dashboard/low-stock", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      product: productsTable,
      categoryName: categoriesTable.name,
      warehouseName: warehousesTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(warehousesTable, eq(productsTable.warehouseId, warehousesTable.id))
    .where(
      and(
        eq(productsTable.isActive, true),
        sql`${productsTable.currentStock} <= ${productsTable.minimumStock}`,
      )
    );

  res.json(rows.map((r) => ({
    id: r.product.id,
    code: r.product.code,
    name: r.product.name,
    categoryId: r.product.categoryId,
    categoryName: r.categoryName ?? null,
    imageUrl: r.product.imageUrl,
    warehouseId: r.product.warehouseId,
    warehouseName: r.warehouseName ?? null,
    inventoryUnit: r.product.inventoryUnit,
    requisitionUnit: r.product.requisitionUnit,
    purchaseUnit: r.product.purchaseUnit,
    conversionFactor: parseFloat(r.product.conversionFactor),
    currentStock: parseFloat(r.product.currentStock),
    minimumStock: parseFloat(r.product.minimumStock),
    averageCost: parseFloat(r.product.averageCost),
    isActive: r.product.isActive,
  })));
});

router.get("/dashboard/recent-activity", requireAuth, async (_req, res): Promise<void> => {
  const reqs = await db
    .select({
      req: requisitionsTable,
      areaName: areasTable.name,
      userName: usersTable.name,
    })
    .from(requisitionsTable)
    .leftJoin(areasTable, eq(requisitionsTable.areaId, areasTable.id))
    .leftJoin(usersTable, eq(requisitionsTable.createdBy, usersTable.id))
    .orderBy(sql`${requisitionsTable.createdAt} DESC`)
    .limit(5);

  const movements = await db
    .select({
      movement: inventoryMovementsTable,
      productName: productsTable.name,
      userName: usersTable.name,
    })
    .from(inventoryMovementsTable)
    .leftJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(inventoryMovementsTable.createdBy, usersTable.id))
    .orderBy(sql`${inventoryMovementsTable.createdAt} DESC`)
    .limit(5);

  const activity = [
    ...reqs.map((r) => ({
      id: r.req.id * 1000,
      type: "requisicion",
      description: `Requisición #${r.req.id} de ${r.areaName ?? "área"} - ${r.req.status}`,
      userName: r.userName ?? "",
      createdAt: r.req.createdAt.toISOString(),
    })),
    ...movements.map((m) => ({
      id: m.movement.id,
      type: "movimiento",
      description: `${m.movement.type.replace(/_/g, " ")} - ${m.productName ?? "producto"} (${parseFloat(m.movement.quantity)} ${m.movement.unit})`,
      userName: m.userName ?? "",
      createdAt: m.movement.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  res.json(activity);
});

export default router;

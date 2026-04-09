import { Router, type IRouter } from "express";
import { db, inventoryMovementsTable, productsTable, warehousesTable, usersTable, categoriesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateMovementBody, ListMovementsQueryParams, ListStockQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/inventory/movements", requireAuth, async (req, res): Promise<void> => {
  const params = ListMovementsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { productId, warehouseId, type, from, to } = params.data;

  const rows = await db
    .select({
      movement: inventoryMovementsTable,
      productName: productsTable.name,
      productCode: productsTable.code,
      warehouseName: warehousesTable.name,
      userName: usersTable.name,
    })
    .from(inventoryMovementsTable)
    .leftJoin(productsTable, eq(inventoryMovementsTable.productId, productsTable.id))
    .leftJoin(warehousesTable, eq(inventoryMovementsTable.warehouseId, warehousesTable.id))
    .leftJoin(usersTable, eq(inventoryMovementsTable.createdBy, usersTable.id))
    .where(
      and(
        productId ? eq(inventoryMovementsTable.productId, productId) : undefined,
        warehouseId ? eq(inventoryMovementsTable.warehouseId, warehouseId) : undefined,
        type ? eq(inventoryMovementsTable.type, type) : undefined,
        from ? sql`${inventoryMovementsTable.createdAt} >= ${from}::timestamptz` : undefined,
        to ? sql`${inventoryMovementsTable.createdAt} <= ${to}::timestamptz` : undefined,
      ),
    )
    .orderBy(sql`${inventoryMovementsTable.createdAt} DESC`);

  const destIds = rows.filter((r) => r.movement.destinationWarehouseId).map((r) => r.movement.destinationWarehouseId!);
  let destNames: Record<number, string> = {};
  if (destIds.length > 0) {
    const destRows = await db.select().from(warehousesTable).where(
      sql`${warehousesTable.id} = ANY(${sql.raw(`ARRAY[${destIds.join(",")}]`)})`
    );
    destNames = Object.fromEntries(destRows.map((d) => [d.id, d.name]));
  }

  res.json(rows.map((r) => ({
    id: r.movement.id,
    productId: r.movement.productId,
    productName: r.productName ?? "",
    productCode: r.productCode ?? "",
    type: r.movement.type,
    quantity: parseFloat(r.movement.quantity),
    unit: r.movement.unit,
    warehouseId: r.movement.warehouseId,
    warehouseName: r.warehouseName ?? "",
    destinationWarehouseId: r.movement.destinationWarehouseId ?? null,
    destinationWarehouseName: r.movement.destinationWarehouseId ? (destNames[r.movement.destinationWarehouseId] ?? null) : null,
    userName: r.userName ?? "",
    observations: r.movement.observations ?? null,
    createdAt: r.movement.createdAt.toISOString(),
  })));
});

router.post("/inventory/movements", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.productId));
  if (!product) {
    res.status(404).json({ error: "Producto no encontrado" });
    return;
  }

  const [movement] = await db.insert(inventoryMovementsTable).values({
    productId: parsed.data.productId,
    type: parsed.data.type,
    quantity: String(parsed.data.quantity),
    unit: parsed.data.unit,
    warehouseId: parsed.data.warehouseId,
    destinationWarehouseId: parsed.data.destinationWarehouseId ?? null,
    createdBy: req.session.userId!,
    observations: parsed.data.observations ?? null,
  }).returning();

  const isInbound = ["entrada_compra", "ajuste_manual"].includes(parsed.data.type);
  const isOutbound = ["salida_requisicion", "merma", "dano", "vencimiento"].includes(parsed.data.type);

  if (isInbound) {
    const newStock = parseFloat(product.currentStock) + parsed.data.quantity;
    await db.update(productsTable).set({ currentStock: String(newStock) }).where(eq(productsTable.id, product.id));
  } else if (isOutbound) {
    const newStock = Math.max(0, parseFloat(product.currentStock) - parsed.data.quantity);
    await db.update(productsTable).set({ currentStock: String(newStock) }).where(eq(productsTable.id, product.id));
  }

  const [wh] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, movement.warehouseId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, movement.createdBy));

  res.status(201).json({
    id: movement.id,
    productId: movement.productId,
    productName: product.name,
    productCode: product.code,
    type: movement.type,
    quantity: parseFloat(movement.quantity),
    unit: movement.unit,
    warehouseId: movement.warehouseId,
    warehouseName: wh?.name ?? "",
    destinationWarehouseId: movement.destinationWarehouseId ?? null,
    destinationWarehouseName: null,
    userName: user?.name ?? "",
    observations: movement.observations ?? null,
    createdAt: movement.createdAt.toISOString(),
  });
});

router.get("/inventory/stock", requireAuth, async (req, res): Promise<void> => {
  const params = ListStockQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { warehouseId } = params.data;

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
        warehouseId ? eq(productsTable.warehouseId, warehouseId) : undefined,
      ),
    );

  res.json(rows.map((r) => {
    const stock = parseFloat(r.product.currentStock);
    const minStock = parseFloat(r.product.minimumStock);
    const cost = parseFloat(r.product.averageCost);
    return {
      productId: r.product.id,
      productCode: r.product.code,
      productName: r.product.name,
      categoryName: r.categoryName ?? null,
      warehouseId: r.product.warehouseId,
      warehouseName: r.warehouseName ?? "",
      currentStock: stock,
      minimumStock: minStock,
      averageCost: cost,
      totalValue: stock * cost,
      unit: r.product.inventoryUnit,
      isLowStock: stock <= minStock,
    };
  }));
});

export default router;

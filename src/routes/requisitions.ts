import { Router, type IRouter } from "express";
import { db, requisitionsTable, requisitionItemsTable, productsTable, areasTable, usersTable, inventoryMovementsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateRequisitionBody, UpdateRequisitionBody, GetRequisitionParams, UpdateRequisitionParams, ListRequisitionsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/requisitions", requireAuth, async (req, res): Promise<void> => {
  const params = ListRequisitionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { status, areaId } = params.data;

  const rows = await db
    .select({
      req: requisitionsTable,
      areaName: areasTable.name,
      createdByName: usersTable.name,
    })
    .from(requisitionsTable)
    .leftJoin(areasTable, eq(requisitionsTable.areaId, areasTable.id))
    .leftJoin(usersTable, eq(requisitionsTable.createdBy, usersTable.id))
    .where(
      and(
        status ? eq(requisitionsTable.status, status) : undefined,
        areaId ? eq(requisitionsTable.areaId, areaId) : undefined,
      ),
    )
    .orderBy(sql`${requisitionsTable.createdAt} DESC`);

  const reqIds = rows.map((r) => r.req.id);
  let itemCounts: Record<number, number> = {};

  if (reqIds.length > 0) {
    const countRows = await db
      .select({
        requisitionId: requisitionItemsTable.requisitionId,
        count: sql<number>`count(*)::int`,
      })
      .from(requisitionItemsTable)
      .where(sql`${requisitionItemsTable.requisitionId} = ANY(${sql.raw(`ARRAY[${reqIds.join(",")}]`)})`);
    
    itemCounts = Object.fromEntries(countRows.map((r) => [r.requisitionId, Number(r.count)]));
  }

  res.json(rows.map((r) => ({
    id: r.req.id,
    areaId: r.req.areaId,
    areaName: r.areaName ?? "",
    status: r.req.status,
    notes: r.req.notes,
    createdByName: r.createdByName ?? "",
    createdAt: r.req.createdAt.toISOString(),
    updatedAt: r.req.updatedAt.toISOString(),
    itemCount: itemCounts[r.req.id] ?? 0,
  })));
});

router.post("/requisitions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRequisitionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).then((r) => r[0]);
  if (!user?.areaId) {
    res.status(400).json({ error: "El usuario no tiene área asignada" });
    return;
  }

  const [requisition] = await db.insert(requisitionsTable).values({
    areaId: user.areaId,
    createdBy: user.id,
    status: "enviada",
    notes: parsed.data.notes ?? null,
  }).returning();

  for (const item of parsed.data.items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (product) {
      await db.insert(requisitionItemsTable).values({
        requisitionId: requisition.id,
        productId: item.productId,
        requestedQuantity: String(item.requestedQuantity),
        unit: product.requisitionUnit,
        notes: item.notes ?? null,
      });
    }
  }

  const [area] = await db.select().from(areasTable).where(eq(areasTable.id, requisition.areaId));

  res.status(201).json({
    id: requisition.id,
    areaId: requisition.areaId,
    areaName: area?.name ?? "",
    status: requisition.status,
    notes: requisition.notes,
    createdByName: user.name,
    createdAt: requisition.createdAt.toISOString(),
    updatedAt: requisition.updatedAt.toISOString(),
    itemCount: parsed.data.items.length,
  });
});

router.get("/requisitions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetRequisitionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      req: requisitionsTable,
      areaName: areasTable.name,
      createdByName: usersTable.name,
    })
    .from(requisitionsTable)
    .leftJoin(areasTable, eq(requisitionsTable.areaId, areasTable.id))
    .leftJoin(usersTable, eq(requisitionsTable.createdBy, usersTable.id))
    .where(eq(requisitionsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Requisición no encontrada" });
    return;
  }

  const itemRows = await db
    .select({
      item: requisitionItemsTable,
      productName: productsTable.name,
      productCode: productsTable.code,
      imageUrl: productsTable.imageUrl,
    })
    .from(requisitionItemsTable)
    .leftJoin(productsTable, eq(requisitionItemsTable.productId, productsTable.id))
    .where(eq(requisitionItemsTable.requisitionId, params.data.id));

  res.json({
    id: row.req.id,
    areaId: row.req.areaId,
    areaName: row.areaName ?? "",
    status: row.req.status,
    notes: row.req.notes,
    createdByName: row.createdByName ?? "",
    createdAt: row.req.createdAt.toISOString(),
    updatedAt: row.req.updatedAt.toISOString(),
    items: itemRows.map((i) => ({
      id: i.item.id,
      productId: i.item.productId,
      productName: i.productName ?? "",
      productCode: i.productCode ?? "",
      imageUrl: i.imageUrl ?? null,
      requestedQuantity: parseFloat(i.item.requestedQuantity),
      approvedQuantity: i.item.approvedQuantity ? parseFloat(i.item.approvedQuantity) : null,
      dispatchedQuantity: i.item.dispatchedQuantity ? parseFloat(i.item.dispatchedQuantity) : null,
      unit: i.item.unit,
      notes: i.item.notes ?? null,
    })),
  });
});

router.patch("/requisitions/:id", requireAuth, async (req, res): Promise<void> => {
  const paramsResult = UpdateRequisitionParams.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: paramsResult.error.message });
    return;
  }

  const bodyResult = UpdateRequisitionBody.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: bodyResult.error.message });
    return;
  }

  const [existingReq] = await db.select().from(requisitionsTable).where(eq(requisitionsTable.id, paramsResult.data.id));
  if (!existingReq) {
    res.status(404).json({ error: "Requisición no encontrada" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const b = bodyResult.data;
  if (b.status != null) updateData.status = b.status;
  if (b.notes !== undefined) updateData.notes = b.notes;

  if (Object.keys(updateData).length > 0) {
    await db.update(requisitionsTable).set(updateData).where(eq(requisitionsTable.id, paramsResult.data.id));
  }

  if (b.items && b.items.length > 0) {
    for (const item of b.items) {
      const itemUpdate: Record<string, unknown> = {};
      if (item.approvedQuantity !== undefined) itemUpdate.approvedQuantity = item.approvedQuantity != null ? String(item.approvedQuantity) : null;
      if (item.dispatchedQuantity !== undefined) itemUpdate.dispatchedQuantity = item.dispatchedQuantity != null ? String(item.dispatchedQuantity) : null;
      if (item.notes !== undefined) itemUpdate.notes = item.notes;
      if (Object.keys(itemUpdate).length > 0) {
        await db.update(requisitionItemsTable).set(itemUpdate).where(eq(requisitionItemsTable.id, item.id));
      }
    }
  }

  if (b.status === "despachada") {
    const itemRows = await db
      .select({ item: requisitionItemsTable, product: productsTable })
      .from(requisitionItemsTable)
      .leftJoin(productsTable, eq(requisitionItemsTable.productId, productsTable.id))
      .where(eq(requisitionItemsTable.requisitionId, paramsResult.data.id));

    for (const row of itemRows) {
      if (!row.product) continue;
      const qty = row.item.dispatchedQuantity
        ? parseFloat(row.item.dispatchedQuantity)
        : row.item.approvedQuantity
          ? parseFloat(row.item.approvedQuantity)
          : parseFloat(row.item.requestedQuantity);

      const newStock = parseFloat(row.product.currentStock) - qty;
      await db.update(productsTable).set({ currentStock: String(Math.max(0, newStock)) }).where(eq(productsTable.id, row.product.id));

      await db.insert(inventoryMovementsTable).values({
        productId: row.product.id,
        type: "salida_requisicion",
        quantity: String(qty),
        unit: row.item.unit,
        warehouseId: row.product.warehouseId,
        createdBy: req.session.userId!,
        requisitionId: paramsResult.data.id,
        observations: `Despacho de requisición #${paramsResult.data.id}`,
      });
    }
  }

  const [updatedRow] = await db
    .select({
      req: requisitionsTable,
      areaName: areasTable.name,
      createdByName: usersTable.name,
    })
    .from(requisitionsTable)
    .leftJoin(areasTable, eq(requisitionsTable.areaId, areasTable.id))
    .leftJoin(usersTable, eq(requisitionsTable.createdBy, usersTable.id))
    .where(eq(requisitionsTable.id, paramsResult.data.id));

  const itemRows = await db
    .select({
      item: requisitionItemsTable,
      productName: productsTable.name,
      productCode: productsTable.code,
      imageUrl: productsTable.imageUrl,
    })
    .from(requisitionItemsTable)
    .leftJoin(productsTable, eq(requisitionItemsTable.productId, productsTable.id))
    .where(eq(requisitionItemsTable.requisitionId, paramsResult.data.id));

  res.json({
    id: updatedRow!.req.id,
    areaId: updatedRow!.req.areaId,
    areaName: updatedRow!.areaName ?? "",
    status: updatedRow!.req.status,
    notes: updatedRow!.req.notes,
    createdByName: updatedRow!.createdByName ?? "",
    createdAt: updatedRow!.req.createdAt.toISOString(),
    updatedAt: updatedRow!.req.updatedAt.toISOString(),
    items: itemRows.map((i) => ({
      id: i.item.id,
      productId: i.item.productId,
      productName: i.productName ?? "",
      productCode: i.productCode ?? "",
      imageUrl: i.imageUrl ?? null,
      requestedQuantity: parseFloat(i.item.requestedQuantity),
      approvedQuantity: i.item.approvedQuantity ? parseFloat(i.item.approvedQuantity) : null,
      dispatchedQuantity: i.item.dispatchedQuantity ? parseFloat(i.item.dispatchedQuantity) : null,
      unit: i.item.unit,
      notes: i.item.notes ?? null,
    })),
  });
});

export default router;

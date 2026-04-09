import { Router, type IRouter } from "express";
import {
  db,
  physicalCountsTable,
  physicalCountItemsTable,
  productsTable,
  warehousesTable,
  usersTable,
  inventoryMovementsTable,
} from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import multer from "multer";

const router: IRouter = Router();
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

async function buildCountDetail(countId: number) {
  const [count] = await db
    .select({
      count: physicalCountsTable,
      warehouseName: warehousesTable.name,
      createdByName: usersTable.name,
    })
    .from(physicalCountsTable)
    .leftJoin(warehousesTable, eq(physicalCountsTable.warehouseId, warehousesTable.id))
    .leftJoin(usersTable, eq(physicalCountsTable.createdBy, usersTable.id))
    .where(eq(physicalCountsTable.id, countId));

  if (!count) return null;

  const items = await db
    .select({ item: physicalCountItemsTable })
    .from(physicalCountItemsTable)
    .leftJoin(productsTable, eq(physicalCountItemsTable.productId, productsTable.id))
    .where(eq(physicalCountItemsTable.physicalCountId, countId))
    .orderBy(physicalCountItemsTable.productName);

  const c = count.count;
  return {
    id: c.id,
    warehouseId: c.warehouseId,
    warehouseName: count.warehouseName ?? "",
    countDate: c.countDate,
    responsibleName: c.responsibleName,
    status: c.status,
    notes: c.notes ?? null,
    createdByName: count.createdByName ?? "",
    createdAt: c.createdAt.toISOString(),
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    totalDifferenceValue: c.totalDifferenceValue != null ? parseFloat(c.totalDifferenceValue) : null,
    shortageValue: c.shortageValue != null ? parseFloat(c.shortageValue) : null,
    surplusValue: c.surplusValue != null ? parseFloat(c.surplusValue) : null,
    accuracyPercent: c.accuracyPercent != null ? parseFloat(c.accuracyPercent) : null,
    items: items.map((i) => ({
      id: i.item.id,
      productId: i.item.productId,
      productCode: i.item.productCode ?? "",
      productName: i.item.productName ?? "",
      unit: i.item.unit ?? "",
      systemStock: parseFloat(i.item.systemStock),
      physicalCount: i.item.physicalCount != null ? parseFloat(i.item.physicalCount) : null,
      difference: i.item.difference != null ? parseFloat(i.item.difference) : null,
      averageCost: parseFloat(i.item.averageCost),
      valuedImpact: i.item.valuedImpact != null ? parseFloat(i.item.valuedImpact) : null,
      reason: i.item.reason ?? null,
      observation: i.item.observation ?? null,
    })),
  };
}

router.get("/physical-counts", requireAuth, async (req, res): Promise<void> => {
  const { warehouseId, status, from, to } = req.query as Record<string, string | undefined>;

  const rows = await db
    .select({
      count: physicalCountsTable,
      warehouseName: warehousesTable.name,
      createdByName: usersTable.name,
    })
    .from(physicalCountsTable)
    .leftJoin(warehousesTable, eq(physicalCountsTable.warehouseId, warehousesTable.id))
    .leftJoin(usersTable, eq(physicalCountsTable.createdBy, usersTable.id))
    .where(
      and(
        warehouseId ? eq(physicalCountsTable.warehouseId, parseInt(warehouseId)) : undefined,
        status ? eq(physicalCountsTable.status, status) : undefined,
        from ? sql`${physicalCountsTable.countDate} >= ${from}` : undefined,
        to ? sql`${physicalCountsTable.countDate} <= ${to}` : undefined,
      ),
    )
    .orderBy(sql`${physicalCountsTable.countDate} DESC`);

  const countIds = rows.map((r) => r.count.id);
  let itemCounts: Record<number, number> = {};
  if (countIds.length > 0) {
    const counts = await db
      .select({ physicalCountId: physicalCountItemsTable.physicalCountId, cnt: sql<number>`count(*)::int` })
      .from(physicalCountItemsTable)
      .where(inArray(physicalCountItemsTable.physicalCountId, countIds))
      .groupBy(physicalCountItemsTable.physicalCountId);
    itemCounts = Object.fromEntries(counts.map((c) => [c.physicalCountId, c.cnt]));
  }

  res.json(
    rows.map((r) => ({
      id: r.count.id,
      warehouseId: r.count.warehouseId,
      warehouseName: r.warehouseName ?? "",
      countDate: r.count.countDate,
      responsibleName: r.count.responsibleName,
      status: r.count.status,
      notes: r.count.notes ?? null,
      createdByName: r.createdByName ?? "",
      itemCount: itemCounts[r.count.id] ?? 0,
      createdAt: r.count.createdAt.toISOString(),
      closedAt: r.count.closedAt ? r.count.closedAt.toISOString() : null,
      totalDifferenceValue: r.count.totalDifferenceValue != null ? parseFloat(r.count.totalDifferenceValue) : null,
      accuracyPercent: r.count.accuracyPercent != null ? parseFloat(r.count.accuracyPercent) : null,
    })),
  );
});

router.get("/physical-counts/summary", requireAuth, async (req, res): Promise<void> => {
  const { warehouseId, from, to } = req.query as Record<string, string | undefined>;

  const closedCounts = await db
    .select({ id: physicalCountsTable.id })
    .from(physicalCountsTable)
    .where(
      and(
        eq(physicalCountsTable.status, "cerrada"),
        warehouseId ? eq(physicalCountsTable.warehouseId, parseInt(warehouseId)) : undefined,
        from ? sql`${physicalCountsTable.countDate} >= ${from}` : undefined,
        to ? sql`${physicalCountsTable.countDate} <= ${to}` : undefined,
      ),
    );

  const closedIds = closedCounts.map((c) => c.id);

  if (closedIds.length === 0) {
    res.json({ totalMissing: 0, totalSurplus: 0, valueMissing: 0, valueSurplus: 0, accuracyByItems: 1, accuracyByValue: 1, topDifferences: [] });
    return;
  }

  const items = await db
    .select({ item: physicalCountItemsTable })
    .from(physicalCountItemsTable)
    .where(inArray(physicalCountItemsTable.physicalCountId, closedIds));

  const countedItems = items.filter((i) => i.item.physicalCount != null);
  const noDiscrepancy = countedItems.filter((i) => i.item.difference != null && parseFloat(i.item.difference) === 0).length;

  let totalMissing = 0, totalSurplus = 0, valueMissing = 0, valueSurplus = 0;
  let totalCountedValue = 0, totalAbsDifferenceValue = 0;
  const productDiffs: Record<string, { productName: string; productCode: string; totalDifference: number; totalValuedImpact: number }> = {};

  for (const i of countedItems) {
    const diff = i.item.difference != null ? parseFloat(i.item.difference) : 0;
    const impact = i.item.valuedImpact != null ? parseFloat(i.item.valuedImpact) : 0;
    const physCount = i.item.physicalCount != null ? parseFloat(i.item.physicalCount) : 0;
    const cost = parseFloat(i.item.averageCost);

    if (diff < 0) { totalMissing += Math.abs(diff); valueMissing += Math.abs(impact); }
    else if (diff > 0) { totalSurplus += diff; valueSurplus += impact; }

    totalCountedValue += physCount * cost;
    totalAbsDifferenceValue += Math.abs(impact);

    if (i.item.productId != null && diff !== 0) {
      const key = String(i.item.productId);
      if (!productDiffs[key]) productDiffs[key] = { productName: i.item.productName, productCode: i.item.productCode, totalDifference: 0, totalValuedImpact: 0 };
      productDiffs[key].totalDifference += diff;
      productDiffs[key].totalValuedImpact += impact;
    }
  }

  res.json({
    totalMissing,
    totalSurplus,
    valueMissing,
    valueSurplus,
    accuracyByItems: countedItems.length > 0 ? noDiscrepancy / countedItems.length : 1,
    accuracyByValue: totalCountedValue > 0 ? 1 - totalAbsDifferenceValue / totalCountedValue : 1,
    topDifferences: Object.entries(productDiffs)
      .map(([pid, d]) => ({ productId: parseInt(pid), productName: d.productName, productCode: d.productCode, totalDifference: d.totalDifference, totalValuedImpact: d.totalValuedImpact }))
      .sort((a, b) => Math.abs(b.totalValuedImpact) - Math.abs(a.totalValuedImpact))
      .slice(0, 10),
  });
});

// CSV template download
router.get("/physical-counts/:id/template", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const detail = await buildCountDetail(id);
  if (!detail) { res.status(404).json({ error: "Toma no encontrada" }); return; }

  const BOM = "\uFEFF";
  const header = "Código,Producto,Unidad,Stock Sistema,Conteo Físico,Diferencia,Motivo,Observaciones\r\n";
  const rows = detail.items.map((item) =>
    [
      item.productCode,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.unit,
      item.systemStock,
      item.physicalCount !== null ? item.physicalCount : "",
      item.difference !== null ? item.difference : "",
      item.reason ?? "",
      item.observation ? `"${item.observation.replace(/"/g, '""')}"` : "",
    ].join(",")
  );

  const csv = BOM + header + rows.join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="toma-${id}-${detail.countDate}.csv"`);
  res.send(csv);
});

// CSV import
router.post("/physical-counts/:id/import", requireAuth, csvUpload.single("file"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(physicalCountsTable).where(eq(physicalCountsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Toma no encontrada" }); return; }
  if (existing.status === "cerrada") { res.status(400).json({ error: "No se puede importar en una toma cerrada" }); return; }

  if (!req.file) { res.status(400).json({ error: "No se recibió archivo" }); return; }

  const content = req.file.buffer.toString("utf-8").replace(/^\uFEFF/, "");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) { res.status(400).json({ error: "CSV vacío o sin datos" }); return; }

  // Parse CSV with simple approach (assumes no commas in quoted fields that break things)
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) { result.push(field); field = ""; }
      else field += line[i];
    }
    result.push(field);
    return result;
  }

  const dataLines = lines.slice(1); // skip header
  const existingItems = await db.select().from(physicalCountItemsTable).where(eq(physicalCountItemsTable.physicalCountId, id));
  const itemByCode: Record<string, typeof existingItems[0]> = {};
  for (const item of existingItems) itemByCode[item.productCode] = item;

  let updated = 0;
  let skipped = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const cols = parseLine(line);
    const code = cols[0]?.trim();
    const physCountStr = cols[4]?.trim();
    const reason = cols[6]?.trim() || null;
    const observation = cols[7]?.trim() || null;

    if (!code || !physCountStr) { skipped++; continue; }
    const physicalCount = parseFloat(physCountStr);
    if (isNaN(physicalCount)) { skipped++; continue; }

    const item = itemByCode[code];
    if (!item) { skipped++; continue; }

    const systemStock = parseFloat(item.systemStock);
    const averageCost = parseFloat(item.averageCost);
    const diff = physicalCount - systemStock;
    const valuedImpact = diff * averageCost;

    await db.update(physicalCountItemsTable).set({
      physicalCount: String(physicalCount),
      difference: String(diff),
      valuedImpact: String(valuedImpact),
      reason: reason || item.reason,
      observation: observation || item.observation,
    }).where(eq(physicalCountItemsTable.id, item.id));
    updated++;
  }

  res.json({ updated, skipped, message: `${updated} líneas importadas, ${skipped} omitidas` });
});

router.get("/physical-counts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const detail = await buildCountDetail(id);
  if (!detail) { res.status(404).json({ error: "Toma física no encontrada" }); return; }
  res.json(detail);
});

router.post("/physical-counts", requireAuth, async (req, res): Promise<void> => {
  const { warehouseId, countDate, responsibleName, notes } = req.body ?? {};
  if (!warehouseId || !countDate || !responsibleName?.trim()) {
    res.status(400).json({ error: "warehouseId, countDate y responsibleName son requeridos" });
    return;
  }

  const [wh] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, warehouseId));
  if (!wh) { res.status(400).json({ error: "Bodega no encontrada" }); return; }

  const [newCount] = await db
    .insert(physicalCountsTable)
    .values({ warehouseId, countDate, responsibleName, notes: notes ?? null, status: "borrador", createdBy: req.session.userId! })
    .returning();

  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.warehouseId, warehouseId), eq(productsTable.isActive, true)))
    .orderBy(productsTable.name);

  if (products.length > 0) {
    await db.insert(physicalCountItemsTable).values(
      products.map((p) => ({
        physicalCountId: newCount.id,
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        unit: p.inventoryUnit,
        systemStock: p.currentStock,
        physicalCount: null,
        difference: null,
        averageCost: p.averageCost,
        valuedImpact: null,
        reason: null,
        observation: null,
      })),
    );
  }

  const detail = await buildCountDetail(newCount.id);
  res.status(201).json(detail);
});

router.put("/physical-counts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);

  const [existing] = await db.select().from(physicalCountsTable).where(eq(physicalCountsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Toma física no encontrada" }); return; }
  if (existing.status === "cerrada") { res.status(400).json({ error: "No se puede editar una toma cerrada" }); return; }

  const { responsibleName: newResponsible, notes: newNotes, items } = req.body ?? {};
  if (!Array.isArray(items)) { res.status(400).json({ error: "items debe ser un arreglo" }); return; }

  if (newResponsible !== undefined || newNotes !== undefined) {
    await db.update(physicalCountsTable)
      .set({
        ...(newResponsible !== undefined ? { responsibleName: newResponsible } : {}),
        ...(newNotes !== undefined ? { notes: newNotes } : {}),
      })
      .where(eq(physicalCountsTable.id, id));
  }

  for (const itemUpdate of items as Array<{ id: number; physicalCount?: number | null; reason?: string | null; observation?: string | null }>) {
    const [existingItem] = await db
      .select()
      .from(physicalCountItemsTable)
      .where(and(eq(physicalCountItemsTable.id, itemUpdate.id), eq(physicalCountItemsTable.physicalCountId, id)));

    if (!existingItem) continue;

    const physicalCount = itemUpdate.physicalCount ?? null;
    const systemStock = parseFloat(existingItem.systemStock);
    const averageCost = parseFloat(existingItem.averageCost);

    let difference: string | null = null;
    let valuedImpact: string | null = null;
    if (physicalCount !== null) {
      const diff = physicalCount - systemStock;
      difference = String(diff);
      valuedImpact = String(diff * averageCost);
    }

    await db.update(physicalCountItemsTable)
      .set({
        physicalCount: physicalCount !== null ? String(physicalCount) : null,
        difference,
        valuedImpact,
        reason: itemUpdate.reason ?? existingItem.reason,
        observation: itemUpdate.observation ?? existingItem.observation,
      })
      .where(eq(physicalCountItemsTable.id, itemUpdate.id));
  }

  const detail = await buildCountDetail(id);
  res.json(detail);
});

router.post("/physical-counts/:id/close", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);

  const [existing] = await db.select().from(physicalCountsTable).where(eq(physicalCountsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Toma física no encontrada" }); return; }
  if (existing.status === "cerrada") { res.status(400).json({ error: "La toma ya está cerrada" }); return; }

  const items = await db.select().from(physicalCountItemsTable).where(eq(physicalCountItemsTable.physicalCountId, id));
  const itemsWithCount = items.filter((i) => i.physicalCount != null);
  if (itemsWithCount.length === 0) {
    res.status(400).json({ error: "Debe ingresar al menos un conteo físico antes de cerrar" });
    return;
  }

  // Calculate summary values
  let shortageValue = 0;
  let surplusValue = 0;
  let totalDifferenceValue = 0;
  let totalSystemValue = 0;

  for (const item of itemsWithCount) {
    const diff = item.difference != null ? parseFloat(item.difference) : 0;
    const impact = item.valuedImpact != null ? parseFloat(item.valuedImpact) : 0;
    const sysStock = parseFloat(item.systemStock);
    const cost = parseFloat(item.averageCost);

    if (diff < 0) shortageValue += Math.abs(impact);
    else if (diff > 0) surplusValue += impact;

    totalDifferenceValue += impact;
    totalSystemValue += sysStock * cost;
  }

  const accuracyPercent = totalSystemValue > 0
    ? Math.max(0, 100 - ((shortageValue + surplusValue) / totalSystemValue) * 100)
    : 100;

  // Apply inventory adjustments
  const itemsWithDiff = itemsWithCount.filter((i) => i.difference != null && parseFloat(i.difference) !== 0);
  for (const item of itemsWithDiff) {
    const diff = parseFloat(item.difference!);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) continue;

    await db.insert(inventoryMovementsTable).values({
      productId: item.productId,
      type: diff > 0 ? "ajuste_entrada" : "ajuste_salida",
      quantity: String(Math.abs(diff)),
      unit: product.inventoryUnit,
      warehouseId: existing.warehouseId,
      createdBy: req.session.userId!,
      observations: `Ajuste por toma física #${id}${item.reason ? ` - ${item.reason.replace(/_/g, " ")}` : ""}${item.observation ? `: ${item.observation}` : ""}`,
    });

    const newStock = parseFloat(product.currentStock) + diff;
    await db.update(productsTable).set({ currentStock: String(Math.max(0, newStock)) }).where(eq(productsTable.id, item.productId));
  }

  await db.update(physicalCountsTable).set({
    status: "cerrada",
    closedAt: new Date(),
    closedBy: req.session.userId!,
    totalDifferenceValue: String(totalDifferenceValue),
    shortageValue: String(shortageValue),
    surplusValue: String(surplusValue),
    accuracyPercent: String(accuracyPercent.toFixed(2)),
  }).where(eq(physicalCountsTable.id, id));

  const detail = await buildCountDetail(id);
  res.json(detail);
});

export default router;

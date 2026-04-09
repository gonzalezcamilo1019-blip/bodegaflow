import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, warehousesTable, suppliersTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router: IRouter = Router();

// ---- Image upload setup ----
const uploadDir = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `product-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error("Solo imágenes JPG, PNG, WEBP, GIF"), ok);
  },
});

// ---- Helper ----
function buildResult(p: typeof productsTable.$inferSelect, extra: {
  categoryName?: string | null;
  warehouseName?: string | null;
  supplierName?: string | null;
}) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category ?? null,
    categoryId: p.categoryId,
    categoryName: extra.categoryName ?? null,
    supplierId: p.supplierId,
    supplierName: extra.supplierName ?? null,
    imageUrl: p.imageUrl,
    warehouseId: p.warehouseId,
    warehouseName: extra.warehouseName ?? null,
    inventoryUnit: p.inventoryUnit,
    requisitionUnit: p.requisitionUnit,
    purchaseUnit: p.purchaseUnit,
    conversionFactor: parseFloat(p.conversionFactor),
    currentStock: parseFloat(p.currentStock),
    minimumStock: parseFloat(p.minimumStock),
    targetStock: parseFloat(p.targetStock),
    averageCost: parseFloat(p.averageCost),
    isActive: p.isActive,
  };
}

// ---- Routes ----

router.get("/products", requireAuth, async (req, res): Promise<void> => {
  const { warehouseId, categoryId, supplierId, category, search, lowStock, isActive } = req.query as Record<string, string | undefined>;

  const rows = await db
    .select({
      product: productsTable,
      categoryName: categoriesTable.name,
      warehouseName: warehousesTable.name,
      supplierName: suppliersTable.name,
    })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(warehousesTable, eq(productsTable.warehouseId, warehousesTable.id))
    .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
    .where(
      and(
        isActive === "false" ? eq(productsTable.isActive, false) : eq(productsTable.isActive, true),
        warehouseId ? eq(productsTable.warehouseId, parseInt(warehouseId)) : undefined,
        categoryId ? eq(productsTable.categoryId, parseInt(categoryId)) : undefined,
        supplierId ? eq(productsTable.supplierId, parseInt(supplierId)) : undefined,
        category ? eq(productsTable.category, category) : undefined,
        search ? ilike(productsTable.name, `%${search}%`) : undefined,
        lowStock === "true" ? sql`${productsTable.currentStock} <= ${productsTable.minimumStock}` : undefined,
      ),
    )
    .orderBy(productsTable.name);

  res.json(rows.map((r) => buildResult(r.product, {
    categoryName: r.categoryName,
    warehouseName: r.warehouseName,
    supplierName: r.supplierName,
  })));
});

router.post("/products", requireAuth, async (req, res): Promise<void> => {
  const b = req.body ?? {};
  if (!b.name?.trim() || !b.warehouseId || !b.inventoryUnit?.trim()) {
    res.status(400).json({ error: "name, warehouseId e inventoryUnit son requeridos" });
    return;
  }

  // Auto-generate code
  const prefix = b.warehouseId === 1 || b.warehouseId === "1" ? "B1" : `W${b.warehouseId}`;
  const [wh] = await db.select({ code: warehousesTable.code }).from(warehousesTable).where(eq(warehousesTable.id, parseInt(String(b.warehouseId))));
  const whCode = wh?.code || prefix;
  const [countRow] = await db.select({ cnt: sql<number>`count(*)::int` }).from(productsTable).where(sql`${productsTable.code} like ${whCode + "-%"}`);
  const seq = String((countRow?.cnt ?? 0) + 1).padStart(4, "0");
  const code = b.code?.trim() || `${whCode}-${seq}`;

  const [product] = await db.insert(productsTable).values({
    code,
    name: b.name.trim(),
    category: b.category?.trim() || null,
    categoryId: b.categoryId ? parseInt(b.categoryId) : null,
    supplierId: b.supplierId ? parseInt(b.supplierId) : null,
    imageUrl: b.imageUrl || null,
    warehouseId: parseInt(String(b.warehouseId)),
    inventoryUnit: b.inventoryUnit.trim(),
    requisitionUnit: b.requisitionUnit?.trim() || b.inventoryUnit.trim(),
    purchaseUnit: b.purchaseUnit?.trim() || b.inventoryUnit.trim(),
    conversionFactor: String(b.conversionFactor ?? 1),
    currentStock: String(b.currentStock ?? 0),
    minimumStock: String(b.minimumStock ?? 0),
    targetStock: String(b.targetStock ?? 0),
    averageCost: String(b.averageCost ?? 0),
    isActive: b.isActive !== false,
  }).returning();

  const [cat] = product.categoryId ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)) : [];
  const [warehouseRow] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, product.warehouseId));
  const [sup] = product.supplierId ? await db.select().from(suppliersTable).where(eq(suppliersTable.id, product.supplierId)) : [];

  res.status(201).json(buildResult(product, { categoryName: cat?.name, warehouseName: warehouseRow?.name, supplierName: sup?.name }));
});

router.get("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [row] = await db
    .select({ product: productsTable, categoryName: categoriesTable.name, warehouseName: warehousesTable.name, supplierName: suppliersTable.name })
    .from(productsTable)
    .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
    .leftJoin(warehousesTable, eq(productsTable.warehouseId, warehousesTable.id))
    .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
    .where(eq(productsTable.id, id));
  if (!row) { res.status(404).json({ error: "Producto no encontrado" }); return; }
  res.json(buildResult(row.product, { categoryName: row.categoryName, warehouseName: row.warehouseName, supplierName: row.supplierName }));
});

router.patch("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const b = req.body ?? {};
  const updateData: Record<string, unknown> = {};

  if (b.name != null) updateData.name = b.name.trim();
  if (b.category !== undefined) updateData.category = b.category || null;
  if (b.categoryId !== undefined) updateData.categoryId = b.categoryId ? parseInt(b.categoryId) : null;
  if (b.supplierId !== undefined) updateData.supplierId = b.supplierId ? parseInt(b.supplierId) : null;
  if (b.imageUrl !== undefined) updateData.imageUrl = b.imageUrl || null;
  if (b.warehouseId != null) updateData.warehouseId = parseInt(b.warehouseId);
  if (b.inventoryUnit != null) updateData.inventoryUnit = b.inventoryUnit.trim();
  if (b.requisitionUnit != null) updateData.requisitionUnit = b.requisitionUnit.trim();
  if (b.purchaseUnit != null) updateData.purchaseUnit = b.purchaseUnit.trim();
  if (b.conversionFactor != null) updateData.conversionFactor = String(b.conversionFactor);
  if (b.currentStock != null) updateData.currentStock = String(b.currentStock);
  if (b.minimumStock != null) updateData.minimumStock = String(b.minimumStock);
  if (b.targetStock != null) updateData.targetStock = String(b.targetStock);
  if (b.averageCost != null) updateData.averageCost = String(b.averageCost);
  if (b.isActive != null) updateData.isActive = Boolean(b.isActive);

  if (!Object.keys(updateData).length) { res.status(400).json({ error: "Sin cambios" }); return; }

  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, id)).returning();
  if (!product) { res.status(404).json({ error: "Producto no encontrado" }); return; }

  const [cat] = product.categoryId ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, product.categoryId)) : [];
  const [warehouseRow] = await db.select().from(warehousesTable).where(eq(warehousesTable.id, product.warehouseId));
  const [sup] = product.supplierId ? await db.select().from(suppliersTable).where(eq(suppliersTable.id, product.supplierId)) : [];

  res.json(buildResult(product, { categoryName: cat?.name, warehouseName: warehouseRow?.name, supplierName: sup?.name }));
});

// Image upload
router.post("/products/:id/image", requireAuth, upload.single("image"), async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!req.file) { res.status(400).json({ error: "No se recibió imagen" }); return; }

  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Producto no encontrado" }); return; }

  // Delete old image file if exists
  if (existing.imageUrl) {
    const oldFile = path.join(process.cwd(), "public", existing.imageUrl.replace(/^\//, ""));
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  await db.update(productsTable).set({ imageUrl }).where(eq(productsTable.id, id));
  res.json({ imageUrl });
});

router.get("/categories", requireAuth, async (_req, res): Promise<void> => {
  const cats = await db.select().from(categoriesTable);
  res.json(cats.map((c) => ({ id: c.id, name: c.name })));
});

// Distinct category strings used in products (text field)
router.get("/products-categories", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ category: productsTable.category })
    .from(productsTable)
    .where(sql`${productsTable.category} is not null`)
    .orderBy(productsTable.category);
  res.json(rows.map((r) => r.category).filter(Boolean));
});

export default router;

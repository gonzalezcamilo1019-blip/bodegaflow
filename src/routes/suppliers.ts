import { Router, type IRouter } from "express";
import { db, suppliersTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/suppliers", requireAuth, async (req, res): Promise<void> => {
  const { search, isActive } = req.query as Record<string, string | undefined>;
  let query = db.select().from(suppliersTable).$dynamic();
  if (search) query = query.where(ilike(suppliersTable.name, `%${search}%`));
  else if (isActive === "false") query = query.where(eq(suppliersTable.isActive, false));
  else query = query.where(eq(suppliersTable.isActive, true));
  const rows = await query.orderBy(suppliersTable.name);
  res.json(rows.map((s) => ({ id: s.id, name: s.name, isActive: s.isActive })));
});

router.post("/suppliers", requireAuth, async (req, res): Promise<void> => {
  const { name } = req.body ?? {};
  if (!name?.trim()) { res.status(400).json({ error: "Nombre requerido" }); return; }
  const [supplier] = await db.insert(suppliersTable).values({ name: name.trim() }).returning();
  res.status(201).json({ id: supplier.id, name: supplier.name, isActive: supplier.isActive });
});

router.patch("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { name, isActive } = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (name != null) update.name = name.trim();
  if (isActive != null) update.isActive = Boolean(isActive);
  if (!Object.keys(update).length) { res.status(400).json({ error: "Sin cambios" }); return; }
  const [s] = await db.update(suppliersTable).set(update).where(eq(suppliersTable.id, id)).returning();
  if (!s) { res.status(404).json({ error: "Proveedor no encontrado" }); return; }
  res.json({ id: s.id, name: s.name, isActive: s.isActive });
});

export default router;

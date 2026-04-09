import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, areasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      passwordHash: usersTable.passwordHash,
      areaId: usersTable.areaId,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }

  let areaName: string | null = null;
  if (user.areaId) {
    const [area] = await db.select().from(areasTable).where(eq(areasTable.id, user.areaId));
    areaName = area?.name ?? null;
  }

  req.session.userId = user.id;

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    areaId: user.areaId,
    areaName,
  });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      areaId: usersTable.areaId,
      isActive: usersTable.isActive,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  let areaName: string | null = null;
  if (user.areaId) {
    const [area] = await db.select().from(areasTable).where(eq(areasTable.id, user.areaId));
    areaName = area?.name ?? null;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    areaId: user.areaId,
    areaName,
  });
});

export default router;

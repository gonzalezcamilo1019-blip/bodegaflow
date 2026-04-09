import { db, usersTable, areasTable, warehousesTable, categoriesTable, productsTable } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Areas
  const areas = await db.insert(areasTable).values([
    { name: "Bar" },
    { name: "Cocina" },
    { name: "Servicio" },
  ]).onConflictDoNothing().returning();

  console.log("Areas created:", areas.length);

  // Warehouses
  const [wh1, wh2] = await db.insert(warehousesTable).values([
    { name: "Bodega Principal", description: "Almacenamiento general de bebidas y licores" },
    { name: "Bodega Cocina", description: "Insumos y materiales de cocina" },
  ]).onConflictDoNothing().returning();

  console.log("Warehouses created:", [wh1, wh2].filter(Boolean).length);

  // Users
  const passwordHash = await bcrypt.hash("password123", 10);

  const allAreas = await db.select().from(areasTable);
  const barArea = allAreas.find((a) => a.name === "Bar");
  const cocinaArea = allAreas.find((a) => a.name === "Cocina");
  const servicioArea = allAreas.find((a) => a.name === "Servicio");

  const users = await db.insert(usersTable).values([
    { email: "lider@bodegaflow.com", passwordHash, name: "Carlos Martinez", role: "lider_compras", areaId: null },
    { email: "auxiliar@bodegaflow.com", passwordHash, name: "Maria Lopez", role: "auxiliar_compras", areaId: null },
    { email: "bar@bodegaflow.com", passwordHash, name: "Juan Perez", role: "area_bar", areaId: barArea?.id ?? null },
    { email: "cocina@bodegaflow.com", passwordHash, name: "Ana Garcia", role: "area_cocina", areaId: cocinaArea?.id ?? null },
    { email: "servicio@bodegaflow.com", passwordHash, name: "Luis Torres", role: "area_servicio", areaId: servicioArea?.id ?? null },
  ]).onConflictDoNothing().returning();

  console.log("Users created:", users.length);

  // Categories
  const cats = await db.insert(categoriesTable).values([
    { name: "Licores" },
    { name: "Vinos" },
    { name: "Cervezas" },
    { name: "Gaseosas y Jugos" },
    { name: "Insumos Cocina" },
    { name: "Frutas y Verduras" },
    { name: "Proteinas" },
    { name: "Lacteos" },
  ]).onConflictDoNothing().returning();

  console.log("Categories created:", cats.length);

  const allWarehouses = await db.select().from(warehousesTable);
  const allCategories = await db.select().from(categoriesTable);

  const bodegaPrincipal = allWarehouses.find((w) => w.name === "Bodega Principal");
  const bodegaCocina = allWarehouses.find((w) => w.name === "Bodega Cocina");
  const licores = allCategories.find((c) => c.name === "Licores");
  const vinos = allCategories.find((c) => c.name === "Vinos");
  const cervezas = allCategories.find((c) => c.name === "Cervezas");
  const gaseosas = allCategories.find((c) => c.name === "Gaseosas y Jugos");
  const insumos = allCategories.find((c) => c.name === "Insumos Cocina");
  const frutas = allCategories.find((c) => c.name === "Frutas y Verduras");
  const proteinas = allCategories.find((c) => c.name === "Proteinas");
  const lacteos = allCategories.find((c) => c.name === "Lacteos");

  if (!bodegaPrincipal || !bodegaCocina) {
    console.log("Warehouses not found, skipping products...");
    return;
  }

  // Products
  const products = await db.insert(productsTable).values([
    // Bar products
    { code: "LIC001", name: "Aguardiente Antioqueño 750ml", categoryId: licores?.id ?? null, warehouseId: bodegaPrincipal.id, inventoryUnit: "botella", requisitionUnit: "botella", purchaseUnit: "caja", conversionFactor: "12", currentStock: "24", minimumStock: "12", averageCost: "28000" },
    { code: "LIC002", name: "Ron Medellin 750ml", categoryId: licores?.id ?? null, warehouseId: bodegaPrincipal.id, inventoryUnit: "botella", requisitionUnit: "botella", purchaseUnit: "caja", conversionFactor: "12", currentStock: "18", minimumStock: "12", averageCost: "35000" },
    { code: "VIN001", name: "Vino Tinto Casillero del Diablo", categoryId: vinos?.id ?? null, warehouseId: bodegaPrincipal.id, inventoryUnit: "botella", requisitionUnit: "botella", purchaseUnit: "caja", conversionFactor: "12", currentStock: "6", minimumStock: "10", averageCost: "42000" },
    { code: "VIN002", name: "Vino Blanco Santa Helena", categoryId: vinos?.id ?? null, warehouseId: bodegaPrincipal.id, inventoryUnit: "botella", requisitionUnit: "botella", purchaseUnit: "caja", conversionFactor: "12", currentStock: "12", minimumStock: "8", averageCost: "38000" },
    { code: "CER001", name: "Club Colombia 330ml", categoryId: cervezas?.id ?? null, warehouseId: bodegaPrincipal.id, inventoryUnit: "unidad", requisitionUnit: "unidad", purchaseUnit: "paca", conversionFactor: "30", currentStock: "120", minimumStock: "60", averageCost: "3200" },
    { code: "CER002", name: "Corona 355ml", categoryId: cervezas?.id ?? null, warehouseId: bodegaPrincipal.id, inventoryUnit: "unidad", requisitionUnit: "unidad", purchaseUnit: "paca", conversionFactor: "24", currentStock: "48", minimumStock: "48", averageCost: "4800" },
    { code: "GAS001", name: "Coca-Cola 2L", categoryId: gaseosas?.id ?? null, warehouseId: bodegaPrincipal.id, inventoryUnit: "unidad", requisitionUnit: "unidad", purchaseUnit: "paquete", conversionFactor: "6", currentStock: "36", minimumStock: "24", averageCost: "5500" },
    { code: "GAS002", name: "Agua Cristal 600ml", categoryId: gaseosas?.id ?? null, warehouseId: bodegaPrincipal.id, inventoryUnit: "unidad", requisitionUnit: "unidad", purchaseUnit: "paquete", conversionFactor: "12", currentStock: "8", minimumStock: "24", averageCost: "1800" },
    // Kitchen products
    { code: "INS001", name: "Aceite de oliva 1L", categoryId: insumos?.id ?? null, warehouseId: bodegaCocina.id, inventoryUnit: "litro", requisitionUnit: "litro", purchaseUnit: "caja", conversionFactor: "6", currentStock: "12", minimumStock: "6", averageCost: "22000" },
    { code: "INS002", name: "Sal Marina 1kg", categoryId: insumos?.id ?? null, warehouseId: bodegaCocina.id, inventoryUnit: "kg", requisitionUnit: "kg", purchaseUnit: "saco", conversionFactor: "25", currentStock: "5", minimumStock: "3", averageCost: "2500" },
    { code: "FRU001", name: "Tomate cherry kg", categoryId: frutas?.id ?? null, warehouseId: bodegaCocina.id, inventoryUnit: "kg", requisitionUnit: "kg", purchaseUnit: "caja", conversionFactor: "5", currentStock: "3", minimumStock: "5", averageCost: "8500" },
    { code: "FRU002", name: "Lechuga hidroponica und", categoryId: frutas?.id ?? null, warehouseId: bodegaCocina.id, inventoryUnit: "unidad", requisitionUnit: "unidad", purchaseUnit: "caja", conversionFactor: "12", currentStock: "8", minimumStock: "10", averageCost: "3200" },
    { code: "PRO001", name: "Lomo de res kg", categoryId: proteinas?.id ?? null, warehouseId: bodegaCocina.id, inventoryUnit: "kg", requisitionUnit: "kg", purchaseUnit: "kg", conversionFactor: "1", currentStock: "15", minimumStock: "8", averageCost: "48000" },
    { code: "PRO002", name: "Salmon filete kg", categoryId: proteinas?.id ?? null, warehouseId: bodegaCocina.id, inventoryUnit: "kg", requisitionUnit: "kg", purchaseUnit: "kg", conversionFactor: "1", currentStock: "4", minimumStock: "6", averageCost: "85000" },
    { code: "LAC001", name: "Crema de leche 200ml", categoryId: lacteos?.id ?? null, warehouseId: bodegaCocina.id, inventoryUnit: "unidad", requisitionUnit: "unidad", purchaseUnit: "paquete", conversionFactor: "12", currentStock: "24", minimumStock: "12", averageCost: "3800" },
  ]).onConflictDoNothing().returning();

  console.log("Products created:", products.length);
  console.log("\nSeed complete! Users:");
  console.log("  lider@bodegaflow.com / password123 (Lider de Compras)");
  console.log("  auxiliar@bodegaflow.com / password123 (Auxiliar de Compras)");
  console.log("  bar@bodegaflow.com / password123 (Area de Bar)");
  console.log("  cocina@bodegaflow.com / password123 (Area de Cocina)");
  console.log("  servicio@bodegaflow.com / password123 (Area de Servicio)");
}

seed().catch(console.error).finally(() => process.exit(0));

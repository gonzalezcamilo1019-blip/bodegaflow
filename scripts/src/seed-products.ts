import {
  db,
  warehousesTable,
  suppliersTable,
  productsTable,
  categoriesTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

// Representative product catalog based on 12 categories for 2 bodegas
// Columns: name, category, packUnit, stock, supplier, warehouse (1 or 2)
const PRODUCT_DATA: Array<{
  name: string;
  category: string;
  packUnit: string;
  stock: number;
  supplier: string;
  warehouse: 1 | 2;
}> = [
  // === BODEGA 1 — BAR ===
  // Licores
  { name: "Aguardiente Antioqueño Sin Azúcar 750ml", category: "Licores", packUnit: "Botella", stock: 36, supplier: "Fabrica de Licores Antioquia", warehouse: 1 },
  { name: "Aguardiente Néctar Rojo 750ml", category: "Licores", packUnit: "Botella", stock: 24, supplier: "Fabrica de Licores Antioquia", warehouse: 1 },
  { name: "Ron Medellín Extra Añejo 750ml", category: "Licores", packUnit: "Botella", stock: 18, supplier: "Industria Licorera de Caldas", warehouse: 1 },
  { name: "Ron Viejo de Caldas 750ml", category: "Licores", packUnit: "Botella", stock: 24, supplier: "Industria Licorera de Caldas", warehouse: 1 },
  { name: "Vodka Absolut 750ml", category: "Licores", packUnit: "Botella", stock: 12, supplier: "Diageo Colombia", warehouse: 1 },
  { name: "Tequila José Cuervo Silver 750ml", category: "Licores", packUnit: "Botella", stock: 6, supplier: "Diageo Colombia", warehouse: 1 },
  { name: "Whisky Johnnie Walker Black 750ml", category: "Licores", packUnit: "Botella", stock: 8, supplier: "Diageo Colombia", warehouse: 1 },
  { name: "Gin Beefeater 750ml", category: "Licores", packUnit: "Botella", stock: 6, supplier: "Diageo Colombia", warehouse: 1 },
  { name: "Champaña Freixenet Cordon Negro 750ml", category: "Licores", packUnit: "Botella", stock: 12, supplier: "Winery Imports", warehouse: 1 },
  { name: "Baileys Irish Cream 750ml", category: "Licores", packUnit: "Botella", stock: 4, supplier: "Diageo Colombia", warehouse: 1 },
  // Cervezas
  { name: "Club Colombia Roja 330ml Caja x24", category: "Cervezas", packUnit: "Caja", stock: 10, supplier: "Bavaria SA", warehouse: 1 },
  { name: "Club Colombia Dorada 330ml Caja x24", category: "Cervezas", packUnit: "Caja", stock: 8, supplier: "Bavaria SA", warehouse: 1 },
  { name: "Águila 330ml Caja x24", category: "Cervezas", packUnit: "Caja", stock: 6, supplier: "Bavaria SA", warehouse: 1 },
  { name: "Heineken 330ml Caja x24", category: "Cervezas", packUnit: "Caja", stock: 5, supplier: "Bavaria SA", warehouse: 1 },
  { name: "Corona 355ml Caja x24", category: "Cervezas", packUnit: "Caja", stock: 4, supplier: "Postobón Importaciones", warehouse: 1 },
  { name: "Stella Artois 330ml Caja x24", category: "Cervezas", packUnit: "Caja", stock: 3, supplier: "Bavaria SA", warehouse: 1 },
  { name: "Poker 330ml Caja x30", category: "Cervezas", packUnit: "Caja", stock: 6, supplier: "Bavaria SA", warehouse: 1 },
  // Vinos
  { name: "Vino Tinto Casillero del Diablo Cabernet 750ml", category: "Vinos", packUnit: "Botella", stock: 18, supplier: "Winery Imports", warehouse: 1 },
  { name: "Vino Blanco Santa Helena Sauvignon Blanc 750ml", category: "Vinos", packUnit: "Botella", stock: 12, supplier: "Winery Imports", warehouse: 1 },
  { name: "Vino Rosado Santa Carolina 750ml", category: "Vinos", packUnit: "Botella", stock: 8, supplier: "Winery Imports", warehouse: 1 },
  { name: "Vino Tinto Gato Negro Malbec 750ml", category: "Vinos", packUnit: "Botella", stock: 12, supplier: "Winery Imports", warehouse: 1 },
  // Gaseosas y aguas
  { name: "Coca-Cola 2L Paq x6", category: "Gaseosas y aguas", packUnit: "Paquete", stock: 12, supplier: "Coca-Cola Colombia", warehouse: 1 },
  { name: "Sprite 2L Paq x6", category: "Gaseosas y aguas", packUnit: "Paquete", stock: 8, supplier: "Coca-Cola Colombia", warehouse: 1 },
  { name: "Agua Cristal 600ml Paq x12", category: "Gaseosas y aguas", packUnit: "Paquete", stock: 20, supplier: "Coca-Cola Colombia", warehouse: 1 },
  { name: "Agua Manantial 600ml Paq x12", category: "Gaseosas y aguas", packUnit: "Paquete", stock: 15, supplier: "Postobón SA", warehouse: 1 },
  { name: "Agua con Gas Perrier 330ml Caja x12", category: "Gaseosas y aguas", packUnit: "Caja", stock: 6, supplier: "Nestle Waters", warehouse: 1 },
  { name: "Tónica Schweppes 250ml Paq x6", category: "Gaseosas y aguas", packUnit: "Paquete", stock: 10, supplier: "Postobón SA", warehouse: 1 },
  { name: "Red Bull 250ml Caja x24", category: "Gaseosas y aguas", packUnit: "Caja", stock: 4, supplier: "Red Bull Colombia", warehouse: 1 },
  // Mezcladores / mixers
  { name: "Jugo de Naranja Natural 1L Botella", category: "Mezcladores / mixers", packUnit: "Botella", stock: 8, supplier: "Frutas del Valle", warehouse: 1 },
  { name: "Jugo de Maracuyá Concentrado 1L", category: "Mezcladores / mixers", packUnit: "Botella", stock: 6, supplier: "Frutas del Valle", warehouse: 1 },
  { name: "Limón Tahití kg", category: "Mezcladores / mixers", packUnit: "Kg", stock: 5, supplier: "Frutas del Valle", warehouse: 1 },
  { name: "Granadina Kola Román 750ml", category: "Mezcladores / mixers", packUnit: "Botella", stock: 4, supplier: "Kola Román", warehouse: 1 },
  { name: "Sirope de Caña 750ml", category: "Mezcladores / mixers", packUnit: "Botella", stock: 3, supplier: "Bar Supplies SAS", warehouse: 1 },
  { name: "Ginger Ale Canada Dry 350ml Paq x6", category: "Mezcladores / mixers", packUnit: "Paquete", stock: 6, supplier: "Postobón SA", warehouse: 1 },
  // Insumos de bar
  { name: "Cocteles Palillos x500und", category: "Insumos de bar", packUnit: "Caja", stock: 3, supplier: "Bar Supplies SAS", warehouse: 1 },
  { name: "Pajillas Biodegradables x200und", category: "Insumos de bar", packUnit: "Paquete", stock: 5, supplier: "Bar Supplies SAS", warehouse: 1 },
  { name: "Servilletas de Papel x500und", category: "Insumos de bar", packUnit: "Paquete", stock: 10, supplier: "Productos de Papel SA", warehouse: 1 },
  { name: "Hielo en Cubo 5kg", category: "Insumos de bar", packUnit: "Bolsa", stock: 0, supplier: "Hielos del Norte", warehouse: 1 },
  { name: "Sal para Margarita 500g", category: "Insumos de bar", packUnit: "Bolsa", stock: 2, supplier: "Bar Supplies SAS", warehouse: 1 },
  { name: "Aceitunas Verdes 500g", category: "Insumos de bar", packUnit: "Frasco", stock: 4, supplier: "Bar Supplies SAS", warehouse: 1 },

  // === BODEGA 2 — COCINA ===
  // Abarrotes
  { name: "Aceite de Girasol 3L", category: "Abarrotes", packUnit: "Galón", stock: 6, supplier: "Aceites La Favorita", warehouse: 2 },
  { name: "Aceite de Oliva Extra Virgen 1L", category: "Abarrotes", packUnit: "Botella", stock: 4, supplier: "Aceites La Favorita", warehouse: 2 },
  { name: "Arroz Blanco Premium 5kg", category: "Abarrotes", packUnit: "Bulto", stock: 8, supplier: "Molinos Roa SA", warehouse: 2 },
  { name: "Sal Marina 1kg", category: "Abarrotes", packUnit: "Bolsa", stock: 10, supplier: "Salinas Manaure", warehouse: 2 },
  { name: "Azúcar Blanca 5kg", category: "Abarrotes", packUnit: "Bulto", stock: 5, supplier: "Riopaila Castilla SA", warehouse: 2 },
  { name: "Harina de Trigo 10kg", category: "Abarrotes", packUnit: "Bulto", stock: 4, supplier: "Harinera del Valle", warehouse: 2 },
  { name: "Pasta Penne 500g Caja x12", category: "Abarrotes", packUnit: "Caja", stock: 3, supplier: "Doria SA", warehouse: 2 },
  { name: "Leche Entera Larga Vida 1L Caja x12", category: "Abarrotes", packUnit: "Caja", stock: 4, supplier: "Alpina SA", warehouse: 2 },
  { name: "Crema de Leche 200ml Paq x12", category: "Abarrotes", packUnit: "Paquete", stock: 6, supplier: "Alpina SA", warehouse: 2 },
  { name: "Queso Costeño 1kg", category: "Abarrotes", packUnit: "Kg", stock: 5, supplier: "Lácteos del Caribe", warehouse: 2 },
  // Salsas y aderezos
  { name: "Mayonesa Fruco 3.7kg", category: "Salsas y aderezos", packUnit: "Galón", stock: 3, supplier: "Unilever Colombia", warehouse: 2 },
  { name: "Salsa de Tomate Fruco 3.7kg", category: "Salsas y aderezos", packUnit: "Galón", stock: 3, supplier: "Unilever Colombia", warehouse: 2 },
  { name: "Mostaza Fruco 3.7kg", category: "Salsas y aderezos", packUnit: "Galón", stock: 2, supplier: "Unilever Colombia", warehouse: 2 },
  { name: "Salsa de Soya Kikoman 1.9L", category: "Salsas y aderezos", packUnit: "Botella", stock: 2, supplier: "Dispromed SAS", warehouse: 2 },
  { name: "Salsa Negra Worcestershire 590ml", category: "Salsas y aderezos", packUnit: "Botella", stock: 3, supplier: "Dispromed SAS", warehouse: 2 },
  { name: "Vinagre Blanco 3.8L", category: "Salsas y aderezos", packUnit: "Galón", stock: 2, supplier: "Postobón SA", warehouse: 2 },
  { name: "Salsa BBQ 3.7kg", category: "Salsas y aderezos", packUnit: "Galón", stock: 2, supplier: "Unilever Colombia", warehouse: 2 },
  // Cafetería
  { name: "Café Molido Juan Valdez 500g", category: "Cafetería", packUnit: "Bolsa", stock: 6, supplier: "Juan Valdez Café", warehouse: 2 },
  { name: "Azúcar Sobre Individual x100und", category: "Cafetería", packUnit: "Caja", stock: 4, supplier: "Riopaila Castilla SA", warehouse: 2 },
  { name: "Té Negro Twinings x50sob", category: "Cafetería", packUnit: "Caja", stock: 3, supplier: "Dispromed SAS", warehouse: 2 },
  { name: "Chocolate en Polvo Luker 400g", category: "Cafetería", packUnit: "Caja", stock: 4, supplier: "Casa Luker SA", warehouse: 2 },
  // Aseo
  { name: "Jabón Líquido para Manos 1L", category: "Aseo", packUnit: "Galón", stock: 4, supplier: "Essity Colombia", warehouse: 2 },
  { name: "Desinfectante Multiusos 5L", category: "Aseo", packUnit: "Galón", stock: 3, supplier: "Colgate-Palmolive", warehouse: 2 },
  { name: "Detergente para Vajilla 5L", category: "Aseo", packUnit: "Galón", stock: 4, supplier: "Colgate-Palmolive", warehouse: 2 },
  { name: "Esponja Limpiadora x10und", category: "Aseo", packUnit: "Paquete", stock: 5, supplier: "3M Colombia", warehouse: 2 },
  { name: "Paño de Cocina Húmedo x20und", category: "Aseo", packUnit: "Paquete", stock: 4, supplier: "Essity Colombia", warehouse: 2 },
  { name: "Toallas de Papel x6und", category: "Aseo", packUnit: "Paquete", stock: 6, supplier: "Productos de Papel SA", warehouse: 2 },
  { name: "Bolsas Basura 55x75cm x25und", category: "Aseo", packUnit: "Caja", stock: 5, supplier: "Plásticos Especiales SA", warehouse: 2 },
  // Desechables
  { name: "Vasos Desechables 8oz x50und", category: "Desechables", packUnit: "Paquete", stock: 10, supplier: "Plásticos Especiales SA", warehouse: 2 },
  { name: "Platos Desechables 22cm x25und", category: "Desechables", packUnit: "Paquete", stock: 8, supplier: "Plásticos Especiales SA", warehouse: 2 },
  { name: "Cubiertos Desechables Combo x50und", category: "Desechables", packUnit: "Paquete", stock: 6, supplier: "Plásticos Especiales SA", warehouse: 2 },
  { name: "Film Plástico Transparente 30cmx50m", category: "Desechables", packUnit: "Rollo", stock: 4, supplier: "Plásticos Especiales SA", warehouse: 2 },
  { name: "Papel Aluminio 30cmx25m", category: "Desechables", packUnit: "Rollo", stock: 4, supplier: "Plásticos Especiales SA", warehouse: 2 },
  // Operativos / utensilios
  { name: "Guantes de Cocina Talla M x100und", category: "Operativos / utensilios", packUnit: "Caja", stock: 3, supplier: "Essity Colombia", warehouse: 2 },
  { name: "Gorros Desechables x100und", category: "Operativos / utensilios", packUnit: "Bolsa", stock: 2, supplier: "Essity Colombia", warehouse: 2 },
  { name: "Tapabocas Tricapa x50und", category: "Operativos / utensilios", packUnit: "Caja", stock: 4, supplier: "Essity Colombia", warehouse: 2 },
  { name: "Tabla para Cortar Verde", category: "Operativos / utensilios", packUnit: "Unidad", stock: 2, supplier: "Bar Supplies SAS", warehouse: 2 },
  { name: "Espatula de Silicona", category: "Operativos / utensilios", packUnit: "Unidad", stock: 3, supplier: "Bar Supplies SAS", warehouse: 2 },
];

async function seedProducts() {
  console.log("🌱 Iniciando carga de productos maestros...\n");

  // 1. Update warehouses with codes
  await db.update(warehousesTable).set({ code: "B1", name: "Bodega #1 — Bar", isActive: true }).where(eq(warehousesTable.id, 1));
  await db.update(warehousesTable).set({ code: "B2", name: "Bodega #2 — Cocina", isActive: true }).where(eq(warehousesTable.id, 2));
  console.log("✅ Bodegas actualizadas (B1, B2)");

  // 2. Create unique suppliers
  const uniqueSupplierNames = [...new Set(PRODUCT_DATA.map((p) => p.supplier))].sort();
  for (const name of uniqueSupplierNames) {
    await db.insert(suppliersTable).values({ name, isActive: true }).onConflictDoNothing();
  }
  const allSuppliers = await db.select().from(suppliersTable);
  const supplierMap = Object.fromEntries(allSuppliers.map((s) => [s.name, s.id]));
  console.log(`✅ Proveedores creados: ${allSuppliers.length}`);

  // 3. Get warehouses
  const warehouses = await db.select().from(warehousesTable);
  const whMap: Record<number, number> = {};
  for (const wh of warehouses) {
    if (wh.code === "B1") whMap[1] = wh.id;
    if (wh.code === "B2") whMap[2] = wh.id;
  }

  // 4. Disable all existing sample products
  await db.update(productsTable).set({ isActive: false });
  console.log("⚠️  Productos de prueba desactivados");

  // 5. Insert products
  const counters: Record<number, number> = { 1: 0, 2: 0 };
  let created = 0;
  let skipped = 0;

  for (const p of PRODUCT_DATA) {
    counters[p.warehouse] = (counters[p.warehouse] ?? 0) + 1;
    const warehouseId = whMap[p.warehouse];
    if (!warehouseId) continue;

    const prefix = p.warehouse === 1 ? "B1" : "B2";
    const seq = String(counters[p.warehouse]).padStart(4, "0");
    const code = `${prefix}-${seq}`;

    const minStock = Math.max(1, Math.round(p.stock * 0.3));
    const targetStock = p.stock > 0 ? p.stock : 1;

    try {
      await db.insert(productsTable).values({
        code,
        name: p.name,
        category: p.category,
        supplierId: supplierMap[p.supplier] ?? null,
        warehouseId,
        inventoryUnit: p.packUnit,
        requisitionUnit: p.packUnit,
        purchaseUnit: p.packUnit,
        currentStock: String(p.stock),
        minimumStock: String(minStock),
        targetStock: String(targetStock),
        averageCost: "0",
        isActive: true,
      }).onConflictDoNothing();
      created++;
    } catch (e) {
      console.error(`Error inserting ${p.name}:`, e);
      skipped++;
    }
  }

  console.log(`\n✅ Productos creados: ${created}`);
  if (skipped > 0) console.log(`⚠️  Productos con error: ${skipped}`);

  const total = await db.select({ cnt: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.isActive, true));
  console.log(`📦 Total productos activos en DB: ${total[0].cnt}`);

  console.log("\n📋 Resumen por bodega:");
  console.log(`  Bodega #1 (Bar): ${PRODUCT_DATA.filter((p) => p.warehouse === 1).length} productos`);
  console.log(`  Bodega #2 (Cocina): ${PRODUCT_DATA.filter((p) => p.warehouse === 2).length} productos`);
  console.log("\n✅ Carga completa. El sistema está listo para la primera toma física.");
}

seedProducts().catch(console.error).finally(() => process.exit(0));

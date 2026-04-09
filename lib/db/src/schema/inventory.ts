import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { warehousesTable } from "./warehouses";
import { usersTable } from "./users";
import { requisitionsTable } from "./requisitions";

export const inventoryMovementsTable = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  type: text("type").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id),
  destinationWarehouseId: integer("destination_warehouse_id").references(() => warehousesTable.id),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  requisitionId: integer("requisition_id").references(() => requisitionsTable.id),
  observations: text("observations"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovementsTable).omit({ id: true, createdAt: true });
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;

import { pgTable, text, serial, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { warehousesTable } from "./warehouses";
import { suppliersTable } from "./suppliers";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  imageUrl: text("image_url"),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id),
  inventoryUnit: text("inventory_unit").notNull(),
  requisitionUnit: text("requisition_unit").notNull(),
  purchaseUnit: text("purchase_unit").notNull(),
  conversionFactor: numeric("conversion_factor", { precision: 10, scale: 4 }).notNull().default("1"),
  currentStock: numeric("current_stock", { precision: 12, scale: 4 }).notNull().default("0"),
  minimumStock: numeric("minimum_stock", { precision: 12, scale: 4 }).notNull().default("0"),
  targetStock: numeric("target_stock", { precision: 12, scale: 4 }).notNull().default("0"),
  averageCost: numeric("average_cost", { precision: 12, scale: 4 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;

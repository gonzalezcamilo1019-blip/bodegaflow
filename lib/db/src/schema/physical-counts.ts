import { pgTable, text, serial, timestamp, integer, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { warehousesTable } from "./warehouses";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const physicalCountsTable = pgTable("physical_counts", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id),
  countDate: date("count_date").notNull(),
  responsibleName: text("responsible_name").notNull(),
  status: text("status").notNull().default("borrador"),
  notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  closedBy: integer("closed_by").references(() => usersTable.id),
  totalDifferenceValue: numeric("total_difference_value", { precision: 14, scale: 4 }),
  shortageValue: numeric("shortage_value", { precision: 14, scale: 4 }),
  surplusValue: numeric("surplus_value", { precision: 14, scale: 4 }),
  accuracyPercent: numeric("accuracy_percent", { precision: 6, scale: 2 }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const physicalCountItemsTable = pgTable("physical_count_items", {
  id: serial("id").primaryKey(),
  physicalCountId: integer("physical_count_id").notNull().references(() => physicalCountsTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  productCode: text("product_code").notNull().default(""),
  productName: text("product_name").notNull().default(""),
  unit: text("unit").notNull().default(""),
  systemStock: numeric("system_stock", { precision: 12, scale: 4 }).notNull(),
  physicalCount: numeric("physical_count", { precision: 12, scale: 4 }),
  difference: numeric("difference", { precision: 12, scale: 4 }),
  averageCost: numeric("average_cost", { precision: 12, scale: 4 }).notNull(),
  valuedImpact: numeric("valued_impact", { precision: 14, scale: 4 }),
  reason: text("reason"),
  observation: text("observation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPhysicalCountSchema = createInsertSchema(physicalCountsTable).omit({ id: true, createdAt: true, updatedAt: true, closedAt: true });
export type InsertPhysicalCount = z.infer<typeof insertPhysicalCountSchema>;
export type PhysicalCount = typeof physicalCountsTable.$inferSelect;

export const insertPhysicalCountItemSchema = createInsertSchema(physicalCountItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPhysicalCountItem = z.infer<typeof insertPhysicalCountItemSchema>;
export type PhysicalCountItem = typeof physicalCountItemsTable.$inferSelect;

export const DIFFERENCE_REASONS = [
  "merma",
  "error_de_conteo",
  "error_de_despacho",
  "vencimiento",
  "rotura",
  "consumo_no_requisitado",
  "traslado_no_registrado",
  "sobrante_por_error_previo",
  "otro",
] as const;

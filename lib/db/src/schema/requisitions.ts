import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable, areasTable } from "./users";
import { productsTable } from "./products";

export const requisitionsTable = pgTable("requisitions", {
  id: serial("id").primaryKey(),
  areaId: integer("area_id").notNull().references(() => areasTable.id),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("borrador"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const requisitionItemsTable = pgTable("requisition_items", {
  id: serial("id").primaryKey(),
  requisitionId: integer("requisition_id").notNull().references(() => requisitionsTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  requestedQuantity: numeric("requested_quantity", { precision: 12, scale: 4 }).notNull(),
  approvedQuantity: numeric("approved_quantity", { precision: 12, scale: 4 }),
  dispatchedQuantity: numeric("dispatched_quantity", { precision: 12, scale: 4 }),
  unit: text("unit").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequisitionSchema = createInsertSchema(requisitionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRequisition = z.infer<typeof insertRequisitionSchema>;
export type Requisition = typeof requisitionsTable.$inferSelect;

export const insertRequisitionItemSchema = createInsertSchema(requisitionItemsTable).omit({ id: true, createdAt: true });
export type InsertRequisitionItem = z.infer<typeof insertRequisitionItemSchema>;
export type RequisitionItem = typeof requisitionItemsTable.$inferSelect;

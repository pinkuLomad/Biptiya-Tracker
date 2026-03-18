import { sql } from "drizzle-orm";
import { pgTable, text, varchar, bigint, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const spots = pgTable("spots", {
  id: varchar("id").primaryKey(),
  player: text("player").notNull(),
  at: bigint("at", { mode: "number" }).notNull(),
  cutuDriving: boolean("cutu_driving").notNull().default(false),
});

export const insertSpotSchema = createInsertSchema(spots);

export type InsertSpot = z.infer<typeof insertSpotSchema>;
export type Spot = typeof spots.$inferSelect;

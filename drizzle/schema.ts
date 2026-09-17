import { int, index, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const duos = mysqlTable("duos", {
  id: int("id").autoincrement().primaryKey(),
  inviteCode: varchar("inviteCode", { length: 12 }).notNull().unique(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const duoMembers = mysqlTable("duoMembers", {
  id: int("id").autoincrement().primaryKey(),
  duoId: int("duoId").notNull(),
  userId: int("userId").notNull(),
  nickname: varchar("nickname", { length: 80 }),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => ({
  duoUserUnique: uniqueIndex("duoMembers_duo_user_unique").on(table.duoId, table.userId),
  userIdx: index("duoMembers_user_idx").on(table.userId),
}));

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  duoId: int("duoId").notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  category: varchar("category", { length: 64 }).default("Daily").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  duoIdx: index("tasks_duo_idx").on(table.duoId),
}));

export const taskCompletions = mysqlTable("taskCompletions", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  dayKey: varchar("dayKey", { length: 10 }).notNull(),
  isDone: int("isDone").default(1).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  completionUnique: uniqueIndex("taskCompletions_task_user_day_unique").on(table.taskId, table.userId, table.dayKey),
  dayIdx: index("taskCompletions_day_idx").on(table.dayKey),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Duo = typeof duos.$inferSelect;
export type DuoMember = typeof duoMembers.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskCompletion = typeof taskCompletions.$inferSelect;

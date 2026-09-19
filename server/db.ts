import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { duoMembers, duos, InsertUser, taskCompletions, tasks, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to initialize database connection:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    for (const field of textFields) {
      if (user[field] !== undefined) {
        values[field] = user[field] ?? null;
        updateSet[field] = user[field] ?? null;
      }
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    } else {
      values.lastSignedIn = new Date();
      updateSet.lastSignedIn = new Date();
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Error in upsertUser:", error);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  } catch (error) {
    console.warn("[Database] Failed to query user by openId:", error);
    return undefined;
  }
}

export async function getDuoForUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const rows = await db.select({ duo: duos, member: duoMembers })
      .from(duoMembers)
      .innerJoin(duos, eq(duoMembers.duoId, duos.id))
      .where(eq(duoMembers.userId, userId))
      .limit(1);
    return rows[0];
  } catch (error) {
    console.warn("[Database] Failed to query duo for user:", error);
    return undefined;
  }
}

export async function getDuoMembers(duoId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select({
      id: duoMembers.userId,
      name: users.name,
      nickname: duoMembers.nickname,
    }).from(duoMembers).innerJoin(users, eq(duoMembers.userId, users.id))
      .where(eq(duoMembers.duoId, duoId)).orderBy(asc(duoMembers.joinedAt));
  } catch (error) {
    console.warn("[Database] Failed to query duo members:", error);
    return [];
  }
}

export async function createDuo(userId: number, nickname?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const inviteCode = nanoid(8).toUpperCase();
  const result = await db.insert(duos).values({ inviteCode, createdBy: userId });
  const duoId = Number(result[0].insertId);
  await db.insert(duoMembers).values({ duoId, userId, nickname: nickname || null });
  const defaultTasks = ["Plan the day together", "Move your body for 20 minutes", "Drink enough water", "10-minute evening reset"];
  await db.insert(tasks).values(defaultTasks.map((title, index) => ({ duoId, title, sortOrder: index, createdBy: userId })));
  return { duoId, inviteCode };
}

export async function joinDuo(userId: number, inviteCode: string, nickname?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const duo = (await db.select().from(duos).where(eq(duos.inviteCode, inviteCode.toUpperCase())).limit(1))[0];
  if (!duo) throw new Error("That invite code is not valid");
  const members = await getDuoMembers(duo.id);
  if (members.some((member) => member.id === userId)) return { duoId: duo.id, inviteCode: duo.inviteCode };
  if (members.length >= 2) throw new Error("This duo already has two people");
  await db.insert(duoMembers).values({ duoId: duo.id, userId, nickname: nickname || null });
  return { duoId: duo.id, inviteCode: duo.inviteCode };
}

export async function isDuoMember(userId: number, duoId: number) {
  const db = await getDb();
  if (!db) return false;
  try {
    const row = await db.select({ id: duoMembers.id }).from(duoMembers)
      .where(and(eq(duoMembers.duoId, duoId), eq(duoMembers.userId, userId))).limit(1);
    return row.length > 0;
  } catch (error) {
    return false;
  }
}

export async function getTasks(duoId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(tasks).where(eq(tasks.duoId, duoId)).orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
  } catch (error) {
    console.warn("[Database] Failed to get tasks:", error);
    return [];
  }
}

export async function getCompletions(taskIds: number[], dayKeys: string[]) {
  const db = await getDb();
  if (!db || taskIds.length === 0 || dayKeys.length === 0) return [];
  try {
    return await db.select().from(taskCompletions).where(and(inArray(taskCompletions.taskId, taskIds), inArray(taskCompletions.dayKey, dayKeys)));
  } catch (error) {
    console.warn("[Database] Failed to get completions:", error);
    return [];
  }
}

export async function addTask(duoId: number, userId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const current = await db.select({ maxOrder: sql<number>`coalesce(max(${tasks.sortOrder}), -1)` }).from(tasks).where(eq(tasks.duoId, duoId));
  const sortOrder = Number(current[0]?.maxOrder ?? -1) + 1;
  const result = await db.insert(tasks).values({ duoId, title, sortOrder, createdBy: userId });
  return Number(result[0].insertId);
}

export async function setCompletion(taskId: number, userId: number, dayKey: string, isDone: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(taskCompletions).values({ taskId, userId, dayKey, isDone: isDone ? 1 : 0 })
    .onDuplicateKeyUpdate({ set: { isDone: isDone ? 1 : 0, updatedAt: new Date() } });
}

export function getDayKeys(dayKey: string, count = 28) {
  const base = new Date(`${dayKey}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

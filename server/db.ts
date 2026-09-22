import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { duoMembers, duos, InsertUser, taskCompletions, tasks, users, User, Duo, DuoMember, Task, TaskCompletion } from "../drizzle/schema";
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

// In-memory store fallback for local development without MySQL
const memUsers = new Map<string, User>();
let nextUserId = 1;
const memDuos = new Map<number, Duo>();
let nextDuoId = 1;
const memDuoMembers: DuoMember[] = [];
let nextMemberId = 1;
const memTasks: Task[] = [];
let nextTaskId = 1;
const memCompletions = new Map<string, TaskCompletion>();
let nextCompletionId = 1;

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (db) {
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
      return;
    } catch (error) {
      console.warn("[Database] Error in MySQL upsertUser, using memory fallback:", error);
    }
  }

  // Memory fallback
  const now = new Date();
  const existing = memUsers.get(user.openId);
  if (existing) {
    existing.name = user.name !== undefined ? (user.name ?? null) : existing.name;
    existing.email = user.email !== undefined ? (user.email ?? null) : existing.email;
    existing.loginMethod = user.loginMethod !== undefined ? (user.loginMethod ?? null) : existing.loginMethod;
    existing.role = user.role !== undefined ? user.role : (user.openId === ENV.ownerOpenId ? "admin" : existing.role);
    existing.lastSignedIn = user.lastSignedIn ?? now;
    existing.updatedAt = now;
  } else {
    const newUser: User = {
      id: nextUserId++,
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      createdAt: now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? now,
    };
    memUsers.set(user.openId, newUser);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (db) {
    try {
      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (result.length > 0) return result[0];
    } catch (error) {
      console.warn("[Database] Failed to query user by openId, using memory fallback:", error);
    }
  }
  return memUsers.get(openId);
}

export async function getDuoForUser(userId: number) {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.select({ duo: duos, member: duoMembers })
        .from(duoMembers)
        .innerJoin(duos, eq(duoMembers.duoId, duos.id))
        .where(eq(duoMembers.userId, userId))
        .limit(1);
      if (rows.length > 0) return rows[0];
    } catch (error) {
      console.warn("[Database] Failed to query duo for user, using memory fallback:", error);
    }
  }

  const membership = memDuoMembers.find(m => m.userId === userId);
  if (!membership) return undefined;
  const duo = memDuos.get(membership.duoId);
  if (!duo) return undefined;
  return { duo, member: membership };
}

export async function getDuoMembers(duoId: number) {
  const db = await getDb();
  if (db) {
    try {
      return await db.select({
        id: duoMembers.userId,
        name: users.name,
        nickname: duoMembers.nickname,
      }).from(duoMembers).innerJoin(users, eq(duoMembers.userId, users.id))
        .where(eq(duoMembers.duoId, duoId)).orderBy(asc(duoMembers.joinedAt));
    } catch (error) {
      console.warn("[Database] Failed to query duo members, using memory fallback:", error);
    }
  }

  const userList = Array.from(memUsers.values());
  return memDuoMembers
    .filter(m => m.duoId === duoId)
    .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())
    .map(m => {
      const user = userList.find(u => u.id === m.userId);
      return {
        id: m.userId,
        name: user?.name ?? null,
        nickname: m.nickname,
      };
    });
}

export async function createDuo(userId: number, nickname?: string) {
  const defaultTasks = ["Plan the day together", "Move your body for 20 minutes", "Drink enough water", "10-minute evening reset"];
  const db = await getDb();
  if (db) {
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const result = await db.insert(duos).values({ inviteCode, createdBy: userId });
      const duoId = Number(result[0].insertId);
      await db.insert(duoMembers).values({ duoId, userId, nickname: nickname || null });
      await db.insert(tasks).values(defaultTasks.map((title, index) => ({ duoId, title, sortOrder: index, createdBy: userId })));
      return { duoId, inviteCode };
    } catch (error) {
      console.warn("[Database] Error creating duo in MySQL, using memory fallback:", error);
    }
  }

  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const duoId = nextDuoId++;
  const now = new Date();
  const duo: Duo = { id: duoId, inviteCode, createdBy: userId, createdAt: now };
  memDuos.set(duoId, duo);
  memDuoMembers.push({ id: nextMemberId++, duoId, userId, nickname: nickname || null, joinedAt: now });
  defaultTasks.forEach((title, index) => {
    memTasks.push({ id: nextTaskId++, duoId, title, category: "Daily", sortOrder: index, createdBy: userId, createdAt: now });
  });
  return { duoId, inviteCode };
}

export async function joinDuo(userId: number, inviteCode: string, nickname?: string) {
  const cleanCode = inviteCode.trim().toUpperCase();
  const db = await getDb();
  if (db) {
    try {
      const duo = (await db.select().from(duos).where(eq(duos.inviteCode, cleanCode)).limit(1))[0];
      if (duo) {
        const members = await getDuoMembers(duo.id);
        if (members.some((member) => member.id === userId)) return { duoId: duo.id, inviteCode: duo.inviteCode };
        if (members.length >= 2) throw new Error("This duo already has two people");
        await db.insert(duoMembers).values({ duoId: duo.id, userId, nickname: nickname || null });
        return { duoId: duo.id, inviteCode: duo.inviteCode };
      }
    } catch (error: any) {
      if (error.message?.includes("already has two people")) throw error;
      console.warn("[Database] Error in joinDuo MySQL, checking memory fallback:", error);
    }
  }

  let duo: Duo | undefined;
  for (const d of memDuos.values()) {
    if (d.inviteCode === cleanCode) {
      duo = d;
      break;
    }
  }
  if (!duo) throw new Error("That invite code is not valid");

  const members = await getDuoMembers(duo.id);
  if (members.some((member) => member.id === userId)) return { duoId: duo.id, inviteCode: duo.inviteCode };
  if (members.length >= 2) throw new Error("This duo already has two people");

  memDuoMembers.push({ id: nextMemberId++, duoId: duo.id, userId, nickname: nickname || null, joinedAt: new Date() });
  return { duoId: duo.id, inviteCode: duo.inviteCode };
}

export async function isDuoMember(userId: number, duoId: number) {
  const db = await getDb();
  if (db) {
    try {
      const row = await db.select({ id: duoMembers.id }).from(duoMembers)
        .where(and(eq(duoMembers.duoId, duoId), eq(duoMembers.userId, userId))).limit(1);
      return row.length > 0;
    } catch (error) {
      // fallback
    }
  }
  return memDuoMembers.some(m => m.duoId === duoId && m.userId === userId);
}

export async function getTasks(duoId: number) {
  const db = await getDb();
  if (db) {
    try {
      return await db.select().from(tasks).where(eq(tasks.duoId, duoId)).orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
    } catch (error) {
      console.warn("[Database] Failed to get tasks from MySQL, using memory fallback:", error);
    }
  }
  return memTasks
    .filter(t => t.duoId === duoId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getCompletions(taskIds: number[], dayKeys: string[]) {
  if (taskIds.length === 0 || dayKeys.length === 0) return [];
  const db = await getDb();
  if (db) {
    try {
      return await db.select().from(taskCompletions).where(and(inArray(taskCompletions.taskId, taskIds), inArray(taskCompletions.dayKey, dayKeys)));
    } catch (error) {
      console.warn("[Database] Failed to get completions from MySQL, using memory fallback:", error);
    }
  }

  const taskIdSet = new Set(taskIds);
  const dayKeySet = new Set(dayKeys);
  const results: TaskCompletion[] = [];
  for (const comp of memCompletions.values()) {
    if (taskIdSet.has(comp.taskId) && dayKeySet.has(comp.dayKey)) {
      results.push(comp);
    }
  }
  return results;
}

export async function addTask(duoId: number, userId: number, title: string) {
  const db = await getDb();
  if (db) {
    try {
      const current = await db.select({ maxOrder: sql<number>`coalesce(max(${tasks.sortOrder}), -1)` }).from(tasks).where(eq(tasks.duoId, duoId));
      const sortOrder = Number(current[0]?.maxOrder ?? -1) + 1;
      const result = await db.insert(tasks).values({ duoId, title, sortOrder, createdBy: userId });
      return Number(result[0].insertId);
    } catch (error) {
      console.warn("[Database] Error in addTask MySQL, using memory fallback:", error);
    }
  }

  const existingDuoTasks = memTasks.filter(t => t.duoId === duoId);
  const maxOrder = existingDuoTasks.reduce((max, t) => Math.max(max, t.sortOrder), -1);
  const id = nextTaskId++;
  const newTask: Task = {
    id,
    duoId,
    title,
    category: "Daily",
    sortOrder: maxOrder + 1,
    createdBy: userId,
    createdAt: new Date(),
  };
  memTasks.push(newTask);
  return id;
}

export async function setCompletion(taskId: number, userId: number, dayKey: string, isDone: boolean) {
  const db = await getDb();
  if (db) {
    try {
      await db.insert(taskCompletions).values({ taskId, userId, dayKey, isDone: isDone ? 1 : 0 })
        .onDuplicateKeyUpdate({ set: { isDone: isDone ? 1 : 0, updatedAt: new Date() } });
      return;
    } catch (error) {
      console.warn("[Database] Error in setCompletion MySQL, using memory fallback:", error);
    }
  }

  const key = `${taskId}-${userId}-${dayKey}`;
  const now = new Date();
  const existing = memCompletions.get(key);
  if (existing) {
    existing.isDone = isDone ? 1 : 0;
    existing.updatedAt = now;
  } else {
    const newComp: TaskCompletion = {
      id: nextCompletionId++,
      taskId,
      userId,
      dayKey,
      isDone: isDone ? 1 : 0,
      updatedAt: now,
    };
    memCompletions.set(key, newComp);
  }
}

export function getDayKeys(dayKey: string, count = 28) {
  const base = new Date(`${dayKey}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() - (count - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

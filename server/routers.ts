import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { createDuo, addTask, removeTask, getCompletions, getDayKeys, getDuoForUser, getDuoMembers, getTasks, isDuoMember, joinDuo, setCompletion, upsertUser, getUserByOpenId } from "./db";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";

const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ name: z.string().trim().min(1).max(80) }))
      .mutation(async ({ ctx, input }) => {
        const cleanName = input.name.trim();
        const openId = `local_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "user"}`;
        await upsertUser({
          openId,
          name: cleanName,
          email: `${openId}@local.test`,
          loginMethod: "local",
          lastSignedIn: new Date(),
        });
        const user = await getUserByOpenId(openId);
        const sessionToken = await sdk.createSessionToken(openId, {
          name: cleanName,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  duo: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const record = await getDuoForUser(ctx.user.id);
      if (!record) return null;
      return {
        id: record.duo.id,
        inviteCode: record.duo.inviteCode,
        members: await getDuoMembers(record.duo.id),
      };
    }),
    create: protectedProcedure.input(z.object({ nickname: z.string().trim().max(80).optional() })).mutation(async ({ ctx, input }) => {
      const existing = await getDuoForUser(ctx.user.id);
      if (existing) return { duoId: existing.duo.id, inviteCode: existing.duo.inviteCode };
      return createDuo(ctx.user.id, input.nickname);
    }),
    join: protectedProcedure.input(z.object({ inviteCode: z.string().trim().min(4).max(12), nickname: z.string().trim().max(80).optional() })).mutation(async ({ ctx, input }) => {
      return joinDuo(ctx.user.id, input.inviteCode, input.nickname);
    }),
  }),
  todo: router({
    dashboard: protectedProcedure.input(z.object({ dayKey: dayKeySchema })).query(async ({ ctx, input }) => {
      const record = await getDuoForUser(ctx.user.id);
      if (!record) return null;
      const members = await getDuoMembers(record.duo.id);
      const duoTasks = await getTasks(record.duo.id);
      const dayKeys = getDayKeys(input.dayKey);
      const completions = await getCompletions(duoTasks.map(task => task.id), dayKeys);
      return { duo: { id: record.duo.id, inviteCode: record.duo.inviteCode }, members, tasks: duoTasks, completions };
    }),
    add: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(240) })).mutation(async ({ ctx, input }) => {
      const record = await getDuoForUser(ctx.user.id);
      if (!record) throw new Error("Join a duo before adding tasks");
      await addTask(record.duo.id, ctx.user.id, input.title);
      return { success: true } as const;
    }),
    toggle: protectedProcedure.input(z.object({ taskId: z.number().int().positive(), dayKey: dayKeySchema, isDone: z.boolean() })).mutation(async ({ ctx, input }) => {
      const record = await getDuoForUser(ctx.user.id);
      if (!record) throw new Error("Join a duo before marking tasks");
      const task = (await getTasks(record.duo.id)).find(item => item.id === input.taskId);
      if (!task || !(await isDuoMember(ctx.user.id, record.duo.id))) throw new Error("Task not found in your duo");
      await setCompletion(input.taskId, ctx.user.id, input.dayKey, input.isDone);
      return { success: true } as const;
    }),
    remove: protectedProcedure.input(z.object({ taskId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const record = await getDuoForUser(ctx.user.id);
      if (!record) throw new Error("Join a duo before managing tasks");
      if (!(await isDuoMember(ctx.user.id, record.duo.id))) throw new Error("Not authorized");
      await removeTask(record.duo.id, input.taskId);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;

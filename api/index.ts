// @ts-nocheck
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth.js";
import { registerStorageProxy } from "../server/_core/storageProxy.js";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`[tRPC Error] on path ${path}:`, error);
    },
  })
);

// Global fallback error handler to prevent Vercel 500 HTML error pages
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[API Serverless Error]:", err);
  res.status(500).json({
    error: {
      message: err?.message || "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    },
  });
});

export default function handler(req: express.Request, res: express.Response) {
  return app(req, res);
}



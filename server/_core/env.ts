export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  githubClientId: process.env.CLIENT_ID ?? "",
  githubClientSecret: process.env.CLIENT_SECRET ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.FORGE_API_URL ?? "https://api.dev.forge.build",
  forgeApiKey: process.env.FORGE_API_KEY ?? "",
};


// @ts-nocheck
import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "../../shared/const";
import { ForbiddenError } from "../../shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

class SDKServer {
  /**
   * Exchange GitHub authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: ENV.githubClientId,
        client_secret: ENV.githubClientSecret,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );
    if (response.data.error) {
      throw new Error(`GitHub OAuth error: ${response.data.error_description}`);
    }
    return response.data.access_token;
  }

  /**
   * Get user information from GitHub using access token
   */
  async getUserInfo(accessToken: string): Promise<{ openId: string; name: string | null; email: string | null; loginMethod: string }> {
    const [userResponse, emailResponse] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const primaryEmail = emailResponse.data.find((e: any) => e.primary)?.email || null;
    
    return {
      openId: userResponse.data.id.toString(),
      name: userResponse.data.name || userResponse.data.login,
      email: primaryEmail,
      loginMethod: "github",
    };
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId || "duoday-app",
        name: options.name || "User",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId || "duoday-app",
      name: payload.name || "User",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) return null;

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId)) return null;

      return {
        openId,
        appId: isNonEmptyString(appId) ? appId : (ENV.appId || "duoday-app"),
        name: isNonEmptyString(name) ? name : "User",
      };
    } catch (error) {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    if (!user) {
      await db.upsertUser({
        openId: session.openId,
        name: session.name || "User",
        email: null,
        loginMethod: "local",
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(session.openId);
      if (!user) {
        throw ForbiddenError("Failed to sync user info");
      }
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

export const sdk = new SDKServer();



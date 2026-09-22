import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = () => {
  const githubClientId = import.meta.env.CLIENT_ID || "";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  if (!githubClientId) {
    console.warn("[Auth] GitHub Client ID is not configured (CLIENT_ID)");
    return;
  }

  try {
    const nonce = crypto.randomUUID();
    document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
    const state = encodeOAuthState({ redirectUri, nonce });

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", githubClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "read:user user:email");

    window.location.href = url.toString();
  } catch (error) {
    console.error("[Auth] Failed to construct login URL:", error);
  }
};

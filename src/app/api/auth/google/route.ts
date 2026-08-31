import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!config.googleOAuthClientId) {
    return jsonError("Login com Google não configurado.", 503);
  }

  const state = crypto.randomUUID();
  const redirectUri = `${config.frontendUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: config.googleOAuthClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state,
  });

  const response = Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    302
  );
  response.headers.set("Set-Cookie", `oauth_state=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax`);
  return response;
}

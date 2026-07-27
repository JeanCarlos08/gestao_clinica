import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  if (!config.appleOAuthClientId) {
    return jsonError("Login com Apple não configurado.", 503);
  }

  const state = crypto.randomUUID();
  const redirectUri = `${config.frontendUrl}/api/auth/apple/callback`;

  const params = new URLSearchParams({
    client_id: config.appleOAuthClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "name email",
    response_mode: "query",
    state,
  });

  return Response.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`, 302);
}

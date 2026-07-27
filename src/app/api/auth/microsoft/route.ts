import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  if (!config.microsoftOAuthClientId) {
    return jsonError("Login com Microsoft não configurado.", 503);
  }

  const state = crypto.randomUUID();
  const redirectUri = `${config.frontendUrl}/api/auth/microsoft/callback`;

  const params = new URLSearchParams({
    client_id: config.microsoftOAuthClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  return Response.redirect(
    `https://login.microsoftonline.com/${config.microsoftOAuthTenantId}/oauth2/v2.0/authorize?${params.toString()}`,
    302
  );
}

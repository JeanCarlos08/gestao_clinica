import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { createAccessToken, createRefreshToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return Response.redirect(`${config.frontendUrl}/auth/callback?error=acesso_negado`, 302);
  }

  try {
    const redirectUri = `${config.frontendUrl}/api/auth/microsoft/callback`;

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${config.microsoftOAuthTenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: config.microsoftOAuthClientId,
          client_secret: config.microsoftOAuthClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return Response.redirect(`${config.frontendUrl}/auth/callback?error=token_invalido`, 302);
    }

    const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userRes.json();

    const email = userInfo.mail || userInfo.userPrincipalName || "";
    const name = userInfo.displayName || email.split("@")[0] || "Usuário";

    if (!email) {
      return Response.redirect(`${config.frontendUrl}/auth/callback?error=email_nao_obtido`, 302);
    }

    const accessToken = await createAccessToken({ sub: email, name, provider: "microsoft" });
    const refreshToken = await createRefreshToken({ sub: email, name, provider: "microsoft" });

    return Response.redirect(
      `${config.frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}&name=${encodeURIComponent(name)}`,
      302
    );
  } catch {
    return Response.redirect(`${config.frontendUrl}/auth/callback?error=erro_interno`, 302);
  }
}

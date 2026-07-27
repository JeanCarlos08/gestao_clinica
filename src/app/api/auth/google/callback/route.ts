import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { createAccessToken, createRefreshToken } from "@/lib/jwt";
import { jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return Response.redirect(`${config.frontendUrl}/auth/callback?error=acesso_negado`, 302);
  }

  if (!config.googleOAuthClientId || !config.googleOAuthClientSecret) {
    return Response.redirect(`${config.frontendUrl}/auth/callback?error=nao_configurado`, 302);
  }

  try {
    const redirectUri = `${config.frontendUrl}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleOAuthClientId,
        client_secret: config.googleOAuthClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return Response.redirect(`${config.frontendUrl}/auth/callback?error=token_invalido`, 302);
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userRes.json();

    const email = userInfo.email || "";
    const name = userInfo.name || email.split("@")[0] || "Usuário";
    const picture = userInfo.picture || "";

    if (!email) {
      return Response.redirect(`${config.frontendUrl}/auth/callback?error=email_nao_obtido`, 302);
    }

    const accessToken = await createAccessToken({ sub: email, name, picture, provider: "google" });
    const refreshToken = await createRefreshToken({ sub: email, name, provider: "google" });

    return Response.redirect(
      `${config.frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}&name=${encodeURIComponent(name)}`,
      302
    );
  } catch (e) {
    return Response.redirect(`${config.frontendUrl}/auth/callback?error=erro_interno`, 302);
  }
}

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
    const redirectUri = `${config.frontendUrl}/api/auth/apple/callback`;

    const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.appleOAuthClientId,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return Response.redirect(`${config.frontendUrl}/auth/callback?error=token_invalido`, 302);
    }

    // Apple doesn't provide user info directly; extract from ID token if needed
    const email = ""; // Would need JWT decode of id_token
    if (!email) {
      return Response.redirect(`${config.frontendUrl}/auth/callback?error=email_nao_obtido`, 302);
    }

    const accessToken = await createAccessToken({ sub: email, provider: "apple" });
    const refreshToken = await createRefreshToken({ sub: email, provider: "apple" });

    return Response.redirect(
      `${config.frontendUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`,
      302
    );
  } catch {
    return Response.redirect(`${config.frontendUrl}/auth/callback?error=erro_interno`, 302);
  }
}

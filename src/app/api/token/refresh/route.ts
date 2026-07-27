import { NextRequest } from "next/server";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { refresh_token } = body;

  if (!refresh_token) {
    return jsonError("Refresh token é obrigatório.", 400);
  }

  const payload = await verifyRefreshToken(refresh_token);
  if (!payload) {
    return jsonError("Refresh token inválido ou expirado.", 401);
  }

  const accessToken = await createAccessToken({ sub: payload.sub, role: payload.role || "admin" });
  const newRefreshToken = await createRefreshToken({ sub: payload.sub, role: payload.role || "admin" });

  return jsonOk({ access_token: accessToken, refresh_token: newRefreshToken, token_type: "bearer" });
}

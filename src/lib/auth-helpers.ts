import { NextRequest } from "next/server";
import { verifyAccessToken, TokenPayload } from "./jwt";
import { ROLE_PERMISSIONS } from "./constants";
import { jsonError } from "./utils";

export async function getAuthUser(request: NextRequest): Promise<TokenPayload | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  return verifyAccessToken(token);
}

export async function requireAuth(request: NextRequest): Promise<TokenPayload | Response> {
  const user = await getAuthUser(request);
  if (!user) {
    return jsonError("Token inválido ou expirado.", 401);
  }
  return user;
}

export async function requirePermission(request: NextRequest, permission: string): Promise<TokenPayload | Response> {
  const result = await requireAuth(request);
  if (result instanceof Response) return result;
  const role = result.role || "";
  const allowed = ROLE_PERMISSIONS[role] || [];
  if (!allowed.includes(permission)) {
    return jsonError(`Permissão negada: ${permission}.`, 403);
  }
  return result;
}

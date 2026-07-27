import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);
  const payload = await verifyAccessToken(auth.slice(7));
  if (!payload) return jsonError("Token inválido.", 401);

  return jsonOk({
    node_version: process.version,
    platform: process.platform,
    pid: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
}

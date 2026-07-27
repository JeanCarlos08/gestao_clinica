import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifyAccessToken } from "@/lib/jwt";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Não autenticado.", 401);
  const token = auth.slice(7);
  const payload = await verifyAccessToken(token);
  if (!payload) return jsonError("Token inválido.", 401);

  const start = Date.now();
  try {
    await sql`SELECT 1`;
    const latency = Date.now() - start;
    return jsonOk({ status: "healthy", db: "connected", latency_ms: latency });
  } catch (e: any) {
    return jsonOk({ status: "degraded", db: "error", error: e.message }, 503);
  }
}

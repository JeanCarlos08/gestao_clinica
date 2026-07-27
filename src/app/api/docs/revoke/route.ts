import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_MANAGE_DOCUMENTOS } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  return jsonError("Google Docs revoke requer integração com Google Drive API.", 501);
}

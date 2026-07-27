import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DOCUMENTOS } from "@/lib/constants";
import { jsonError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { docId: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  return jsonError("Exportação PDF requer integração Google Docs API. Configure GOOGLE_SERVICE_ACCOUNT_JSON_B64.", 501);
}

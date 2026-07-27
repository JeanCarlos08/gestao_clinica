import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DOCUMENTOS } from "@/lib/constants";
import { config } from "@/lib/config";
import { buildGoogleDocEmbedUrl, jsonOk } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  if (config.googleDocsTemplateId) {
    return jsonOk({
      configurado: true,
      template_id: config.googleDocsTemplateId,
      embed_url: buildGoogleDocEmbedUrl(config.googleDocsTemplateId),
    });
  }
  return jsonOk({ configurado: false, erro: "Template não configurado. Defina GOOGLE_DOCS_TEMPLATE_ID." });
}

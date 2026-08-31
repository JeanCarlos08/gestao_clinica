import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DOCUMENTOS } from "@/lib/constants";
import { buildGoogleDocEmbedUrl, jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50"), 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);
    const docs = await sql`SELECT id, titulo, google_doc_id, tipo, atendimento_id, criado_em FROM documentos WHERE tipo = 'laudo' ORDER BY criado_em DESC LIMIT ${limit} OFFSET ${offset}`;
    return jsonOk(docs.map((d: any) => ({
      id: d.google_doc_id,
      db_id: d.id,
      titulo: d.titulo,
      paciente: (d.titulo || "").replace("Laudo - ", ""),
      tipo: "Laudo",
      data: d.criado_em ? new Date(d.criado_em).toLocaleDateString("pt-BR") : "",
      status: "Gerado",
      url: buildGoogleDocViewUrl(d.google_doc_id),
      embed_url: buildGoogleDocEmbedUrl(d.google_doc_id),
    })));
  } catch (e: any) {
    return jsonError("Erro: " + e.message, 500);
  }
}

function buildGoogleDocViewUrl(id: string) {
  return `https://docs.google.com/document/d/${id}/view`;
}

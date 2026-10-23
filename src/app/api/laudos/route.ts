import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DOCUMENTOS, PERM_MANAGE_DOCUMENTOS } from "@/lib/constants";
import { jsonOk, jsonError, errMessage } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50"), 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);
    const docs = await sql`SELECT id, titulo, google_doc_id, conteudo_html, criado_em, atualizado_em FROM documentos ORDER BY atualizado_em DESC, criado_em DESC LIMIT ${limit} OFFSET ${offset}`;
    return jsonOk(docs.map((d) => {
      if (d.google_doc_id) {
        return {
          id: d.google_doc_id,
          db_id: d.id,
          titulo: d.titulo,
          paciente: (d.titulo || "").replace("Laudo - ", ""),
          tipo: "Laudo",
          data: d.criado_em ? new Date(d.criado_em).toLocaleDateString("pt-BR") : "",
          status: "Gerado",
          url: `https://docs.google.com/document/d/${d.google_doc_id}/view`,
          embed_url: `https://docs.google.com/document/d/${d.google_doc_id}/preview`,
          kind: "google" as const,
        };
      }
      return {
        id: String(d.id),
        db_id: d.id,
        titulo: d.titulo || "Documento sem título",
        paciente: "",
        tipo: "Documento",
        data: d.criado_em ? new Date(d.criado_em).toLocaleDateString("pt-BR") : "",
        status: "Nativo",
        url: "",
        embed_url: "",
        kind: "nativo" as const,
      };
    }));
  } catch (e) {
    return jsonError("Erro: " + errMessage(e), 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const titulo = (body?.titulo || "Documento sem título").toString().slice(0, 500);
    const result = await sql`
      INSERT INTO documentos (titulo, google_doc_id, tipo, conteudo_html)
      VALUES (${titulo}, NULL, 'laudo', ${body?.conteudo_html != null ? String(body.conteudo_html) : "<p></p>"})
      RETURNING id
    `;
    return jsonOk({ id: result[0].id, mensagem: "Documento criado." }, 201);
  } catch (e) {
    return jsonError("Erro ao criar documento: " + errMessage(e), 500);
  }
}

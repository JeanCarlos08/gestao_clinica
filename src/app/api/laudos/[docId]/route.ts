import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_DOCUMENTOS, PERM_MANAGE_DOCUMENTOS } from "@/lib/constants";
import { jsonOk, jsonError, errMessage } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { docId: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.docId);
  if (Number.isNaN(id)) return jsonError("ID inválido.", 400);
  try {
    const result = await sql`SELECT id, titulo, conteudo_html, criado_em, atualizado_em FROM documentos WHERE id = ${id} AND google_doc_id IS NULL`;
    if (result.length === 0) return jsonError("Documento não encontrado.", 404);
    const d = result[0];
    return jsonOk({
      id: d.id,
      titulo: d.titulo || "Documento sem título",
      conteudo_html: d.conteudo_html || "<p></p>",
      criado_em: d.criado_em,
      atualizado_em: d.atualizado_em,
    });
  } catch (e) {
    return jsonError("Erro: " + errMessage(e), 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { docId: string } }) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.docId);
  if (Number.isNaN(id)) return jsonError("ID inválido.", 400);
  try {
    const body = await request.json();
    const result = await sql`
      UPDATE documentos SET
        titulo = COALESCE(${body.titulo ?? null}, titulo),
        conteudo_html = COALESCE(${body.conteudo_html ?? null}, conteudo_html),
        atualizado_em = NOW()
      WHERE id = ${id} AND google_doc_id IS NULL
      RETURNING id, atualizado_em
    `;
    if (result.length === 0) return jsonError("Documento não encontrado.", 404);
    return jsonOk({ id: result[0].id, atualizado_em: result[0].atualizado_em, mensagem: "Documento salvo." });
  } catch (e) {
    return jsonError("Erro ao salvar: " + errMessage(e), 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { docId: string } }) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.docId);
  if (Number.isNaN(id)) return jsonError("ID inválido.", 400);
  try {
    const result = await sql`DELETE FROM documentos WHERE id = ${id} AND google_doc_id IS NULL RETURNING id`;
    if (result.length === 0) return jsonError("Documento não encontrado (ou é um laudo do Google Docs).", 404);
    return jsonOk({ id: result[0].id, mensagem: "Documento excluído." });
  } catch (e) {
    return jsonError("Erro ao excluir: " + errMessage(e), 500);
  }
}

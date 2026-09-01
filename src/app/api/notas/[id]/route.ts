import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS, PERM_CREATE_ATENDIMENTO, PERM_DELETE_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;
  const id = parseInt(params.id);
  try {
    const r = await sql`SELECT id, titulo, conteudo, tags, favorita, criado_em, atualizado_em FROM notas WHERE id = ${id}`;
    if (r.length === 0) return jsonError("Evolução não encontrada.", 404);
    const n: any = r[0];
    return jsonOk({
      id: n.id, titulo: n.titulo, conteudo: n.conteudo, tags: n.tags, favorita: n.favorita, criado_em: n.criado_em, atualizado_em: n.atualizado_em,
      paciente_id: n.tags?.startsWith("paciente:") ? parseInt(n.tags.split(":")[1]) : null,
    });
  } catch (e: any) { return jsonError("Erro ao buscar: " + e.message, 500); }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_CREATE_ATENDIMENTO);
  if (auth instanceof Response) return auth;
  const id = parseInt(params.id);
  const body = await request.json();
  const { titulo, conteudo, favorita } = body;
  if (!conteudo || !conteudo.trim()) return jsonError("Conteúdo obrigatório.");
  try {
    const r = await sql`
      UPDATE notas SET titulo = ${titulo || "Evolução"}, conteudo = ${conteudo}, favorita = ${favorita ? true : false}, atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING id, titulo, conteudo, tags, favorita, criado_em, atualizado_em
    `;
    if (r.length === 0) return jsonError("Evolução não encontrada.", 404);
    const n: any = r[0];
    return jsonOk({ id: n.id, titulo: n.titulo, conteudo: n.conteudo, tags: n.tags, favorita: n.favorita, criado_em: n.criado_em, atualizado_em: n.atualizado_em });
  } catch (e: any) { return jsonError("Erro ao atualizar: " + e.message, 500); }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_DELETE_ATENDIMENTO);
  if (auth instanceof Response) return auth;
  const id = parseInt(params.id);
  try {
    const r = await sql`DELETE FROM notas WHERE id = ${id} RETURNING id`;
    if (r.length === 0) return jsonError("Evolução não encontrada.", 404);
    return jsonOk({ mensagem: "Evolução excluída." });
  } catch (e: any) { return jsonError("Erro ao excluir: " + e.message, 500); }
}

import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS, PERM_CREATE_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

// GET /api/notas?paciente_id=123&q=busca
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const pacienteId = url.searchParams.get("paciente_id");
  const q = url.searchParams.get("q") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 200);

  try {
    let notas;
    if (pacienteId) {
      const tag = `paciente:${pacienteId}`;
      if (q) {
        notas = await sql`
          SELECT id, titulo, conteudo, tags, favorita, criado_em, atualizado_em
          FROM notas
          WHERE tags = ${tag}
            AND (titulo ILIKE ${"%" + q + "%"} OR conteudo ILIKE ${"%" + q + "%"})
          ORDER BY criado_em DESC
          LIMIT ${limit}
        `;
      } else {
        notas = await sql`
          SELECT id, titulo, conteudo, tags, favorita, criado_em, atualizado_em
          FROM notas
          WHERE tags = ${tag}
          ORDER BY criado_em DESC
          LIMIT ${limit}
        `;
      }
    } else {
      // sem paciente_id: lista geral (útil p/ dashboard)
      if (q) {
        notas = await sql`
          SELECT id, titulo, conteudo, tags, favorita, criado_em, atualizado_em
          FROM notas
          WHERE titulo ILIKE ${"%" + q + "%"} OR conteudo ILIKE ${"%" + q + "%"} OR tags ILIKE ${"%" + q + "%"}
          ORDER BY criado_em DESC
          LIMIT ${limit}
        `;
      } else {
        notas = await sql`
          SELECT id, titulo, conteudo, tags, favorita, criado_em, atualizado_em
          FROM notas
          ORDER BY criado_em DESC
          LIMIT ${limit}
        `;
      }
    }

    return jsonOk(notas.map(n => ({
      id: n.id,
      titulo: n.titulo,
      conteudo: n.conteudo,
      tags: n.tags,
      favorita: n.favorita,
      criado_em: n.criado_em,
      atualizado_em: n.atualizado_em,
      paciente_id: n.tags?.startsWith("paciente:") ? parseInt(n.tags.split(":")[1]) : null,
    })));
  } catch (e: any) {
    return jsonError("Erro ao listar evoluções: " + e.message, 500);
  }
}

// POST /api/notas { paciente_id, titulo?, conteudo, favorita? }
// Reaproveita tabela 'notas' como prontuário/evolução sem migration
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_CREATE_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { paciente_id, titulo, conteudo, favorita, tags } = body;

  if (!conteudo || !conteudo.trim()) return jsonError("Conteúdo da evolução é obrigatório.");

  // tags é nosso FK improvisado: "paciente:123"
  // se já vier tags pronto, usa; senão exige paciente_id
  let finalTags = tags;
  if (!finalTags) {
    if (!paciente_id) return jsonError("paciente_id é obrigatório (ou tags='paciente:ID').");
    finalTags = `paciente:${paciente_id}`;
  }

  const finalTitulo = titulo?.trim() || `Evolução ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  try {
    const result = await sql`
      INSERT INTO notas (titulo, conteudo, tags, favorita)
      VALUES (${finalTitulo}, ${conteudo}, ${finalTags}, ${favorita ? true : false})
      RETURNING id, titulo, conteudo, tags, favorita, criado_em, atualizado_em
    `;
    const n = result[0];
    return jsonOk({
      id: n.id,
      titulo: n.titulo,
      conteudo: n.conteudo,
      tags: n.tags,
      favorita: n.favorita,
      criado_em: n.criado_em,
      atualizado_em: n.atualizado_em,
      paciente_id: n.tags?.startsWith("paciente:") ? parseInt(n.tags.split(":")[1]) : null,
    }, 201);
  } catch (e: any) {
    return jsonError("Erro ao criar evolução: " + e.message, 500);
  }
}

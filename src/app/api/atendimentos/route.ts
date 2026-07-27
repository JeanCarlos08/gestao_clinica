import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS, PERM_CREATE_ATENDIMENTO } from "@/lib/constants";
import { slugName, jsonOk, jsonError } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 500);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    let atendimentos;
    let total;

    if (q) {
      atendimentos = await sql`
        SELECT a.id, a.empresa, a.nome, a.modalidade, a.data, a.hora, a.status, a.paciente_id,
          p.foto
        FROM atendimentos a
        LEFT JOIN pacientes p ON p.id = a.paciente_id
        WHERE a.nome ILIKE ${"%" + q + "%"} OR a.empresa ILIKE ${"%" + q + "%"}
        ORDER BY a.data DESC, a.hora DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const cnt = await sql`SELECT COUNT(*) as cnt FROM atendimentos WHERE nome ILIKE ${"%" + q + "%"} OR empresa ILIKE ${"%" + q + "%"}`;
      total = parseInt(cnt[0]?.cnt ?? "0");
    } else {
      atendimentos = await sql`
        SELECT a.id, a.empresa, a.nome, a.modalidade, a.data, a.hora, a.status, a.paciente_id,
          p.foto
        FROM atendimentos a
        LEFT JOIN pacientes p ON p.id = a.paciente_id
        ORDER BY a.data DESC, a.hora DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const cnt = await sql`SELECT COUNT(*) as cnt FROM atendimentos`;
      total = parseInt(cnt[0]?.cnt ?? "0");
    }

    return jsonOk({
      items: atendimentos.map(a => ({
        id: a.id,
        empresa: a.empresa,
        nome: a.nome,
        modalidade: a.modalidade,
        data: a.data ? new Date(a.data).toISOString().split("T")[0] : "",
        hora: a.hora || "",
        status: a.status,
        paciente_id: a.paciente_id,
        foto: a.foto,
      })),
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    });
  } catch (e: any) {
    return jsonError("Erro ao listar atendimentos: " + e.message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_CREATE_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { empresa, nome, modalidade, data, hora, status, paciente_id } = body;

  if (!empresa || !nome || !modalidade || !data || !hora) {
    return jsonError("Campos obrigatórios: empresa, nome, modalidade, data, hora.");
  }

  try {
    let finalPacienteId = paciente_id;

    if (!finalPacienteId && nome) {
      const slug = slugName(nome);
      const existing = await sql`SELECT id FROM pacientes WHERE slug = ${slug} LIMIT 1`;
      if (existing.length > 0) {
        finalPacienteId = existing[0].id;
      } else {
        const newPac = await sql`INSERT INTO pacientes (nome, slug, empresa) VALUES (${nome}, ${slug}, ${empresa || ""}) RETURNING id`;
        finalPacienteId = newPac[0].id;
      }
    }

    const result = await sql`
      INSERT INTO atendimentos (empresa, nome, modalidade, data, hora, status, paciente_id)
      VALUES (${empresa}, ${nome}, ${modalidade}, ${data}, ${hora}, ${status || "Agendado"}, ${finalPacienteId || null})
      RETURNING id
    `;

    return jsonOk({ id: result[0].id, mensagem: "Atendimento criado com sucesso." }, 201);
  } catch (e: any) {
    return jsonError("Erro ao criar atendimento: " + e.message, 500);
  }
}

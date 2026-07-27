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
  const limit = parseInt(url.searchParams.get("limit") || "1000");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    let pacientes;
    if (q) {
      pacientes = await sql`
        SELECT p.*,
          (SELECT COUNT(*) FROM atendimentos WHERE paciente_id = p.id) as total_atendimentos,
          (SELECT MAX(data) FROM atendimentos WHERE paciente_id = p.id) as ultimo_atendimento,
          (SELECT DISTINCT modalidade FROM atendimentos WHERE paciente_id = p.id) as modalidades
        FROM pacientes p
        WHERE p.nome ILIKE ${"%" + q + "%"} OR p.empresa ILIKE ${"%" + q + "%"}
        ORDER BY p.nome
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      pacientes = await sql`
        SELECT p.*,
          (SELECT COUNT(*) FROM atendimentos WHERE paciente_id = p.id) as total_atendimentos,
          (SELECT MAX(data) FROM atendimentos WHERE paciente_id = p.id) as ultimo_atendimento,
          (SELECT DISTINCT modalidade FROM atendimentos WHERE paciente_id = p.id) as modalidades
        FROM pacientes p
        ORDER BY p.nome
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    return jsonOk(pacientes.map(p => ({
      id: p.id,
      nome: p.nome,
      slug: p.slug,
      cpf: p.cpf,
      telefone: p.telefone,
      email: p.email,
      data_nascimento: p.data_nascimento ? new Date(p.data_nascimento).toISOString().split("T")[0] : null,
      sexo: p.sexo,
      estado_civil: p.estado_civil,
      profissao: p.profissao,
      convenio: p.convenio,
      numero_convenio: p.numero_convenio,
      empresa: p.empresa,
      endereco: p.endereco,
      contato_emergencia: p.contato_emergencia,
      telefone_emergencia: p.telefone_emergencia,
      observacoes: p.observacoes,
      foto: p.foto,
      criado_em: p.criado_em,
      atualizado_em: p.atualizado_em,
      total_atendimentos: parseInt(String(p.total_atendimentos ?? "0")),
      ultimo_atendimento: p.ultimo_atendimento,
      modalidades_distintas: Array.isArray(p.modalidades) ? p.modalidades.length : 0,
    })));
  } catch (e: any) {
    return jsonError("Erro ao listar pacientes: " + e.message, 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_CREATE_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { nome, cpf, telefone, email, data_nascimento, sexo, estado_civil, profissao, convenio, numero_convenio, empresa, endereco, contato_emergencia, telefone_emergencia, observacoes } = body;

  if (!nome) return jsonError("Nome é obrigatório.");

  const slug = slugName(nome);

  try {
    const result = await sql`
      INSERT INTO pacientes (nome, slug, cpf, telefone, email, data_nascimento, sexo, estado_civil, profissao, convenio, numero_convenio, empresa, endereco, contato_emergencia, telefone_emergencia, observacoes)
      VALUES (${nome}, ${slug}, ${cpf || null}, ${telefone || null}, ${email || null}, ${data_nascimento || null}, ${sexo || null}, ${estado_civil || null}, ${profissao || null}, ${convenio || null}, ${numero_convenio || null}, ${empresa || null}, ${endereco || null}, ${contato_emergencia || null}, ${telefone_emergencia || null}, ${observacoes || null})
      RETURNING id
    `;

    return jsonOk({ id: result[0].id, mensagem: "Paciente criado com sucesso." }, 201);
  } catch (e: any) {
    return jsonError("Erro ao criar paciente: " + e.message, 500);
  }
}

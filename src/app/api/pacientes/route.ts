import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS, PERM_CREATE_ATENDIMENTO } from "@/lib/constants";
import { slugName, jsonOk, jsonError, errMessage} from "@/lib/utils";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const soAtivos = url.searchParams.get("ativos") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "1000");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Cap limit para evitar payload gigante (era 1000 default)
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);

  try {
    // Busca por nome, CPF, telefone, e-mail e empresa (paridade com o MVP Psicologia).
    // Condições param-driven: $1=false neutraliza o filtro (evita concatenar SQL por partes).
    const like = `%${q.trim()}%`;
    const pacientes = await sql`
      SELECT p.*,
        COUNT(a.id)::int as total_atendimentos,
        MAX(a.data) as ultimo_atendimento,
        COUNT(DISTINCT a.modalidade)::int as modalidades_cnt
      FROM pacientes p
      LEFT JOIN atendimentos a ON a.paciente_id = p.id
      WHERE (${soAtivos} = FALSE OR p.ativo = 1)
        AND (${q.trim()} = '' OR (p.nome ILIKE ${like} OR p.cpf ILIKE ${like} OR p.telefone ILIKE ${like} OR p.email ILIKE ${like} OR p.empresa ILIKE ${like}))
      GROUP BY p.id
      ORDER BY p.nome
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    return jsonOk(pacientes.map(p => ({
      id: p.id,
      nome: p.nome,
      slug: p.slug,
      cpf: p.cpf,
      rg: p.rg,
      ativo: !!p.ativo,
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
      modalidades_distintas: parseInt(String(p.modalidades_cnt ?? "0")),
    })));
  } catch (e) {
    return jsonError("Erro ao listar pacientes: " + errMessage(e), 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_CREATE_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const body = await request.json();
  const { nome, cpf, rg, telefone, email, data_nascimento, sexo, estado_civil, profissao, convenio, numero_convenio, empresa, endereco, contato_emergencia, telefone_emergencia, observacoes } = body;

  if (!nome) return jsonError("Nome é obrigatório.");

  try {
    // Duplicidade pré-salvar (streamlit): nome exato OU cpf igual → bloqueia e reporta.
    const cpfClean = cpf ? String(cpf).trim() : "";
    const duplicados = await sql`
      SELECT id, nome, cpf, telefone, ativo FROM pacientes
      WHERE LOWER(nome) = LOWER(${String(nome).trim()})
         OR (${cpfClean !== ""} AND cpf = ${cpfClean})
    `;
    if (duplicados.length > 0) {
      return jsonError("Possível duplicidade de cadastro encontrada. Verifique se o paciente já existe.", 409);
    }

    const slug = slugName(nome);
    const result = await sql`
      INSERT INTO pacientes (nome, slug, cpf, rg, ativo, telefone, email, data_nascimento, sexo, estado_civil, profissao, convenio, numero_convenio, empresa, endereco, contato_emergencia, telefone_emergencia, observacoes)
      VALUES (${nome}, ${slug}, ${cpf || null}, ${rg || null}, ${body.ativo === false ? 0 : 1}, ${telefone || null}, ${email || null}, ${data_nascimento || null}, ${sexo || null}, ${estado_civil || null}, ${profissao || null}, ${convenio || null}, ${numero_convenio || null}, ${empresa || null}, ${endereco || null}, ${contato_emergencia || null}, ${telefone_emergencia || null}, ${observacoes || null})
      RETURNING id
    `;

    return jsonOk({ id: result[0].id, mensagem: "Paciente criado com sucesso." }, 201);
  } catch (e) {
    return jsonError("Erro ao criar paciente: " + errMessage(e), 500);
  }
}

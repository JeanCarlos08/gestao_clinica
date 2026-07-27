import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS, PERM_EDIT_ATENDIMENTO, PERM_DELETE_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError } from "@/lib/utils";

function mapPaciente(p: any) {
  return {
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
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  const result = await sql`SELECT * FROM pacientes WHERE id = ${id}`;
  if (result.length === 0) return jsonError("Paciente não encontrado.", 404);
  return jsonOk(mapPaciente(result[0]));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_EDIT_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  const body = await request.json();
  const { nome, cpf, telefone, email, data_nascimento, sexo, estado_civil, profissao, convenio, numero_convenio, empresa, endereco, contato_emergencia, telefone_emergencia, observacoes } = body;

  try {
    const result = await sql`
      UPDATE pacientes SET
        nome = COALESCE(${nome}, nome),
        cpf = COALESCE(${cpf}, cpf),
        telefone = COALESCE(${telefone}, telefone),
        email = COALESCE(${email}, email),
        data_nascimento = COALESCE(${data_nascimento}, data_nascimento),
        sexo = COALESCE(${sexo}, sexo),
        estado_civil = COALESCE(${estado_civil}, estado_civil),
        profissao = COALESCE(${profissao}, profissao),
        convenio = COALESCE(${convenio}, convenio),
        numero_convenio = COALESCE(${numero_convenio}, numero_convenio),
        empresa = COALESCE(${empresa}, empresa),
        endereco = COALESCE(${endereco}, endereco),
        contato_emergencia = COALESCE(${contato_emergencia}, contato_emergencia),
        telefone_emergencia = COALESCE(${telefone_emergencia}, telefone_emergencia),
        observacoes = COALESCE(${observacoes}, observacoes),
        atualizado_em = NOW()
      WHERE id = ${id}
    `;

    if (result.count === 0) return jsonError("Paciente não encontrado.", 404);

    const updated = await sql`SELECT * FROM pacientes WHERE id = ${id}`;
    return jsonOk(mapPaciente(updated[0]));
  } catch (e: any) {
    return jsonError("Erro ao atualizar: " + e.message, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_DELETE_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  try {
    await sql`UPDATE atendimentos SET paciente_id = NULL WHERE paciente_id = ${id}`;
    const result = await sql`DELETE FROM pacientes WHERE id = ${id}`;
    if (result.count === 0) return jsonError("Paciente não encontrado.", 404);
    return jsonOk({ mensagem: "Paciente excluído com sucesso." });
  } catch (e: any) {
    return jsonError("Erro ao excluir: " + e.message, 500);
  }
}

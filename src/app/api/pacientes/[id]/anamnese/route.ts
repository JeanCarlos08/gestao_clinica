import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_VIEW_ATENDIMENTOS, PERM_EDIT_ATENDIMENTO } from "@/lib/constants";
import { jsonOk, jsonError, errMessage } from "@/lib/utils";

const CAMPOS = ["queixa_principal", "historico_doenca", "historico_familiar", "medicamentos", "alergias", "habitos", "observacoes"];

function mapAnamnese(p: Record<string, unknown>) {
  return {
    id: p.id,
    paciente_id: p.paciente_id,
    queixa_principal: p.queixa_principal,
    historico_doenca: p.historico_doenca,
    historico_familiar: p.historico_familiar,
    medicamentos: p.medicamentos,
    alergias: p.alergias,
    habitos: p.habitos,
    observacoes: p.observacoes,
    criado_em: p.criado_em,
    atualizado_em: p.atualizado_em,
  };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_VIEW_ATENDIMENTOS);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  if (!Number.isInteger(id)) return jsonError("ID inválido.", 400);

  try {
    // Formato streamlit pode guardar mais de um registro por paciente — vence o mais recente.
    const rows = await sql`SELECT * FROM anamnese WHERE paciente_id = ${id} ORDER BY id DESC LIMIT 1`;
    return jsonOk(rows.length > 0 ? mapAnamnese(rows[0]) : null);
  } catch (e) {
    return jsonError("Erro ao carregar anamnese: " + errMessage(e), 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission(request, PERM_EDIT_ATENDIMENTO);
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id);
  if (!Number.isInteger(id)) return jsonError("ID inválido.", 400);

  const body = await request.json();
  // Upsert: cria a anamnese se não existir; caso contrário, atualiza (1 registro por paciente).
  // Campos ausentes no body preservam o valor atual (COALESCE).
  const vals = Object.fromEntries(CAMPOS.map(c => [c, typeof body?.[c] === "string" ? (body[c] as string).trim() || null : undefined]));

  try {
    const exists = await sql`SELECT id FROM anamnese WHERE paciente_id = ${id}`;
    if (exists.length === 0) {
      const [paciente] = await sql`SELECT id FROM pacientes WHERE id = ${id}`;
      if (!paciente) return jsonError("Paciente não encontrado.", 404);
      await sql`
        INSERT INTO anamnese (paciente_id, queixa_principal, historico_doenca, historico_familiar, medicamentos, alergias, habitos, observacoes)
        VALUES (${id}, ${vals.queixa_principal ?? null}, ${vals.historico_doenca ?? null}, ${vals.historico_familiar ?? null}, ${vals.medicamentos ?? null}, ${vals.alergias ?? null}, ${vals.habitos ?? null}, ${vals.observacoes ?? null})
      `;
    } else {
      // Streamlit permite múltiplos registros por paciente — atualiza todos do paciente.
      await sql`
        UPDATE anamnese SET
          queixa_principal = COALESCE(${vals.queixa_principal ?? null}, queixa_principal),
          historico_doenca = COALESCE(${vals.historico_doenca ?? null}, historico_doenca),
          historico_familiar = COALESCE(${vals.historico_familiar ?? null}, historico_familiar),
          medicamentos = COALESCE(${vals.medicamentos ?? null}, medicamentos),
          alergias = COALESCE(${vals.alergias ?? null}, alergias),
          habitos = COALESCE(${vals.habitos ?? null}, habitos),
          observacoes = COALESCE(${vals.observacoes ?? null}, observacoes),
          atualizado_em = NOW()
        WHERE paciente_id = ${id}
      `;
    }
    const updated = await sql`SELECT * FROM anamnese WHERE paciente_id = ${id} ORDER BY id DESC LIMIT 1`;
    return jsonOk(mapAnamnese(updated[0]));
  } catch (e) {
    return jsonError("Erro ao salvar anamnese: " + errMessage(e), 500);
  }
}

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth-helpers";
import { PERM_MANAGE_DOCUMENTOS } from "@/lib/constants";
import { jsonOk, jsonError, errMessage } from "@/lib/utils";

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

function docxToHtml(buffer: Buffer): string {
  const JSZip = require("jszip");
  const zip = new JSZip(buffer);
  const xml = zip.file("word/document.xml")?.asText() || "";
  const rootMatch = xml.match(/<w:body[\s\S]*<\/w:body>/);
  const bodyXml = rootMatch ? rootMatch[0] : xml;

  const paras: string[] = [];
  const paraRegex = /<w:p[\s\S]*?<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = paraRegex.exec(bodyXml))) {
    const paraXml = m[0];
    const texts: string[] = [];
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRegex.exec(paraXml))) {
      texts.push(tm[1]);
    }
    const texto = texts.join("");
    if (texto.trim()) {
      const isHeading = /<w:pStyle[^>]*w:val="Heading[123]"/.test(paraXml);
      if (isHeading) {
        paras.push(`<h2>${escapeHtml(texto)}</h2>`);
      } else {
        paras.push(`<p>${escapeHtml(texto)}</p>`);
      }
    }
  }
  if (paras.length === 0) {
    const allTexts: string[] = [];
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let tm: RegExpExecArray | null;
    while ((tm = tRegex.exec(xml))) {
      allTexts.push(tm[1]);
    }
    const texto = allTexts.join("").trim();
    if (texto) paras.push(`<p>${escapeHtml(texto)}</p>`);
  }
  return paras.join("");
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, PERM_MANAGE_DOCUMENTOS);
  if (auth instanceof Response) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return jsonError("Arquivo não enviado.", 400);
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return jsonError("Envie um arquivo .docx.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let html = "";
    try {
      html = docxToHtml(buffer);
    } catch {
      html = "";
    }
    if (!html.trim()) {
      return jsonError("Não foi possível extrair texto do DOCX.", 422);
    }

    return jsonOk({ html, nome: file.name });
  } catch (e) {
    return jsonError("Erro ao importar DOCX: " + errMessage(e), 500);
  }
}

"use client";

/* Renderizador Markdown mínimo e seguro para respostas da IA:
   escapa HTML antes e injeta apenas as tags geradas aqui. */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Formatação inline: bold, itálico, code, links (só https) */
function inline(s: string) {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
}

function buildTable(rows: string[]): string {
  const cells = (line: string) =>
    line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
  const header = cells(rows[0]);
  const hasSep = /[-: ]{3,}/.test(rows[1] || "") && rows[1].includes("|");
  const body = rows.slice(hasSep ? 2 : 1);
  const html = body
    .filter((r) => r.trim())
    .map((r) => {
      const tds = cells(r).map((c) => `<td>${inline(esc(c))}</td>`).join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");
  const ths = header.map((h) => `<th>${inline(esc(h))}</th>`).join("");
  return `<table><thead><tr>${ths}</tr></thead><tbody>${html}</tbody></table>`;
}

export function mdToHtml(src: string): string {
  const lines = esc(src).split("\n");
  const out: string[] = [];
  let i = 0;
  let html = "";
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      html += `<pre><code>${buf.join("\n")}</code></pre>`;
      out.push(html);
      html = "";
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) buf.push(lines[i++]);
      html += buildTable(buf);
      out.push(html);
      html = "";
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      html += `<h3>${inline(line.replace(/^#{1,3}\s+/, ""))}</h3>`;
      i++;
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      html += "<hr/>";
      i++;
      continue;
    }
    if (/^&gt;\s?/.test(line)) {
      html += `<p class="ai-md-q">${inline(line.replace(/^&gt;\s?/, ""))}</p>`;
      i++;
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) buf.push(inline(lines[i].replace(/^\s*[-*•]\s+/, "")));
      html += `<ul>${buf.map((b) => `<li>${b}</li>`).join("")}</ul>`;
      i += buf.length;
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) buf.push(inline(lines[i].replace(/^\s*\d+[.)]\s+/, "")));
      html += `<ol>${buf.map((b) => `<li>${b}</li>`).join("")}</ol>`;
      i += buf.length;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    // parágrafo: agrupa linhas consecutivas simples
    const buf: string[] = [inline(line)];
    i++;
    while (i < lines.length && lines[i].trim() && !/^\s*(\|.*\|```|#{1,3}\s|[-*•]\s|\d+[.)]\s|---+\s*$|&gt;)/.test(lines[i]) && !lines[i].startsWith("```")) {
      buf.push(`<br/>${inline(lines[i])}`);
      i++;
    }
    html += `<p>${buf.join("")}</p>`;
    out.push(html);
    html = "";
  }
  return out.join("");
}

export default function AiMarkdown({ text }: { text: string }) {
  return (
    <div className="ai-md" dangerouslySetInnerHTML={{ __html: mdToHtml(text) }} />
  );
}

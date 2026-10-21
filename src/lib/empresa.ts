/* Normalização de nomes de empresa/convênio.
   "AVANÇO S/A / CNPJ 18..." e "AVANÇO S/A/ CNPJ 18..." são a mesma empresa. */
export function empresaKey(nome: string): string {
  return nome
    .trim()
    .toUpperCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ");
}

/* Mescla variações de escrita: some contagens mantendo o 1º label como nome. */
export function mergeEmpresas(entries: Array<[string, number]>): Array<[string, number]> {
  const map = new Map<string, { label: string; total: number }>();
  for (const [nome, qtdRaw] of entries) {
    if (!nome || !nome.trim()) continue;
    const qtd = Number(qtdRaw) || 0;
    const key = empresaKey(nome);
    const cur = map.get(key);
    if (cur) cur.total += qtd;
    else map.set(key, { label: nome.trim(), total: qtd });
  }
  return Array.from(map.values()).map((v) => [v.label, v.total] as [string, number]);
}

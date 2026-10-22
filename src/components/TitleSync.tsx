"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchMarcaPublica } from "@/hooks/useClinicaMarca";

const ROUTE_TITLES: [RegExp, string][] = [
  [/^\/$/, "Login"],
  [/^\/dashboard/, "Dashboard"],
  [/^\/atendimentos/, "Atendimentos"],
  [/^\/pacientes\/[^/]+\/doc-editor/, "Documento do Paciente"],
  [/^\/pacientes\/.*/, "Paciente"],
  [/^\/pacientes/, "Pacientes"],
  [/^\/upload/, "Upload de Arquivos"],
  [/^\/relatorios/, "Relatórios"],
  [/^\/documentos/, "Documentos"],
  [/^\/laudos/, "Laudos"],
  [/^\/configuracoes/, "Configurações"],
  [/^\/privacy/, "Privacidade"],
  [/^\/terms/, "Termos de Uso"],
];

export default function TitleSync() {
  const pathname = usePathname() || "/";
  const [clinica, setClinica] = useState("MVP Psicologia");

  useEffect(() => {
    let alive = true;
    fetchMarcaPublica().then((m) => { if (alive && m.clinic_name) setClinica(m.clinic_name); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const base = ROUTE_TITLES.find(([re]) => re.test(pathname));
    document.title = `${base ? base[1] : "Painel"} · ${clinica}`;
  }, [pathname, clinica]);

  return null;
}

"use client";

import useSWR from "swr";
import { swrFetcher, API } from "@/lib/api";

export interface ClinicaMarca {
  clinic_name: string;
  clinic_logo_base64: string | null;
  user_photo_base64: string | null;
}

export function useClinicaMarca() {
  const key = typeof window !== "undefined" && localStorage.getItem("token")
    ? `${API}/configuracoes`
    : null;
  const { data } = useSWR<{ clinica: ClinicaMarca }>(key, swrFetcher, {
    dedupingInterval: 60000,
  });
  const clinica = data?.clinica || null;

  return {
    clinicName: clinica?.clinic_name?.trim() || "MVP Psicologia",
    clinicLogo: clinica?.clinic_logo_base64 || null,
    userPhoto: clinica?.user_photo_base64 || null,
  };
}

/** Endpoint público (sem auth) — para o login e a aba do navegador */
export async function fetchMarcaPublica(): Promise<ClinicaMarca> {
  try {
    const res = await fetch(`${API}/configuracoes/publica`);
    if (!res.ok) return { clinic_name: "MVP Psicologia", clinic_logo_base64: null, user_photo_base64: null };
    const d = await res.json();
    return {
      clinic_name: d.clinic_name?.trim() || "MVP Psicologia",
      clinic_logo_base64: d.clinic_logo_base64 || null,
      user_photo_base64: null,
    };
  } catch {
    return { clinic_name: "MVP Psicologia", clinic_logo_base64: null, user_photo_base64: null };
  }
}

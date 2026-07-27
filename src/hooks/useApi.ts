"use client";

import { useState, useEffect, useCallback } from "react";
import { swrFetcher } from "@/lib/api";

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useApi<T>(url: string): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    swrFetcher(url)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err?.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [url, tick]);

  return { data, error, loading, refetch };
}

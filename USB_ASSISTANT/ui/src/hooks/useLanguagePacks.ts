import { useCallback, useEffect, useState } from 'react';
import type { LanguagePackEntry, LanguagePackListResponse } from '../types';

interface ActionResult {
  success?: boolean;
  error?: string;
}

export function useLanguagePacks() {
  const [packs, setPacks] = useState<LanguagePackEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPacks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/language_packs');
      if (!response.ok) throw new Error('Failed to fetch language packs');
      const data = (await response.json()) as LanguagePackListResponse;
      setPacks(Array.isArray(data.packs) ? data.packs : []);
      setActiveId(data.active_id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAction = async (url: string, payload: object) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as ActionResult;
    if (!response.ok || data.success === false) {
      throw new Error(data.error || 'Operation failed');
    }
    await fetchPacks();
  };

  const installPack = useCallback(
    async (sourcePath: string) => {
      await handleAction('/api/language_packs/install', { source_path: sourcePath });
    },
    [fetchPacks]
  );

  const removePack = useCallback(
    async (id: string) => {
      await handleAction('/api/language_packs/remove', { id });
    },
    [fetchPacks]
  );

  const activatePack = useCallback(
    async (id: string | null) => {
      await handleAction('/api/language_packs/activate', { id });
    },
    [fetchPacks]
  );

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  return {
    packs,
    activeId,
    loading,
    error,
    refetch: fetchPacks,
    installPack,
    removePack,
    activatePack,
  };
}

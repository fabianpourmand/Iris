import { useState, useEffect, useCallback } from 'react';
import type { ModelInfo } from '../types';
import { useSettings } from './useSettings';

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const ctxParam = settings?.ctx_size ? `?ctx=${settings.ctx_size}` : '';
      const response = await fetch(`/api/models${ctxParam}`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      setModels(Array.isArray(data) ? data : data.models || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [settings?.ctx_size]);

  const refreshIndex = async () => {
    try {
      setLoading(true);
      const ctxParam = settings?.ctx_size ? `?ctx=${settings.ctx_size}` : '';
      const response = await fetch(`/api/models/refresh${ctxParam}`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to refresh model index');
      const data = await response.json();
      setModels(Array.isArray(data) ? data : data.models || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, loading, error, refetch: fetchModels, refreshIndex };
}

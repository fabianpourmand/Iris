import { useState, useCallback, useEffect } from 'react';
import type { LLMStatus } from '../types';
import { useSettings } from './useSettings';

export function useLLM() {
  const [status, setStatus] = useState<LLMStatus>({ running: false, model_id: null, port: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/llm/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch LLM status:', err);
    }
  }, []);

  const start = async (modelId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/llm/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          ctx: settings.ctx_size,
          threads: settings.threads,
          gpu_layers: 0,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to start LLM');
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/llm/stop', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to stop LLM');
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, error, start, stop, refetch: fetchStatus };
}

import { useCallback, useEffect, useState } from 'react';
import type { FirmwareUpdateRecord, FirmwareUpdateStatusResponse } from '../types';

interface ActionResult {
  success?: boolean;
  error?: string;
  update?: FirmwareUpdateRecord;
}

export function useFirmwareUpdates() {
  const [lastUpdate, setLastUpdate] = useState<FirmwareUpdateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/firmware_updates/status');
      if (!response.ok) throw new Error('Failed to fetch firmware update status');
      const data = (await response.json()) as FirmwareUpdateStatusResponse;
      setLastUpdate(data.last_update ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const applyUpdate = useCallback(
    async (sourcePath: string) => {
      const response = await fetch('/api/firmware_updates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_path: sourcePath }),
      });
      const data = (await response.json()) as ActionResult;
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Firmware update failed');
      }
      if (data.update) {
        setLastUpdate(data.update);
      } else {
        await fetchStatus();
      }
    },
    [fetchStatus]
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    lastUpdate,
    loading,
    error,
    refetch: fetchStatus,
    applyUpdate,
  };
}

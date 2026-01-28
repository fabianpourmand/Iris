import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '../types';

interface ProfileResponse {
  exists: boolean;
  profile?: Profile;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/profile');
      const text = await response.text();
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }
      const data = text ? (JSON.parse(text) as ProfileResponse) : { exists: false };
      if (data.exists && data.profile) {
        setProfile(data.profile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (input: Partial<Profile>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { profile?: Profile; error?: string }) : {};
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }
      if (!data.profile) {
        throw new Error('Profile save failed');
      }
      setProfile(data.profile);
      return data.profile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refresh: fetchProfile, saveProfile, setProfile };
}

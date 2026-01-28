import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

const STORAGE_KEY = 'usb-assistant-settings';
const SETTINGS_EVENT = 'iris-settings-update';

const defaultSettings: Settings = {
  threads: Math.max(1, (navigator.hardwareConcurrency || 4) - 1),
  ctx_size: 4096,
  temperature: 0.7,
  max_tokens: 1024,
  uncensored_mode: false,
  dark_mode: false,
  tts_enabled: false,
  survival_mode: false,
  advanced_mode: false,
  sandbox_root: '.',
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  useEffect(() => {
    const handleSettingsEvent = (event: Event) => {
      const customEvent = event as CustomEvent<Settings>;
      if (customEvent.detail) {
        setSettings(prev => ({ ...prev, ...customEvent.detail }));
      }
    };
    window.addEventListener(SETTINGS_EVENT, handleSettingsEvent);
    return () => window.removeEventListener(SETTINGS_EVENT, handleSettingsEvent);
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return { settings, updateSettings, resetSettings, defaultSettings };
}

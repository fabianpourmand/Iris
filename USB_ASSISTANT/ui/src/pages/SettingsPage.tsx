import { useSystemInfo, useSettings, useProfile, useDiagnostics, useLanguagePacks, useFirmwareUpdates } from '../hooks';
import { Toggle } from '../components';
import { Zap, RotateCcw, AlertTriangle, ShieldCheck, Moon, User, Save, Loader2, Activity, Server, Folder, RefreshCw, Languages, Download, Trash2, CheckCircle2, XCircle, HardDrive, ArrowUpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const ctxSizeOptions = [2048, 4096, 8192, 16384];

export function SettingsPage() {
  const { systemInfo } = useSystemInfo();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { profile, saveProfile } = useProfile();
  const { diagnostics, loading: diagnosticsLoading, error: diagnosticsError, refetch: refetchDiagnostics } = useDiagnostics();
  const {
    packs,
    activeId,
    loading: packsLoading,
    error: packsError,
    refetch: refreshPacks,
    installPack,
    removePack,
    activatePack,
  } = useLanguagePacks();
  const {
    lastUpdate,
    loading: updateLoading,
    error: updateError,
    refetch: refreshUpdateStatus,
    applyUpdate,
  } = useFirmwareUpdates();

  const [profileName, setProfileName] = useState(profile?.name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [installPath, setInstallPath] = useState('');
  const [isInstallingPack, setIsInstallingPack] = useState(false);
  const [packActionError, setPackActionError] = useState<string | null>(null);
  const [packActionId, setPackActionId] = useState<string | null>(null);
  const [updatePath, setUpdatePath] = useState('');
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateActionError, setUpdateActionError] = useState<string | null>(null);
  const speechSupported = typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window;

  useEffect(() => {
    if (profile?.name) {
      setProfileName(profile.name);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      await saveProfile({ name: profileName });
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleInstallPack = async () => {
    if (!installPath.trim()) return;
    try {
      setPackActionError(null);
      setIsInstallingPack(true);
      await installPack(installPath.trim());
      setInstallPath('');
    } catch (err) {
      setPackActionError(err instanceof Error ? err.message : 'Failed to install pack');
    } finally {
      setIsInstallingPack(false);
    }
  };

  const handleActivatePack = async (id: string | null) => {
    try {
      setPackActionError(null);
      setPackActionId(id ?? 'active-clear');
      await activatePack(id);
    } catch (err) {
      setPackActionError(err instanceof Error ? err.message : 'Failed to activate pack');
    } finally {
      setPackActionId(null);
    }
  };

  const handleRemovePack = async (id: string) => {
    const confirmed = window.confirm(`Remove language pack '${id}'?`);
    if (!confirmed) return;
    try {
      setPackActionError(null);
      setPackActionId(id);
      await removePack(id);
    } catch (err) {
      setPackActionError(err instanceof Error ? err.message : 'Failed to remove pack');
    } finally {
      setPackActionId(null);
    }
  };

  const handleApplyFirmwareUpdate = async () => {
    if (!updatePath.trim()) return;
    const confirmed = window.confirm('Apply firmware update pack from the provided folder path?');
    if (!confirmed) return;
    try {
      setUpdateActionError(null);
      setIsApplyingUpdate(true);
      await applyUpdate(updatePath.trim());
      setUpdatePath('');
    } catch (err) {
      setUpdateActionError(err instanceof Error ? err.message : 'Failed to apply update pack');
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const maxThreads = systemInfo?.cpu_cores || 8;
  const formatUptime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="flex-1 w-full overflow-y-auto px-4 md:px-8 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-[var(--ink)] tracking-tight font-serif">SYSTEM CONFIG</h1>
          <div className="px-3 py-1 bg-[#1f6d5a]/10 border border-[#1f6d5a]/20 rounded-full flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1f6d5a]" />
            <span className="text-[10px] font-bold text-[#1f6d5a] uppercase tracking-widest">Secure Environment</span>
          </div>
        </div>

        {/* Identity Section */}
        <div className="glass-card p-6 glow-border">
          <h2 className="text-lg font-bold text-[var(--ink)] mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-[#1f6d5a]" />
            Identity & Operator
          </h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">Operator Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Operator"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--ink)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1f6d5a]/30"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile || profileName === profile?.name}
              className="mt-6 px-6 bg-[#1f6d5a] hover:bg-[#1a5c4c] disabled:opacity-30 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
              {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        {/* Uncensored Mode - Prominent */}
        <div className="glass-card p-6 border border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--ink)]">UNCENSORED OVERRIDE</h2>
                <Toggle
                  enabled={settings.uncensored_mode}
                  onChange={(enabled) => updateSettings({ uncensored_mode: enabled })}
                />
              </div>
              <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                Bypasses standard safety protocols. Only specialized unfiltered models will be displayed.
                Use only in emergency scenarios where unrestricted data is mission-critical.
              </p>
              {settings.uncensored_mode && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-700 font-bold uppercase tracking-wider mb-1">
                    Critical Warning
                  </p>
                  <p className="text-sm text-red-700/80 leading-relaxed">
                    Uncensored models may generate harmful, offensive, or hazardous information.
                    The operator assumes all risk for generated outputs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Model Preferences */}
        <div className="glass-card p-6 glow-border">
          <h2 className="text-lg font-bold text-[var(--ink)] mb-6 flex items-center gap-2">
            <Moon className="w-5 h-5 text-[#1f6d5a]" />
            Display & UI
          </h2>

          <div className="space-y-6">
            <Toggle
              label="Dark Mode"
              description="Black background with primary color accent highlights."
              enabled={settings.dark_mode}
              onChange={(enabled) => updateSettings({ dark_mode: enabled })}
            />
            <Toggle
              label="Assistant Voice Playback"
              description="Read assistant replies aloud using your browser voice engine."
              enabled={speechSupported ? settings.tts_enabled : false}
              onChange={(enabled) => {
                if (!speechSupported) return;
                updateSettings({ tts_enabled: enabled });
              }}
            />
            {!speechSupported && (
              <div className="text-xs text-[var(--muted)]">
                Speech synthesis is not available in this browser.
              </div>
            )}
          </div>
        </div>

        {/* Performance Settings */}
        <div className="glass-card p-6 glow-border">
          <h2 className="text-lg font-bold text-[var(--ink)] mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#b07b2c]" />
            Compute Resources
          </h2>

          <div className="space-y-8">
            <div>
              <div className="flex justify-between mb-4">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Processor Allocation</label>
                <span className="text-sm font-mono text-[#1f6d5a]">{settings.threads} / {maxThreads} CORES</span>
              </div>
              <input
                type="range"
                min={1}
                max={maxThreads}
                value={settings.threads}
                onChange={(e) => updateSettings({ threads: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-[#e7e0cf] rounded-lg appearance-none cursor-pointer accent-[#1f6d5a]"
              />
              <p className="text-[10px] text-[var(--muted)] mt-2 font-bold uppercase tracking-wider">
                Recommended: {maxThreads - 1} for optimal system stability
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-4">
                Contextual Memory
              </label>
              <div className="grid grid-cols-4 gap-3">
                {ctxSizeOptions.map(size => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ ctx_size: size })}
                    className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border ${settings.ctx_size === size
                      ? 'bg-[#1f6d5a] border-[#1f6d5a] text-white shadow-lg shadow-[#1f6d5a]/20'
                      : 'bg-[var(--glass-strong)] border-[var(--border)] text-[var(--muted)] hover:border-[rgba(45,42,35,0.3)]'
                      }`}
                  >
                    {size / 1024}K
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Language Packs */}
        <div className="glass-card p-6 glow-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
              <Languages className="w-5 h-5 text-[#1f6d5a]" />
              Language Packs
            </h2>
            <div className="flex items-center gap-2">
      {activeId && (
        <button
          onClick={() => handleActivatePack(null)}
          disabled={packActionId === 'active-clear' || packsLoading}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--glass-strong)] text-[10px] font-bold uppercase tracking-widest"
        >
                  Clear Active
                </button>
              )}
              <button
                onClick={() => refreshPacks()}
                disabled={packsLoading}
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--glass-strong)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${packsLoading ? 'animate-spin' : ''}`} />
                Rescan
              </button>
            </div>
          </div>

          {(packsError || packActionError) && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-700">
              {packsError || packActionError}
            </div>
          )}

          <div className="grid gap-4">
            {packs.length === 0 && !packsLoading && (
              <div className="text-xs text-[var(--muted)]">
                No language packs installed yet. Install a pack from a local folder.
              </div>
            )}
            {packs.map(pack => {
              const manifest = pack.manifest;
              const isActive = activeId === pack.id;
              const isValid = pack.valid;
              return (
                <div key={pack.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--glass-strong)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[var(--ink)]">
                        {manifest?.name || pack.id}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--muted)]">{pack.id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <span className="text-[9px] px-2 py-1 rounded-full border border-[#1f6d5a]/30 text-[#1f6d5a] uppercase tracking-widest font-bold">
                          Active
                        </span>
                      )}
                      <span
                        className={`text-[9px] px-2 py-1 rounded-full border uppercase tracking-widest font-bold ${
                          isValid ? 'border-[#1f6d5a]/30 text-[#1f6d5a]' : 'border-red-500/30 text-red-600'
                        }`}
                      >
                        {isValid ? 'Validated' : 'Invalid'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-mono text-[var(--muted)]">
                    {manifest?.locale && <span>{manifest.locale}</span>}
                    {manifest?.version && <span>v{manifest.version}</span>}
                    {manifest?.author && <span>{manifest.author}</span>}
                    {manifest?.license && <span>{manifest.license}</span>}
                    {manifest?.resources?.length ? <span>{manifest.resources.length} files</span> : null}
                  </div>

                  {manifest?.description && (
                    <p className="mt-3 text-xs text-[var(--muted)] leading-relaxed">
                      {manifest.description}
                    </p>
                  )}

                  {!isValid && pack.errors.length > 0 && (
                    <div className="mt-3 text-[10px] text-red-600 font-bold uppercase tracking-widest">
                      {pack.errors[0]}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-[10px] font-mono text-[var(--muted)] truncate">
                      {pack.path}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleActivatePack(pack.id)}
                        disabled={!isValid || isActive || packActionId === pack.id}
                        className="px-3 py-2 rounded-lg border border-[#1f6d5a]/30 bg-[#1f6d5a]/10 text-[#1f6d5a] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                      >
                        {packActionId === pack.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        {isActive ? 'Active' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleRemovePack(pack.id)}
                        disabled={packActionId === pack.id}
                        className="px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                      >
                        {packActionId === pack.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Install From Folder Path
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={installPath}
                onChange={(e) => setInstallPath(e.target.value)}
                placeholder="/path/to/language-pack"
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--ink)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1f6d5a]/30"
              />
              <button
                onClick={handleInstallPack}
                disabled={isInstallingPack || !installPath.trim()}
                className="px-6 py-3 rounded-xl border border-[#1f6d5a]/30 bg-[#1f6d5a]/10 text-[#1f6d5a] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
              >
                {isInstallingPack ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Install
              </button>
            </div>
            <div className="mt-2 text-[10px] text-[var(--muted)] flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5" />
              Install will validate the manifest and roll back on failure.
            </div>
          </div>
        </div>

        {/* Firmware Updates */}
        <div className="glass-card p-6 glow-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#1f6d5a]" />
              Firmware Updates
            </h2>
            <button
              onClick={() => refreshUpdateStatus()}
              disabled={updateLoading}
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--glass-strong)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updateLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {(updateError || updateActionError) && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-700">
              {updateError || updateActionError}
            </div>
          )}

          <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--glass-strong)]">
            {lastUpdate ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Last Applied</span>
                  <span className={`font-mono ${lastUpdate.status === 'success' ? 'text-[#1f6d5a]' : 'text-red-600'}`}>
                    {lastUpdate.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Pack</span>
                  <span className="font-mono">{lastUpdate.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Version</span>
                  <span className="font-mono">{lastUpdate.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Applied At</span>
                  <span className="font-mono text-[10px]">{lastUpdate.applied_at}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Files Applied</span>
                  <span className="font-mono">{lastUpdate.files_applied}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Files Deleted</span>
                  <span className="font-mono">{lastUpdate.files_deleted}</span>
                </div>
                {lastUpdate.error && (
                  <div className="mt-2 text-[10px] text-red-600 font-bold uppercase tracking-widest">
                    {lastUpdate.error}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-[var(--muted)]">
                No firmware updates applied yet.
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
              Apply Update Pack From Folder Path
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                value={updatePath}
                onChange={(e) => setUpdatePath(e.target.value)}
                placeholder="/path/to/firmware-update-pack"
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--ink)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1f6d5a]/30"
              />
              <button
                onClick={handleApplyFirmwareUpdate}
                disabled={isApplyingUpdate || !updatePath.trim()}
                className="px-6 py-3 rounded-xl border border-[#1f6d5a]/30 bg-[#1f6d5a]/10 text-[#1f6d5a] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
              >
                {isApplyingUpdate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-4 h-4" />
                )}
                Apply
              </button>
            </div>
            <div className="mt-2 text-[10px] text-[var(--muted)] flex items-center gap-2">
              <XCircle className="w-3.5 h-3.5" />
              Pack must include firmware_update.json and payload/ with SHA-256 checksums.
            </div>
          </div>
        </div>

        {/* Diagnostics */}
        <div className="glass-card p-6 glow-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[var(--ink)] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#b07b2c]" />
              Diagnostics
            </h2>
            <button
              onClick={() => refetchDiagnostics()}
              disabled={diagnosticsLoading}
              className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--glass-strong)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:border-[rgba(45,42,35,0.3)] disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {diagnosticsError && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-700">
              {diagnosticsError}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--glass-strong)]">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
                <Server className="w-4 h-4" />
                Server
              </div>
              <div className="mt-3 space-y-2 text-sm text-[var(--ink)]">
                <div className="flex items-center justify-between">
                  <span>Version</span>
                  <span className="font-mono">{diagnostics?.server.version || '--'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Uptime</span>
                  <span className="font-mono">{formatUptime(diagnostics?.server.uptime_seconds)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Time (UTC)</span>
                  <span className="font-mono text-xs">{diagnostics?.server.time_utc || '--'}</span>
                </div>
              </div>
            </div>

            <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--glass-strong)]">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
                <Zap className="w-4 h-4" />
                Model Engine
              </div>
              <div className="mt-3 space-y-2 text-sm text-[var(--ink)]">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className={`font-mono ${diagnostics?.llm.running ? 'text-[#1f6d5a]' : 'text-[var(--muted)]'}`}>
                    {diagnostics?.llm.running ? 'Running' : 'Idle'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Model</span>
                  <span className="font-mono text-xs">{diagnostics?.llm.model_id || '--'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Port</span>
                  <span className="font-mono">{diagnostics?.llm.port || 7778}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 border border-[var(--border)] rounded-xl p-4 bg-[var(--glass-strong)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">Model Inventory</div>
              <div className="text-xs font-bold text-[#1f6d5a] uppercase tracking-widest">
                {diagnostics?.models.available ?? 0} / {diagnostics?.models.manifest_total ?? 0} available
              </div>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs text-[var(--muted)]">
              {(diagnostics?.paths || []).map(path => (
                <div key={path.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-[#b07b2c]" />
                    <span className="uppercase tracking-widest text-[10px]">{path.name}</span>
                  </div>
                  <span className={`font-mono text-[10px] ${path.exists ? 'text-[#1f6d5a]' : 'text-red-600'}`}>
                    {path.exists ? 'OK' : 'Missing'}
                  </span>
                </div>
              ))}
              {(!diagnostics?.paths || diagnostics.paths.length === 0) && (
                <div className="text-xs text-[var(--muted)]">No path data available.</div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={resetSettings}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--paper-2)] hover:bg-[var(--glass-strong)] text-[var(--ink)] font-bold text-xs uppercase tracking-widest rounded-xl transition-all border border-[var(--border)]"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Initial Defaults
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs font-bold text-[#1f6d5a] uppercase tracking-widest bg-[#1f6d5a]/10 px-4 py-2 rounded-lg border border-[#1f6d5a]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1f6d5a] animate-pulse" />
            Autosave Active
          </div>
        </div>
      </div>
    </div>
  );
}

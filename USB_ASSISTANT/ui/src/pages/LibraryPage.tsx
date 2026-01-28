import { useMemo, useState, useCallback, useEffect } from 'react';
import { BookOpen, Search, Layers, Cpu, Play, StopCircle, RefreshCw, Star } from 'lucide-react';
import { useModels, useSystemInfo, useLLM, useSettings } from '../hooks';
import { useI18n } from '../i18n';
import skillsData from '../data/skills.json';
import type { ModelInfo } from '../types';

interface Skill {
  id: string;
  name: string;
  description?: string;
}

export function LibraryPage() {
  const { t } = useI18n();
  const { models, loading: modelsLoading, error: modelsError, refreshIndex } = useModels();
  const { systemInfo } = useSystemInfo();
  const { status, loading: llmLoading, error: llmError, start, stop } = useLLM();
  const { settings } = useSettings();
  const [search, setSearch] = useState('');
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [defaultModelId, setDefaultModelId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('models.defaultModelId');
  });
  const skills = skillsData as Skill[];

  const installedModels = useMemo(() => models.filter(m => m.available !== false), [models]);
  const filteredSkills = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return skills;
    return skills.filter(skill =>
      (skill.name || '').toLowerCase().includes(term) ||
      (skill.description || '').toLowerCase().includes(term)
    );
  }, [search, skills]);

  const activeModel = models.find(model => model.id === status.model_id) || null;
  const defaultModel = defaultModelId ? models.find(model => model.id === defaultModelId) || null : null;

  const updateDefaultModel = useCallback((modelId: string) => {
    setDefaultModelId(prev => {
      const nextValue = prev === modelId ? null : modelId;
      try {
        if (nextValue) {
          localStorage.setItem('models.defaultModelId', nextValue);
        } else {
          localStorage.removeItem('models.defaultModelId');
        }
      } catch {
        // ignore storage failures
      }
      return nextValue;
    });
  }, []);

  useEffect(() => {
    if (!llmLoading) setLoadingModelId(null);
  }, [llmLoading]);

  const handleLoadModel = async (model: ModelInfo) => {
    setLoadingModelId(model.id);
    try {
      const response = await fetch('/api/llm/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: model.id,
          ctx: settings.ctx_size,
          threads: settings.threads,
          gpu_layers: 0,
        }),
      });

      const preflight = await response.json();
      if (!response.ok || !preflight?.compatible) {
        window.alert(preflight?.message || 'Model is not compatible with this system.');
        setLoadingModelId(null);
        return;
      }

      if (preflight?.hot_swap?.requires_swap) {
        const confirmed = window.confirm(preflight.hot_swap.reason || `Hot swap to ${model.display_name}?`);
        if (!confirmed) {
          setLoadingModelId(null);
          return;
        }
      }

      await start(model.id);
    } catch (err) {
      setLoadingModelId(null);
    }
  };

  const handleUnloadModel = async () => {
    if (!status.running) return;
    const confirmed = window.confirm('Unload the active model?');
    if (!confirmed) return;
    await stop();
  };

  const formatBytes = (bytes?: number | null) => {
    if (!bytes) return '--';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-8 gap-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1f6d5a]/10 border border-[#1f6d5a]/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#1f6d5a]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--ink)] font-serif">Library</h1>
            <p className="text-sm text-[var(--muted)]">Installed models and available skills.</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
          <Cpu className="w-4 h-4" />
          {systemInfo?.ram_available_gb?.toFixed(1) || '--'} GB Available
        </div>
      </div>

      <section className="bg-[var(--glass)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)]">{t('library.modelManagerTitle', 'Model Manager')}</h2>
            <p className="text-xs text-[var(--muted)]">{t('library.modelManagerSubtitle', 'Load, unload, and check GGUF compatibility.')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshIndex()}
              disabled={modelsLoading}
              className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--glass-strong)] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:border-[rgba(45,42,35,0.3)]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${modelsLoading ? 'animate-spin' : ''}`} />
              {t('library.rescan', 'Rescan')}
            </button>
            <button
              onClick={handleUnloadModel}
              disabled={!status.running || llmLoading}
              className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
            >
              <StopCircle className="w-3.5 h-3.5" />
              {t('library.unload', 'Unload')}
            </button>
          </div>
        </div>

        {(modelsError || llmError) && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-700">
            {modelsError || llmError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
          <div>{t('library.active', 'Active')}: {activeModel ? activeModel.display_name : 'None'}</div>
          <div>{t('library.default', 'Default')}: {defaultModel ? defaultModel.display_name : 'None'}</div>
          <div>{t('library.ctxTarget', 'CTX Target')}: {settings.ctx_size}</div>
        </div>

        <div className="grid gap-4">
          {models.map(model => {
            const compatibility = model.compatibility;
            const isActive = status.running && status.model_id === model.id;
            const isCompatible = compatibility?.compatible ?? (model.available !== false);
            const reason = compatibility?.reasons?.[0];
            const ctxLimit = compatibility?.ctx_limit ?? model.metadata?.context_length;
            const isDefault = defaultModelId === model.id;
            const isLoading = loadingModelId === model.id && llmLoading;
            const hasError = !!llmError && loadingModelId === model.id;
            const stateLabel = hasError
              ? t('library.state.error', 'Error')
              : isActive
                ? t('library.state.ready', 'Ready')
                : isLoading
                  ? t('library.state.loading', 'Loading')
                  : model.available === false
                    ? t('library.state.missing', 'Missing')
                    : t('library.state.available', 'Available');
            const stateTone = hasError
              ? 'border-red-500/30 text-red-600'
              : isActive
                ? 'border-[#1f6d5a]/30 text-[#1f6d5a]'
                : isLoading
                  ? 'border-amber-500/40 text-amber-700'
                  : model.available === false
                    ? 'border-[var(--border)] text-[var(--muted)]'
                    : 'border-[#1f6d5a]/30 text-[#1f6d5a]';

            return (
              <div key={model.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--glass-strong)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-[var(--ink)]">{model.display_name}</div>
                    <div className="text-[10px] font-mono text-[var(--muted)]">{model.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateDefaultModel(model.id)}
                      disabled={!isCompatible}
                      className={`p-1.5 rounded-md border ${isDefault ? 'border-[#1f6d5a]/30 bg-[#1f6d5a]/10' : 'border-[var(--border)] bg-[var(--glass-strong)]'} disabled:opacity-40`}
                      title={isDefault ? 'Default model' : 'Set as default'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isDefault ? 'text-[#1f6d5a] fill-current' : 'text-[var(--muted)]'}`} />
                    </button>
                    {isActive && (
                      <span className="text-[9px] px-2 py-1 rounded-full border border-[#1f6d5a]/30 text-[#1f6d5a] uppercase tracking-widest font-bold">
                        Active
                      </span>
                    )}
                    <span className={`text-[9px] px-2 py-1 rounded-full border uppercase tracking-widest font-bold ${stateTone}`}>
                      {stateLabel}
                    </span>
                    <span className={`text-[9px] px-2 py-1 rounded-full border uppercase tracking-widest font-bold ${isCompatible ? 'border-[#1f6d5a]/30 text-[#1f6d5a]' : 'border-red-500/30 text-red-600'}`}>
                      {isCompatible ? t('library.compatible', 'Compatible') : t('library.blocked', 'Blocked')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-mono text-[var(--muted)]">
                  <span>{model.category.toUpperCase()}</span>
                  <span>RAM {model.min_ram_gb} GB</span>
                  <span>CTX {compatibility?.ctx_required ?? model.recommended_ctx}{ctxLimit ? ` / ${ctxLimit}` : ''}</span>
                  {model.metadata?.architecture && <span>{model.metadata.architecture}</span>}
                  {model.metadata?.tokenizer_model && <span>{model.metadata.tokenizer_model}</span>}
                  {model.file?.size_bytes && <span>{formatBytes(model.file?.size_bytes)}</span>}
                </div>

                {reason && !isCompatible && (
                  <div className="mt-3 text-[10px] text-red-600 font-bold uppercase tracking-widest">
                    {reason}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-[var(--muted)]">
                    {model.file?.path ? model.file.path : model.filename}
                  </div>
                  <button
                    onClick={() => handleLoadModel(model)}
                    disabled={llmLoading || !isCompatible}
                    className="px-4 py-2 rounded-lg border border-[#1f6d5a]/30 bg-[#1f6d5a]/10 text-[#1f6d5a] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {isActive ? 'Running' : 'Load'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[var(--glass)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">Installed Models</h2>
          <span className="text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
            {installedModels.length} available
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
              <tr className="text-left border-b border-[var(--border)]">
                <th className="py-2">Model</th>
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Min RAM</th>
              </tr>
            </thead>
            <tbody>
              {installedModels.map((model: ModelInfo) => (
                <tr key={model.id} className="border-b border-[rgba(45,42,35,0.08)]">
                  <td className="py-3 text-[var(--ink)] font-semibold">
                    {model.display_name}
                    <div className="text-[10px] font-mono text-[var(--muted)]">{model.id}</div>
                  </td>
                  <td className="py-3 text-[var(--muted)] uppercase text-xs font-bold">
                    {model.category}
                  </td>
                  <td className="py-3 text-right text-[var(--ink)] font-mono">
                    {model.min_ram_gb} GB
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-[var(--glass)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">Skills</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search skills"
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--glass-strong)] text-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#1f6d5a]/30"
            />
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map(skill => (
            <div key={skill.id} className="border border-[var(--border)] rounded-xl p-4 bg-[var(--glass-strong)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#1f6d5a]/10 border border-[#1f6d5a]/20 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-[#1f6d5a]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--ink)] truncate">{skill.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">Skill</div>
                </div>
              </div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                {skill.description || 'Specialized intelligence module.'}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

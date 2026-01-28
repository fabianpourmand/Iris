import { useState } from 'react';
import { FolderSearch, HardDrive } from 'lucide-react';
import { FileExplorer, FileEditor } from '../components';
import { useSettings } from '../hooks';

export function ExplorerPage() {
  const { settings, updateSettings } = useSettings();
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const handlePickSandbox = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'pick_folder' }),
      });
      const data = await response.json();
      if (data.success && data.result) {
        updateSettings({ sandbox_root: data.result as string });
        return;
      }
      const manual = window.prompt('Enter workspace folder path:', settings.sandbox_root);
      if (manual) updateSettings({ sandbox_root: manual.trim() });
    } catch (err) {
      console.error('Failed to pick folder:', err);
      const manual = window.prompt('Enter workspace folder path:', settings.sandbox_root);
      if (manual) updateSettings({ sandbox_root: manual.trim() });
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 p-6 lg:p-8 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.3em] text-[var(--muted)]">Workspace</div>
          <h1 className="text-3xl font-serif font-bold text-[var(--ink)]">Explorer</h1>
          <p className="text-[var(--muted)] text-base mt-2">Browse and edit files directly from your device.</p>
        </div>
        <button
          onClick={handlePickSandbox}
          disabled={picking}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-[var(--border)] bg-[var(--glass-strong)] hover:bg-[var(--paper-2)] transition-all text-sm font-bold uppercase tracking-widest disabled:opacity-60"
        >
          <FolderSearch className="w-5 h-5 text-[#1f6d5a]" />
          {picking ? 'Selecting…' : 'Select Workspace'}
        </button>
      </header>

      <div className="bg-[var(--glass-strong)] border border-[var(--border)] rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <HardDrive className="w-5 h-5 text-[#1f6d5a]" />
          <div className="min-w-0">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[var(--muted)]">Active Root</div>
            <div className="text-sm font-mono text-[var(--ink)] truncate">{settings.sandbox_root || '.'}</div>
          </div>
        </div>
        {!settings.sandbox_root || settings.sandbox_root === '.' ? (
          <span className="text-xs font-mono uppercase tracking-widest text-amber-700">Select a folder to unlock browsing.</span>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="min-h-0">
          <FileExplorer
            rootPath={settings.sandbox_root}
            currentPath={settings.sandbox_root}
            onSelect={(path) => updateSettings({ sandbox_root: path })}
            onOpenFile={(path) => setActiveFile(path)}
          />
        </div>
        <div className="min-h-0">
          <FileEditor
            filePath={activeFile}
            rootPath={settings.sandbox_root}
            onClose={() => setActiveFile(null)}
          />
        </div>
      </div>
    </div>
  );
}

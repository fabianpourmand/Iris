import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save, X, RefreshCcw, History } from 'lucide-react';

interface FileEditorProps {
  filePath: string | null;
  rootPath: string;
  onClose: () => void;
}

export function FileEditor({ filePath, rootPath, onClose }: FileEditorProps) {
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [originalHash, setOriginalHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<FileEditEntry | null>(null);

  const displayPath = useMemo(() => {
    if (!filePath) return 'No file selected';
    return filePath.replace(rootPath, '') || filePath;
  }, [filePath, rootPath]);

  const historyKey = 'iris-file-history';

  type DiffLine = { type: 'same' | 'add' | 'remove'; value: string };

  interface FileEditEntry {
    path: string;
    timestamp: string;
    before: string;
    after: string;
  }

  const readHistory = useCallback((): FileEditEntry[] => {
    try {
      const raw = localStorage.getItem(historyKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [historyKey]);

  const writeHistory = useCallback((entries: FileEditEntry[]) => {
    try {
      localStorage.setItem(historyKey, JSON.stringify(entries.slice(-50)));
    } catch {
      // ignore
    }
  }, [historyKey]);

  const updateHistoryEntry = useCallback((pathValue: string | null) => {
    if (!pathValue) {
      setHistoryEntry(null);
      return;
    }
    const entries = readHistory();
    const last = [...entries].reverse().find(entry => entry.path === pathValue) || null;
    setHistoryEntry(last);
  }, [readHistory]);

  const appendHistory = (entry: FileEditEntry) => {
    const entries = readHistory();
    entries.push(entry);
    writeHistory(entries);
    updateHistoryEntry(entry.path);
  };

  const hashContent = useCallback(async (value: string) => {
    if (!window.crypto?.subtle) return null;
    const buffer = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex;
  }, []);

  const buildDiff = useCallback((before: string, after: string): DiffLine[] => {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const diff: DiffLine[] = [];
    let i = 0;
    let j = 0;
    const lookahead = 3;

    while (i < beforeLines.length || j < afterLines.length) {
      const left = beforeLines[i];
      const right = afterLines[j];

      if (left === right) {
        diff.push({ type: 'same', value: left ?? '' });
        i += 1;
        j += 1;
        continue;
      }

      let matchInBefore = -1;
      for (let k = 1; k <= lookahead && i + k < beforeLines.length; k += 1) {
        if (beforeLines[i + k] === right) {
          matchInBefore = i + k;
          break;
        }
      }

      let matchInAfter = -1;
      for (let k = 1; k <= lookahead && j + k < afterLines.length; k += 1) {
        if (afterLines[j + k] === left) {
          matchInAfter = j + k;
          break;
        }
      }

      if (matchInBefore !== -1) {
        while (i < matchInBefore) {
          diff.push({ type: 'remove', value: beforeLines[i] });
          i += 1;
        }
        continue;
      }

      if (matchInAfter !== -1) {
        while (j < matchInAfter) {
          diff.push({ type: 'add', value: afterLines[j] });
          j += 1;
        }
        continue;
      }

      if (i < beforeLines.length) {
        diff.push({ type: 'remove', value: beforeLines[i] });
        i += 1;
      }
      if (j < afterLines.length) {
        diff.push({ type: 'add', value: afterLines[j] });
        j += 1;
      }
    }

    return diff;
  }, []);

  const loadFile = useCallback(async () => {
    if (!filePath) return;
    setLoading(true);
    setError(null);
    setConflict(false);
    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'read_file',
          path: filePath,
          root: rootPath,
        }),
      });
      const data = await response.json();
      if (data.success && data.result) {
        const nextContent = data.result.content || '';
        setContent(nextContent);
        setOriginal(nextContent);
        const nextHash = await hashContent(nextContent);
        setOriginalHash(nextHash);
        updateHistoryEntry(filePath);
      } else {
        setError(data.error || 'Failed to read file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setLoading(false);
    }
  }, [filePath, rootPath, hashContent, updateHistoryEntry]);

  const handleSave = async () => {
    if (!filePath) return;
    setSaving(true);
    setError(null);
    setConflict(false);
    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: originalHash ? 'edit_file' : 'write_file',
          path: filePath,
          root: rootPath,
          content,
          expected_sha256: originalHash,
        }),
      });
      const data = await response.json();
      if (data.success) {
        appendHistory({
          path: filePath,
          timestamp: new Date().toISOString(),
          before: original,
          after: content,
        });
        setOriginal(content);
        const nextHash = await hashContent(content);
        setOriginalHash(nextHash);
      } else {
        if (typeof data.error === 'string' && data.error.toLowerCase().includes('changed')) {
          setConflict(true);
        }
        setError(data.error || 'Failed to save file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleUndo = async () => {
    if (!filePath || !historyEntry) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: originalHash ? 'edit_file' : 'write_file',
          path: filePath,
          root: rootPath,
          content: historyEntry.before,
          expected_sha256: originalHash,
        }),
      });
      const data = await response.json();
      if (data.success) {
        appendHistory({
          path: filePath,
          timestamp: new Date().toISOString(),
          before: original,
          after: historyEntry.before,
        });
        setContent(historyEntry.before);
        setOriginal(historyEntry.before);
        const nextHash = await hashContent(historyEntry.before);
        setOriginalHash(nextHash);
      } else {
        setError(data.error || 'Failed to undo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to undo');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!filePath) return;
    loadFile();
  }, [filePath, loadFile]);

  const dirty = content !== original;
  const diffLines = useMemo(() => buildDiff(original, content), [buildDiff, original, content]);

  return (
    <div className="flex flex-col border border-[var(--border)] rounded-2xl bg-[var(--glass-strong)] overflow-hidden">
      <div className="px-4 py-3 bg-[var(--paper-2)] border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-mono uppercase tracking-widest text-[var(--muted)]">File Editor</span>
          <span className="text-sm font-mono text-[var(--ink)] truncate max-w-[220px]">{displayPath}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadFile}
            disabled={!filePath || loading}
            className="p-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#1f6d5a] hover:bg-white/40 transition-all"
            title="Reload"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-red-500 hover:bg-white/40 transition-all"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-3 text-sm font-mono uppercase text-red-600">{error}</div>
        )}
        {conflict && (
          <div className="mb-3 text-sm font-mono uppercase text-amber-700">
            File changed on disk. Reload before saving.
          </div>
        )}
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={!filePath || loading}
          rows={10}
          className="w-full min-h-[180px] max-h-[300px] resize-y bg-[var(--paper)] border border-[var(--border)] rounded-xl p-4 text-sm font-mono text-[var(--ink)] focus:outline-none"
          placeholder={filePath ? 'Loading file...' : 'Select a file from the explorer'}
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm font-mono uppercase tracking-widest text-[var(--muted)]">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </div>
          <button
            onClick={handleSave}
            disabled={!filePath || !dirty || saving}
            className="px-4 py-2.5 rounded-lg bg-[#1f6d5a] text-white text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a5c4c] transition-all flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving' : 'Save'}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="text-sm font-bold uppercase tracking-widest text-[#1f6d5a]"
            type="button"
          >
            {showDiff ? 'Hide Diff' : 'Preview Diff'}
          </button>
          <button
            onClick={handleUndo}
            disabled={!historyEntry || saving}
            className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-bold uppercase tracking-widest text-[var(--muted)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <History className="w-3.5 h-3.5" />
            Undo Save
          </button>
        </div>
        {showDiff && (
          <div className="mt-3 border border-[var(--border)] rounded-xl bg-[var(--paper)] max-h-[200px] overflow-auto">
            <div className="px-4 py-3 text-sm font-mono uppercase tracking-widest text-[var(--muted)] border-b border-[var(--border)]">
              Diff Preview
            </div>
            <div className="p-3 space-y-1.5 text-sm font-mono">
              {diffLines.map((line, index) => (
                <div
                  key={`${line.type}-${index}`}
                  className={`whitespace-pre-wrap rounded px-1 ${line.type === 'add' ? 'bg-[#1f6d5a]/10 text-[#1f6d5a]' : line.type === 'remove' ? 'bg-red-500/10 text-red-600 line-through' : 'text-[var(--muted)]'}`}
                >
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} {line.value}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

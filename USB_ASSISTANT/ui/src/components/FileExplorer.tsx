import { useState, useEffect, useCallback } from 'react';
import { Folder, File, ChevronRight, Home, ArrowLeft, Loader2, HardDrive } from 'lucide-react';

interface FileExplorerProps {
    onSelect: (path: string) => void;
    currentPath?: string;
    rootPath?: string;
    onOpenFile?: (path: string) => void;
}

export function FileExplorer({ onSelect, currentPath = '.', rootPath = '.', onOpenFile }: FileExplorerProps) {
    const [path, setPath] = useState(currentPath);
    const [items, setItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const normalizePath = useCallback((value: string) => {
        return value.replace(/\\/g, '/').replace(/\/+$/, '') || '.';
    }, []);

    const isWithinRoot = useCallback((candidate: string) => {
        if (!rootPath || rootPath === '.') return true;
        const rootNorm = normalizePath(rootPath);
        const candidateNorm = normalizePath(candidate);
        return candidateNorm === rootNorm || candidateNorm.startsWith(`${rootNorm}/`);
    }, [normalizePath, rootPath]);

    const fetchItems = useCallback(async (targetPath: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tool: 'list_dir',
                    path: targetPath,
                    root: rootPath,
                }),
            });
            const data = await response.json();
            if (data.success && data.result) {
                setItems(data.result as string[]);
                setPath(targetPath);
            } else {
                setError(data.error || 'Failed to list directory');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch items');
        } finally {
            setLoading(false);
        }
    }, [rootPath]);

    useEffect(() => {
        setPath(currentPath);
        fetchItems(currentPath);
    }, [currentPath, fetchItems]);

    const handleFolderClick = (name: string) => {
        const nextPath = path === '.' ? name : `${path}/${name}`;
        fetchItems(nextPath);
    };

    const handleFileClick = (name: string) => {
        if (!onOpenFile) return;
        const targetPath = path === '.' ? name : `${path}/${name}`;
        onOpenFile(targetPath);
    };

    const handleGoUp = () => {
        const parts = path.split('/');
        if (parts.length <= 1) {
            if (path !== '.') fetchItems('.');
            return;
        }
        parts.pop();
        const nextPath = parts.join('/');
        if (!isWithinRoot(nextPath)) return;
        fetchItems(nextPath);
    };

    const handleSelect = () => {
        onSelect(path);
    };

    return (
        <div className="flex flex-col border border-[var(--border)] rounded-xl bg-[var(--glass-strong)] overflow-hidden">
            <div className="px-3 py-3 bg-[var(--paper-2)] border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                    <button
                        onClick={() => fetchItems('.')}
                        className="p-2 hover:bg-black/5 rounded text-[var(--muted)] hover:text-[var(--ink)]"
                    >
                        <Home className="w-4 h-4" />
                    </button>
                    <div className="text-sm font-mono text-[var(--muted)] truncate">
                        {path === '.' ? 'root' : path}
                    </div>
                </div>
                <button
                    onClick={handleGoUp}
                    disabled={path === '.'}
                    className="p-2 hover:bg-black/5 rounded text-[var(--muted)] disabled:opacity-30"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 min-h-[220px] max-h-[320px] overflow-y-auto p-2 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 space-y-3">
                        <Loader2 className="w-5 h-5 text-[#1f6d5a] animate-spin" />
                        <span className="text-sm font-mono uppercase tracking-widest text-[var(--muted)]">Scanning...</span>
                    </div>
                ) : error ? (
                    <div className="p-4 text-sm font-mono text-red-600 uppercase text-center">
                        {error}
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-sm font-mono text-[var(--muted)] uppercase text-center">
                        Directory Empty
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-px">
                        {items.map((item) => {
                            const isDir = !item.includes('.'); // Simplistic heuristic for demo, backend should ideally return types
                            const fileClass = onOpenFile
                                ? 'hover:bg-[#1f6d5a]/5 cursor-pointer'
                                : 'opacity-60 cursor-default';
                            return (
                                <button
                                    key={item}
                                    onClick={() => isDir ? handleFolderClick(item) : handleFileClick(item)}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${isDir ? 'hover:bg-[#1f6d5a]/5' : fileClass
                                        }`}
                                >
                                    {isDir ? (
                                        <Folder className="w-4 h-4 text-[#1f6d5a]" />
                                    ) : (
                                        <File className="w-4 h-4 text-[var(--muted)]" />
                                    )}
                                    <span className="text-sm font-mono text-[var(--ink)] truncate">{item}</span>
                                    {isDir && <ChevronRight className="w-3 h-3 ml-auto text-[var(--muted)] opacity-30" />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-[var(--border)] bg-[var(--paper-2)]">
                <button
                    onClick={handleSelect}
                    className="w-full py-3 bg-[#1f6d5a] hover:bg-[#1a5c4c] text-white text-sm font-bold uppercase tracking-widest rounded-lg shadow-sm active:translate-y-px transition-all flex items-center justify-center gap-2"
                >
                    <HardDrive className="w-3 h-3" />
                    <span>Lock Sandbox Root</span>
                </button>
            </div>
        </div>
    );
}

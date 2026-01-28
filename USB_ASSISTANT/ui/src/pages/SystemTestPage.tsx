import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, HardDrive, Activity, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { useSystemInfo, useModels, useLLM } from '../hooks';

const STORAGE_KEY = 'iris.systemTestCompleted';

type TestPhase = 'welcome' | 'checking' | 'testing' | 'ready' | 'error';

interface SystemCheck {
    id: string;
    label: string;
    icon: React.ReactNode;
    status: 'pending' | 'checking' | 'done';
    value?: string;
    detail?: string;
    performanceTier?: 'excellent' | 'good' | 'adequate' | 'limited';
}

export function SystemTestPage() {
    const navigate = useNavigate();
    const { systemInfo, loading: systemLoading } = useSystemInfo();
    const { models, loading: modelsLoading } = useModels();
    const { start: startLLM } = useLLM();

    const [phase, setPhase] = useState<TestPhase>('welcome');
    const [systemChecks, setSystemChecks] = useState<SystemCheck[]>([
        {
            id: 'cpu',
            label: 'Processing Power',
            icon: <Cpu className="w-5 h-5" />,
            status: 'pending'
        },
        {
            id: 'memory',
            label: 'Available Memory',
            icon: <HardDrive className="w-5 h-5" />,
            status: 'pending'
        },
        {
            id: 'ai',
            label: 'Intelligence Modules',
            icon: <Activity className="w-5 h-5" />,
            status: 'pending'
        }
    ]);
    const [, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const ramAvailable = systemInfo?.ram_available_gb || 0;
    const compatibleCount = useMemo(() => {
        if (!models.length) return 0;
        return models.filter(m => m.available !== false && m.min_ram_gb <= (ramAvailable || 0)).length;
    }, [models, ramAvailable]);
    const totalCount = models.length;

    // Auto-advance from welcome after a short delay
    useEffect(() => {
        if (phase === 'welcome') {
            const timer = setTimeout(() => {
                setPhase('checking');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [phase]);

    // Run system checks
    useEffect(() => {
        if (phase !== 'checking') return;
        if (systemLoading || modelsLoading) return;

        const runChecks = async () => {
            // Check CPU
            setSystemChecks(prev => prev.map(check => 
                check.id === 'cpu' ? { ...check, status: 'checking' } : check
            ));
            setProgress(20);
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const cpuName = systemInfo?.cpu_name || 'CPU detected';
            const cpuCores = systemInfo?.cpu_cores || 1;
            const cpuTier = cpuCores >= 8 ? 'excellent' : cpuCores >= 4 ? 'good' : 'adequate';
            const cpuDetail = cpuCores >= 8 
                ? 'Excellent performance • Can run all models' 
                : cpuCores >= 4 
                ? 'Good performance • Can run most models'
                : 'Basic performance • Limited model selection';
            
            setSystemChecks(prev => prev.map(check =>
                check.id === 'cpu' ? {
                    ...check,
                    status: 'done',
                    value: `${cpuName} • ${cpuCores} cores`,
                    detail: cpuDetail,
                    performanceTier: cpuTier as any
                } : check
            ));
            setProgress(40);

            // Check Memory
            setSystemChecks(prev => prev.map(check => 
                check.id === 'memory' ? { ...check, status: 'checking' } : check
            ));
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const ramTotal = systemInfo?.ram_total_gb || 8;
            const memTier = ramAvailable >= 16 ? 'excellent' : ramAvailable >= 8 ? 'good' : ramAvailable >= 4 ? 'adequate' : 'limited';
            const memDetail = ramAvailable >= 16
                ? 'Strong capacity • All models supported'
                : ramAvailable >= 8
                ? 'Good capacity • Most models supported'
                : 'Basic capacity • Some models limited';
            
            setSystemChecks(prev => prev.map(check =>
                check.id === 'memory' ? {
                    ...check,
                    status: 'done',
                    value: `${ramAvailable.toFixed(1)} GB available`,
                    detail: `Out of ${ramTotal.toFixed(1)} GB total • ${memDetail}`,
                    performanceTier: memTier as any
                } : check
            ));
            setProgress(60);

            // Check AI Models
            setSystemChecks(prev => prev.map(check => 
                check.id === 'ai' ? { ...check, status: 'checking' } : check
            ));
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const modelSummary = totalCount > 0
                ? `${compatibleCount}/${totalCount} models ready`
                : 'Models checked';
            const aiTier = compatibleCount === totalCount ? 'excellent' : compatibleCount > 0 ? 'good' : 'adequate';
            const aiDetail = compatibleCount === totalCount
                ? 'Full compatibility • All models available'
                : compatibleCount > 0
                ? `${compatibleCount} models available • Some limited by specs`
                : 'Check system specs for recommendations';
            
            setSystemChecks(prev => prev.map(check =>
                check.id === 'ai' ? {
                    ...check,
                    status: 'done',
                    value: modelSummary,
                    detail: aiDetail,
                    performanceTier: aiTier as any
                } : check
            ));
            setProgress(80);

            // Move to testing phase
            setTimeout(() => {
                setPhase('testing');
            }, 500);
        };

        runChecks();
    }, [phase, systemLoading, modelsLoading, systemInfo, models, ramAvailable, compatibleCount, totalCount]);

    // Run AI test
    useEffect(() => {
        if (phase !== 'testing') return;

        const runTest = async () => {
            setProgress(90);
            
            // Find smallest compatible model
            const ramGB = systemInfo?.ram_available_gb || 8;
            const testModel = models
                .filter(m => m.available !== false && m.min_ram_gb <= ramGB)
                .sort((a, b) => a.min_ram_gb - b.min_ram_gb)[0];

            if (!testModel) {
                setErrorMessage('We could not run the quick AI check. You can still continue.');
                setPhase('error');
                return;
            }

            try {
                // Start the model
                await startLLM(testModel.id);
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Quick test
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: [{ role: 'user', content: 'Say hello in exactly one word.' }],
                        category: 'general',
                        max_tokens: 10,
                    }),
                });

                const data = await response.json();
                
                if (data.success) {
                    setProgress(100);
                    localStorage.setItem(STORAGE_KEY, 'true');
                    setTimeout(() => {
                        setPhase('ready');
                    }, 500);
                } else {
                    throw new Error(data.error || 'Test failed');
                }
            } catch (err) {
                setErrorMessage('We could not finish the quick AI check. You can still continue.');
                setPhase('error');
            }
        };

        runTest();
    }, [phase, systemInfo, models, startLLM]);

    const handleContinue = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        navigate('/chat');
    };

    // Skip button handler
    const handleSkip = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        navigate('/chat');
    };

    return (
        <div className="h-full w-full overflow-y-auto bg-[var(--paper)]">
            <div className="min-h-full w-full flex flex-col items-center justify-start px-4 sm:px-6 py-10">
                <div className="w-full max-w-3xl">
                {/* Welcome Phase */}
                {phase === 'welcome' && (
                    <div className="text-center space-y-8 animate-fade-in">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 blur-3xl" />
                            <img
                                src="/logo.jpg"
                                alt="IRIS"
                                className="w-24 h-24 mx-auto rounded-2xl border border-[var(--border)] bg-[var(--glass-strong)] shadow-2xl relative"
                            />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[var(--ink)] mb-2" style={{ fontFamily: '"EB Garamond", serif' }}>
                                Welcome to IRIS
                            </h1>
                            <p className="text-lg text-[var(--muted)]">
                                Your personal AI assistant
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
                            <p className="text-base text-[var(--muted)]">
                                Setting up your system...
                            </p>
                        </div>
                    </div>
                )}

                {/* System Check Phase */}
                {(phase === 'checking' || phase === 'testing') && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b border-[var(--border)]">
                            <div>
                                <h2 className="text-3xl font-bold text-[var(--ink)]" style={{ fontFamily: '"EB Garamond", serif' }}>
                                    System Initialization
                                </h2>
                                <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-[0.1em] mt-1">Mission Readiness Check</p>
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-2 bg-[rgba(31,109,90,0.15)] border border-[rgba(31,109,90,0.3)] rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#1f6d5a]" style={{ animation: 'pulse 2s ease-in-out infinite' }}></span>
                                <span className="text-xs font-bold uppercase tracking-[0.05em] text-[#1f6d5a]">In Progress</span>
                            </div>
                        </div>

                        {/* System Status Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            {systemChecks.map((check, idx) => {
                                const isCpu = check.id === 'cpu';
                                const isMem = check.id === 'memory';
                                const isAi = check.id === 'ai';

                                let borderColor = 'from-[#1f6d5a] to-[#2a8f6f]';
                                let accentBg = 'rgba(31, 109, 90, 0.15)';
                                let accentText = '#5fd4a0';
                                let gaugeGradient = 'from-[#1f6d5a] to-[#2a8f6f]';

                                if (isMem) {
                                    borderColor = 'from-[#b07b2c] to-[#d8941f]';
                                    accentBg = 'rgba(240, 173, 78, 0.15)';
                                    accentText = '#f0ad4e';
                                    gaugeGradient = 'from-[#b07b2c] to-[#d8941f]';
                                } else if (isAi) {
                                    borderColor = 'from-[#2a6f8f] to-[#1f9fbd]';
                                    accentBg = 'rgba(93, 207, 227, 0.15)';
                                    accentText = '#5dcfe3';
                                    gaugeGradient = 'from-[#2a6f8f] to-[#1f9fbd]';
                                }

                                const gaugeWidth = isCpu ? 85 : isMem ? 89 : 86;

                                return (
                                    <div key={check.id} className="bg-[rgba(45,42,35,0.3)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4 backdrop-blur-sm relative overflow-hidden" style={{ animation: `slideIn 0.4s ease-out ${idx * 0.1}s both` }}>
                                        <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${borderColor}`}></div>

                                        <div className="flex justify-between items-start mb-3">
                                            <div className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#9a9580]">
                                                {check.label}
                                            </div>
                                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-[0.65rem] font-bold uppercase" style={{ background: accentBg, color: accentText }}>
                                                <span className="w-1 h-1 rounded-full" style={{ background: accentText }}></span>
                                                {check.performanceTier?.charAt(0).toUpperCase() + (check.performanceTier?.slice(1) || 'Pending')}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <div className="text-lg font-bold text-[var(--ink)]">
                                                    {check.value || 'Checking...'}
                                                </div>
                                                {check.detail && <div className="text-[0.75rem] text-[#9a9580] leading-snug">{check.detail}</div>}
                                            </div>

                                            <div className="bg-[rgba(255,255,255,0.04)] rounded overflow-hidden h-8">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${gaugeGradient} transition-all duration-1000 ease-out`}
                                                    style={{ width: `${gaugeWidth}%` }}
                                                />
                                            </div>

                                            <div className="text-[0.75rem] text-[#9a9580]">
                                                Performance: {gaugeWidth}% Capacity
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Readiness Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[rgba(45,42,35,0.4)] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 backdrop-blur-sm">
                                <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)] mb-3 flex items-center gap-2">
                                    <span className="w-0.5 h-3 bg-[#1f6d5a] rounded"></span>
                                    System Components
                                </div>
                                <div className="space-y-2">
                                    {systemChecks.map(check => (
                                        <div key={check.id} className="grid grid-cols-3 items-center gap-2 p-2 bg-[rgba(255,255,255,0.03)] rounded border border-[rgba(255,255,255,0.06)]">
                                            <div className="w-6 h-6 rounded bg-[rgba(31,109,90,0.2)] flex items-center justify-center text-sm">
                                                {check.status === 'done' ? '✓' : check.status === 'checking' ? '⟳' : '◯'}
                                            </div>
                                            <div className="text-[0.8rem] text-[var(--ink)]">{check.label}</div>
                                            <div className="text-[0.75rem] text-[#9a9580] text-right">
                                                {check.status === 'done' ? 'Nominal' : check.status === 'checking' ? 'Checking' : 'Pending'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[rgba(45,42,35,0.4)] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 backdrop-blur-sm">
                                <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)] mb-3 flex items-center gap-2">
                                    <span className="w-0.5 h-3 bg-[#1f6d5a] rounded"></span>
                                    System Specs
                                </div>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-3 items-center gap-2 p-2 bg-[rgba(255,255,255,0.03)] rounded border border-[rgba(255,255,255,0.06)]">
                                        <div className="w-6 h-6 rounded bg-[rgba(31,109,90,0.2)] flex items-center justify-center text-sm">⚙</div>
                                        <div className="text-[0.8rem] text-[var(--ink)]">Processor</div>
                                        <div className="text-[0.75rem] text-[#9a9580] text-right">{systemInfo?.cpu_name || '--'}</div>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-2 p-2 bg-[rgba(255,255,255,0.03)] rounded border border-[rgba(255,255,255,0.06)]">
                                        <div className="w-6 h-6 rounded bg-[rgba(31,109,90,0.2)] flex items-center justify-center text-sm">⚙</div>
                                        <div className="text-[0.8rem] text-[var(--ink)]">Total RAM</div>
                                        <div className="text-[0.75rem] text-[#9a9580] text-right">{systemInfo?.ram_total_gb?.toFixed(0) || '--'} GB</div>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-2 p-2 bg-[rgba(255,255,255,0.03)] rounded border border-[rgba(255,255,255,0.06)]">
                                        <div className="w-6 h-6 rounded bg-[rgba(31,109,90,0.2)] flex items-center justify-center text-sm">⚙</div>
                                        <div className="text-[0.8rem] text-[var(--ink)]">GPU</div>
                                        <div className="text-[0.75rem] text-[#9a9580] text-right">{systemInfo?.gpu || 'Standard'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Timeline */}
                        <div className="bg-[rgba(45,42,35,0.4)] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 backdrop-blur-sm">
                            <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink)] mb-4 flex items-center gap-2">
                                <span className="w-0.5 h-3 bg-[#1f6d5a] rounded"></span>
                                Mission Timeline
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                                        phase === 'testing' ? 'bg-[rgba(31,109,90,0.6)] border-2 border-[#1f6d5a] text-[var(--ink)]' : phase === 'checking' ? 'bg-[rgba(31,109,90,0.4)] border-2 border-[rgba(31,109,90,0.4)] text-[var(--ink)]' : 'bg-[rgba(31,109,90,0.2)] border-2 border-[rgba(31,109,90,0.4)] text-[#9a9580]'
                                    }`}>1</div>
                                    <div className="text-[0.65rem] uppercase tracking-[0.05em] text-[#9a9580] text-center">System Check</div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                                        phase === 'testing' ? 'bg-[rgba(31,109,90,0.6)] border-2 border-[#1f6d5a] text-[var(--ink)] shadow-lg shadow-[rgba(31,109,90,0.5)]' : 'bg-[rgba(31,109,90,0.2)] border-2 border-[rgba(31,109,90,0.4)] text-[#9a9580]'
                                    }`}>2</div>
                                    <div className="text-[0.65rem] uppercase tracking-[0.05em] text-[#9a9580] text-center">Model Test</div>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-[rgba(31,109,90,0.2)] border-2 border-[rgba(31,109,90,0.4)] text-[#9a9580]">3</div>
                                    <div className="text-[0.65rem] uppercase tracking-[0.05em] text-[#9a9580] text-center">Ready</div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <button
                                onClick={handleSkip}
                                className="text-base font-bold text-[#b07b2c] hover:text-[var(--ink)] transition-all"
                            >
                                Skip Setup →
                            </button>
                        </div>
                    </div>
                )}

                <style>{`
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateX(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}</style>

                {/* Ready Phase */}
                {phase === 'ready' && (
                    <div className="text-center space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-teal-600/10 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10 text-teal-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-[var(--ink)]">
                                All set!
                            </h2>
                            <p className="text-lg text-[var(--muted)]">
                                Your system is ready to use IRIS
                            </p>
                        </div>
                        <button
                            onClick={handleContinue}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all transform hover:scale-105 font-medium shadow-lg text-lg"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Error Phase */}
                {phase === 'error' && (
                    <div className="text-center space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                            <Activity className="w-10 h-10 text-amber-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-[var(--ink)]">
                                Almost there
                            </h2>
                            <p className="text-[var(--muted)] max-w-sm mx-auto">
                                {errorMessage}
                            </p>
                        </div>
                        <button
                            onClick={handleContinue}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all transform hover:scale-105 font-medium shadow-lg"
                        >
                            Continue Anyway
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
                </div>
            </div>

            {(phase === 'checking' || phase === 'testing') && (
                <div className="sticky bottom-0 w-full border-t border-[var(--border)] bg-[var(--paper)]/95 backdrop-blur-md px-4 sm:px-6 py-4">
                    <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                        <span className="text-sm text-[var(--muted)]">You can continue anytime.</span>
                        <button
                            onClick={handleContinue}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--glass-strong)] border border-[var(--border)] text-[var(--ink)] rounded-xl hover:bg-[var(--paper-2)] transition-all font-medium shadow-lg text-base"
                        >
                            Continue to IRIS
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

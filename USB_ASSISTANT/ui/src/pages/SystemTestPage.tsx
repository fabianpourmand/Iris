import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, HardDrive, Activity, CheckCircle2, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useSystemInfo, useModels, useLLM } from '../hooks';

const STORAGE_KEY = 'iris.systemTestCompleted';

type TestPhase = 'welcome' | 'checking' | 'testing' | 'ready' | 'error';

interface SystemCheck {
    id: string;
    label: string;
    icon: React.ReactNode;
    status: 'pending' | 'checking' | 'done';
    value?: string;
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
            label: 'Performance check',
            icon: <Cpu className="w-5 h-5" />,
            status: 'pending'
        },
        {
            id: 'memory',
            label: 'Breathing room',
            icon: <HardDrive className="w-5 h-5" />,
            status: 'pending'
        },
        {
            id: 'ai',
            label: 'Quick AI check',
            icon: <Activity className="w-5 h-5" />,
            status: 'pending'
        }
    ]);
    const [progress, setProgress] = useState(0);
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
            
            const cpuLabel = systemInfo?.cpu_name || 'CPU detected';
            const cpuDetail = systemInfo?.cpu_cores ? `${systemInfo.cpu_cores} threads` : '';
            setSystemChecks(prev => prev.map(check =>
                check.id === 'cpu' ? {
                    ...check,
                    status: 'done',
                    value: cpuDetail ? `${cpuLabel} • ${cpuDetail}` : cpuLabel
                } : check
            ));
            setProgress(40);

            // Check Memory
            setSystemChecks(prev => prev.map(check => 
                check.id === 'memory' ? { ...check, status: 'checking' } : check
            ));
            await new Promise(resolve => setTimeout(resolve, 800));
            
            setSystemChecks(prev => prev.map(check =>
                check.id === 'memory' ? {
                    ...check,
                    status: 'done',
                    value: ramAvailable ? `${ramAvailable.toFixed(1)} GB available` : 'Memory ready'
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
            setSystemChecks(prev => prev.map(check =>
                check.id === 'ai' ? {
                    ...check,
                    status: 'done',
                    value: modelSummary
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

    const totalSteps = systemChecks.length;
    const completedSteps = systemChecks.filter(check => check.status === 'done').length;
    const activeStep = phase === 'testing' ? totalSteps : Math.min(completedSteps + 1, totalSteps);

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
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-semibold text-[var(--ink)]">
                                {phase === 'checking' ? 'Getting things ready' : 'Running a quick AI check'}
                            </h2>
                            <p className="text-[var(--muted)]">
                                {phase === 'checking' 
                                    ? 'A few quick checks to make sure IRIS feels fast and smooth.'
                                    : 'Just a moment while we run a tiny test.'}
                            </p>
                        </div>

                        {/* System Checks */}
                        <div className="bg-[var(--glass-strong)] border border-[var(--border)] rounded-xl p-6 shadow-lg space-y-4">
                            <div className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.3em] text-[var(--muted)]">
                                <span>Step {activeStep} of {totalSteps}</span>
                                <span>In progress</span>
                            </div>
                            {systemChecks.map(check => (
                                <div key={check.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg transition-all ${
                                            check.status === 'done' 
                                                ? 'bg-teal-600/10 text-teal-600' 
                                                : check.status === 'checking'
                                                ? 'bg-amber-500/10 text-amber-500'
                                                : 'bg-[var(--paper-2)] text-[var(--muted)]'
                                        }`}>
                                            {check.status === 'checking' ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : check.status === 'done' ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                check.icon
                                            )}
                                        </div>
                                        <span className={`text-base font-medium transition-colors ${
                                            check.status === 'done' ? 'text-[var(--ink)]' : 'text-[var(--muted)]'
                                        }`}>
                                            {check.label}
                                        </span>
                                    </div>
                                    {check.value && (
                                        <span className="text-sm text-[var(--muted)] text-right max-w-[55%]">
                                            {check.value}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Progress Bar */}
                        <div className="bg-[var(--paper-2)] rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-teal-600 to-emerald-600 h-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Skip button */}
                        <div className="text-center">
                            <button
                                onClick={handleSkip}
                                className="text-base text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                            >
                                Skip setup →
                            </button>
                        </div>
                    </div>
                )}

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

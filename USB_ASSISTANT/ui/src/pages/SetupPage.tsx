import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Zap, ShieldOff, Heart, ArrowLeft, Code2, Brain, Atom, Globe, Lightbulb, Cpu, CheckCircle2, Palette, Tent, Hammer, type LucideIcon } from 'lucide-react';
import { useSystemInfo, useModels } from '../hooks';
import { PerformanceBadge, CategorySelector } from '../components';
import type { BenchmarkResult, LLMCategory } from '../types';

const categoryIcons: Record<string, LucideIcon> = {
  general: Lightbulb,
  reasoning: Brain,
  coding: Code2,
  medical: Heart,
  stem: Atom,
  survival: Tent,
  building: Hammer,
  multilingual: Globe,
};

type SetupStep = 'initial' | 'category' | 'models' | 'benchmark';

export function SetupPage() {
  const navigate = useNavigate();
  const { systemInfo } = useSystemInfo();
  const { models, loading: modelsLoading } = useModels();
  const [step, setStep] = useState<SetupStep>('initial');
  const [selectedCategory, setSelectedCategory] = useState<LLMCategory | null>(null);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, BenchmarkResult>>({});
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const categoryColors: Record<string, string> = {
    general: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    reasoning: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    coding: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medical: 'bg-red-500/10 text-red-400 border-red-500/20',
    stem: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    survival: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    building: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    multilingual: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  };

  const categoryNames: Record<LLMCategory, string> = {
    general: 'General',
    reasoning: 'Reasoning',
    coding: 'Technical',
    medical: 'Medical',
    stem: 'STEM',
    survival: 'Survival',
    building: 'Building',
    multilingual: 'Multilingual',
  };

  const runBenchmark = async (modelId: string) => {
    setBenchmarking(true);
    setSelectedModel(modelId);
    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId }),
      });
      if (response.ok) {
        const result = await response.json();
        setBenchmarkResults(prev => ({ ...prev, [modelId]: result }));
      }
    } catch (err) {
      console.error('Benchmark failed:', err);
    } finally {
      setBenchmarking(false);
    }
  };

  const getAvailableCategories = (): LLMCategory[] => {
    const categories = new Set(installedModels.map(m => m.category));
    return Array.from(categories) as LLMCategory[];
  };

  const getModelsByCategory = (category: LLMCategory) => {
    return installedModels.filter(m => m.category === category);
  };

  const ramAvailable = systemInfo?.ram_available_gb || 8;
  const installedModels = models.filter(model => model.available !== false);
  const compatibleModels = installedModels.filter(model => model.min_ram_gb <= ramAvailable);

  // STEP 1: Initial Screen - Test Results + Start Button
  if (step === 'initial') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center text-[#2d2a23]">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl mb-6 shadow-2xl shadow-[0_18px_40px_rgba(31,109,90,0.2)] border border-[rgba(45,42,35,0.18)] overflow-hidden">
              <img src="/logo.jpg" alt="IRIS" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl font-bold text-[#2d2a23] mb-3 tracking-tight font-serif">IRIS</h1>
            <p className="text-[#6f6757] text-lg">Offline AI for any scenario</p>
          </div>

          {/* System Test Results */}
          <div className="glass-card p-8 glow-border mb-8">
            <h3 className="text-xl font-bold text-[#2d2a23] mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#1f6d5a]" />
              System Test Results
            </h3>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-white/80 rounded-2xl p-6 border border-[rgba(45,42,35,0.12)]">
                <p className="text-[10px] text-[#6f6757] uppercase font-black tracking-[0.2em] mb-2">Thinking Power</p>
                <p className="text-xl font-black text-[#2d2a23] uppercase tracking-tight">{systemInfo?.cpu_cores || '--'} Cores</p>
                <p className="text-[#6f6757] text-xs mt-1 font-medium italic">{systemInfo?.cpu_name || 'Detecting...'}</p>
              </div>
              <div className="bg-white/80 rounded-2xl p-6 border border-[rgba(45,42,35,0.12)]">
                <p className="text-[10px] text-[#6f6757] uppercase font-black tracking-[0.2em] mb-2">Memory Strength</p>
                <p className="text-xl font-black text-[#2d2a23] uppercase tracking-tight">{systemInfo?.ram_total_gb?.toFixed(0) || '--'} Gigabytes</p>
                <p className="text-[#1f6d5a] text-xs mt-1 font-bold uppercase tracking-widest">{ramAvailable >= 16 ? 'Strong' : ramAvailable >= 8 ? 'Good' : 'Basic'} Capacity</p>
              </div>
              <div className="bg-white/80 rounded-2xl p-6 border border-[rgba(45,42,35,0.12)]">
                <p className="text-[10px] text-[#6f6757] uppercase font-black tracking-[0.2em] mb-2">Visual Hardware</p>
                <p className="text-xl font-black text-[#2d2a23] uppercase tracking-tight truncate">{systemInfo?.gpu || 'Standard'}</p>
                <p className="text-[#6f6757] text-xs mt-1 font-medium italic">Used for acceleration</p>
              </div>
              <div className="bg-white/80 rounded-2xl p-6 border border-[rgba(45,42,35,0.12)]">
                <p className="text-[10px] text-[#6f6757] uppercase font-black tracking-[0.2em] mb-2">Intelligence Ready</p>
                <p className="text-xl font-black text-[#2d2a23] uppercase tracking-tight">{compatibleModels.length} AI Skills</p>
                <p className="text-[#1f6d5a] text-xs mt-1 font-bold uppercase tracking-widest">Available Offline</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-[#6f6757] border-t border-[rgba(45,42,35,0.12)] pt-4">
              <div className="w-2 h-2 rounded-full bg-[#1f6d5a] animate-pulse" />
              <span>All systems operational</span>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => navigate('/chat')}
            className="premium-button w-full flex items-center justify-center gap-3 py-4 text-lg"
            aria-label="Start setup process"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>START</span>
          </button>

          {/* Design Preview Link */}
          <div className="text-center mt-6">
            <Link
              to="/design-preview"
              className="text-sm text-[#6f6757] hover:text-[#1f6d5a] transition-colors inline-flex items-center gap-2"
            >
              <Palette className="w-4 h-4" />
              View Design Options
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Category Selection
  if (step === 'category') {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <button
              onClick={() => setStep('initial')}
              className="flex items-center gap-2 text-[#6f6757] hover:text-[#2d2a23] transition-colors group"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-[#2d2a23] tracking-tight font-serif">Choose Your Scenario</h1>
            </div>
            <div className="w-16" />
          </div>

          <CategorySelector
            onSelect={(category) => {
              const categoryModels = installedModels.filter(m => m.category === category);
              localStorage.setItem('selectedCategory', category);
              localStorage.setItem('categoryModels', JSON.stringify(categoryModels));
              navigate('/chat');
            }}
            availableCategories={getAvailableCategories()}
          />
        </div>
      </div>
    );
  }

  // STEP 3: Model Selection by Category
  if (step === 'models' && selectedCategory) {
    const categoryModels = getModelsByCategory(selectedCategory);
    const Icon = categoryIcons[selectedCategory] || Cpu;

    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <button
              onClick={() => {
                setStep('category');
                setSelectedCategory(null);
              }}
              className="flex items-center gap-2 text-[#6f6757] hover:text-[#2d2a23] transition-colors group"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back
            </button>
            <div className="text-center flex-1">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className={`p - 2 rounded - xl border ${categoryColors[selectedCategory]} `}>
                  <Icon className="w-6 h-6" />
                </div>
                <h1 className="text-3xl font-bold text-[#2d2a23] tracking-tight font-serif">
                  {categoryNames[selectedCategory]}
                </h1>
              </div>
              <p className="text-[#6f6757]">Select a model optimized for this use case</p>
            </div>
            <div className="w-16" />
          </div>

          {modelsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-6 animate-pulse h-48" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryModels.length > 0 ? (
                categoryModels.map(model => {
                  const benchResult = benchmarkResults[model.id];
                  const isRunning = benchmarking && selectedModel === model.id;
                  const ModelIcon = categoryIcons[model.category] || Cpu;

                  return (
                    <div
                      key={model.id}
                      className="glass-card p-6 glow-border hover:bg-[#f6f1e6] transition-all duration-200 group hover:shadow-xl hover:border-[rgba(31,109,90,0.2)] flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p - 2 rounded - xl border ${categoryColors[model.category]} `}>
                            <ModelIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-[#2d2a23] group-hover:text-[#1f6d5a] transition-colors line-clamp-2">
                              {model.display_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <PerformanceBadge
                                ramRequired={model.min_ram_gb}
                                ramAvailable={ramAvailable}
                                size="sm"
                              />
                              {model.uncensored && <ShieldOff className="w-4 h-4 text-red-500" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-[#6f6757] mb-4 flex-1">
                        {model.notes || "Standard offline intelligence module optimized for local inference."}
                      </p>

                      {benchResult && (
                        <div className="bg-white/80 rounded-xl p-4 mb-4 border border-[rgba(45,42,35,0.12)]">
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-[#6f6757] uppercase font-bold tracking-wider">Velocity</span>
                            <span className="text-[#1f6d5a] font-mono">{benchResult.tokens_per_second.toFixed(1)} tok/s</span>
                          </div>
                          <div className="w-full bg-[#e7e0cf] h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-[#1f6d5a] h-full transition-all"
                              style={{ width: `${Math.min(100, (benchResult.tokens_per_second / 20) * 100)}% ` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => runBenchmark(model.id)}
                          disabled={benchmarking || model.min_ram_gb > ramAvailable}
                          className="flex-1 premium-button !bg-[#f6f1e6] !hover:bg-white !text-[#2d2a23] !border-[rgba(45,42,35,0.18)] !shadow-none !py-2.5 text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                          aria-label={`Benchmark ${model.display_name} `}
                        >
                          {isRunning ? (
                            <>
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>TESTING...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              <span>TEST</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel(model.id);
                            localStorage.setItem('selectedModel', JSON.stringify(model));
                            localStorage.setItem('selectedCategory', selectedCategory);
                            navigate('/chat');
                          }}
                          disabled={model.min_ram_gb > ramAvailable}
                          className="flex-1 premium-button !py-2.5 text-sm flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>USE</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-[#6f6757] text-lg">No models available for this category</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  return null;
}

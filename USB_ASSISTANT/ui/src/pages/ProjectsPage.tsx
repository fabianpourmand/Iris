import { useMemo } from 'react';
import { Layout, Cpu, Database, HardDrive, CheckCircle2, ArrowRight } from 'lucide-react';
import { useSystemInfo, useModels } from '../hooks';

export function ProjectsPage() {
  const { systemInfo } = useSystemInfo();
  const { models } = useModels();

  const stats = useMemo(() => {
    const installed = models.filter(m => m.available !== false);
    const totalSize = installed.length * 4.5; // Approximation in GB since we don't have exact file sizes in ModelInfo
    const ramAvailable = systemInfo?.ram_available_gb || 0;
    const compatible = installed.filter(m => m.min_ram_gb <= ramAvailable);

    return {
      installedCount: installed.length,
      compatibleCount: compatible.length,
      estimatedSizeGB: totalSize.toFixed(1),
      ramTotal: systemInfo?.ram_total_gb || 0,
    };
  }, [models, systemInfo]);

  return (
    <div className="flex-1 flex flex-col p-8 space-y-8 bg-transparent overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 glass-card flex items-center justify-center p-4 border-[rgba(31,109,90,0.2)]">
            <Layout className="w-8 h-8 text-[#1f6d5a]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#2d2a23] tracking-tight uppercase font-serif">Build Index</h1>
            <p className="text-[#6f6757] font-bold uppercase tracking-widest text-[10px]">Active System Configuration</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-[rgba(45,42,35,0.12)] space-y-4">
          <div className="flex items-center gap-3 text-[#1f6d5a]">
            <Cpu className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Processor</span>
          </div>
          <div>
            <p className="text-2xl font-black text-[#2d2a23]">{systemInfo?.cpu_name || 'Detecting...'}</p>
            <p className="text-[#6f6757] text-xs font-bold uppercase mt-1">{systemInfo?.cpu_cores} Active Cores</p>
          </div>
        </div>

        <div className="glass-card p-6 border-[rgba(45,42,35,0.12)] space-y-4">
          <div className="flex items-center gap-3 text-[#b07b2c]">
            <Database className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Memory (RAM)</span>
          </div>
          <div>
            <p className="text-2xl font-black text-[#2d2a23]">{stats.ramTotal.toFixed(1)} GB</p>
            <p className="text-[#1f6d5a] text-xs font-bold uppercase mt-1">{systemInfo?.ram_available_gb.toFixed(1)} GB Available</p>
          </div>
        </div>

        <div className="glass-card p-6 border-[rgba(45,42,35,0.12)] space-y-4">
          <div className="flex items-center gap-3 text-[#6f6757]">
            <HardDrive className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">IRIS Storage</span>
          </div>
          <div>
            <p className="text-2xl font-black text-[#2d2a23]">{stats.estimatedSizeGB} GB Used</p>
            <p className="text-[#6f6757] text-xs font-bold uppercase mt-1">Recommended: 128GB Drive</p>
          </div>
        </div>
      </div>

      {/* Build Progress / Onboarding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[#2d2a23] tracking-tight uppercase px-2 font-serif">Build Stages</h2>
          <div className="space-y-4">
            {[
              { title: 'Hardware Awareness', desc: 'The system automatically detects your computer strength to choose the best AI models.', status: 'Complete' },
              { title: 'Model Injection', desc: `${stats.installedCount} specialized intelligence modules are loaded directly from your IRIS drive.`, status: 'Active' },
              { title: 'Offline Encryption', desc: 'All communications are processed locally. No data ever leaves this device.', status: 'Secure' },
            ].map((step, i) => (
              <div key={i} className="glass-card p-6 border-[rgba(45,42,35,0.12)] flex gap-4 transition-all hover:bg-[#f6f1e6]">
                <div className="w-10 h-10 rounded-full bg-[#1f6d5a]/10 flex items-center justify-center flex-shrink-0 border border-[#1f6d5a]/20">
                  <span className="text-[#1f6d5a] font-black">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-[#2d2a23] uppercase text-sm tracking-tight">{step.title}</h3>
                    <div className="flex items-center gap-1.5 text-[#1f6d5a]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{step.status}</span>
                    </div>
                  </div>
                  <p className="text-[#6f6757] text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card border-[rgba(45,42,35,0.12)] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[rgba(45,42,35,0.12)] bg-white/60">
            <h2 className="text-xl font-bold text-[#2d2a23] tracking-tight uppercase font-serif">Intelligence Manifest</h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-[#f6f1e6] z-10 border-b border-[rgba(45,42,35,0.12)]">
                <tr>
                  <th className="text-left py-3 px-6 text-[10px] font-black text-[#6f6757] uppercase tracking-widest">Model</th>
                  <th className="text-left py-3 px-6 text-[10px] font-black text-[#6f6757] uppercase tracking-widest">Category</th>
                  <th className="text-right py-3 px-6 text-[10px] font-black text-[#6f6757] uppercase tracking-widest">RAM Req.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(45,42,35,0.08)]">
                {models.filter(m => m.available !== false).map((model) => (
                  <tr key={model.id} className="hover:bg-[#f6f1e6] transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-[#2d2a23]">{model.display_name}</p>
                      <p className="text-[10px] text-[#6f6757] font-mono mt-0.5">{model.id}</p>
                    </td>
                    <td className="py-4 px-6 text-xs text-[#6f6757] font-bold uppercase tracking-wider">{model.category}</td>
                    <td className="py-4 px-6 text-right">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${model.min_ram_gb <= (systemInfo?.ram_available_gb || 0)
                          ? 'bg-[#1f6d5a]/10 text-[#1f6d5a] border border-[#1f6d5a]/20'
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                        }`}>
                        {model.min_ram_gb} GB
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-[rgba(45,42,35,0.12)] bg-white/60 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[#6f6757] uppercase">Available on Drive</span>
              <span className="text-[#2d2a23] font-black">{stats.installedCount} Specialized Models</span>
            </div>
            <button className="flex items-center gap-2 bg-[#1f6d5a] hover:bg-[#1a5c4c] text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[0_12px_30px_rgba(31,109,90,0.25)]">
              Update Index
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Cpu, HardDrive, Monitor, Activity } from 'lucide-react';
import type { SystemInfo } from '../types';

interface SystemInfoCardProps {
  systemInfo: SystemInfo | null;
  loading: boolean;
}

export function SystemInfoCard({ systemInfo, loading }: SystemInfoCardProps) {
  if (loading) {
    return (
      <div className="glass-card p-8 animate-pulse">
        <div className="h-6 bg-[#e7e0cf] rounded-lg w-1/2 mb-8"></div>
        <div className="space-y-6">
          <div className="h-12 bg-[#f6f1e6] rounded-xl"></div>
          <div className="h-12 bg-[#f6f1e6] rounded-xl"></div>
          <div className="h-12 bg-[#f6f1e6] rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!systemInfo) return null;

  const stats = [
    {
      label: 'Processor Architecture',
      value: `${systemInfo.cpu_name} (${systemInfo.cpu_cores} Cores)`,
      icon: Cpu,
      color: 'text-[#1f6d5a]',
      bg: 'bg-[#1f6d5a]/10'
    },
    {
      label: 'Memory Availability',
      value: `${systemInfo.ram_available_gb.toFixed(1)}GB Available / ${systemInfo.ram_total_gb.toFixed(1)}GB Total`,
      icon: HardDrive,
      color: 'text-[#b07b2c]',
      bg: 'bg-[#b07b2c]/10'
    },
    {
      label: 'Graphics Acceleration',
      value: systemInfo.gpu || 'Discrete GPU not detected',
      icon: Monitor,
      color: 'text-[#6f6757]',
      bg: 'bg-[#6f6757]/10'
    },
  ];

  return (
    <div className="glass-card p-8 glow-border">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-[#2d2a23] flex items-center gap-3">
          <Activity className="w-5 h-5 text-[#1f6d5a]" />
          Hardware Telemetry
        </h3>
        <span className="text-sm font-black text-[#6f6757] uppercase tracking-widest">Live Feed</span>
      </div>

      <div className="space-y-6">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-4 group">
            <div className={`p-3 rounded-xl border border-[rgba(45,42,35,0.12)] ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#6f6757] uppercase tracking-widest underline decoration-[rgba(45,42,35,0.12)] underline-offset-4">
                {stat.label}
              </p>
              <p className="text-base font-bold text-[#2d2a23] mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { Terminal, BookOpen, ScrollText, Settings, Activity, ChevronLeft, ChevronRight, FolderSearch } from 'lucide-react';
import { useSettings } from '../hooks';
import { useI18n } from '../i18n';

/* 
  IRIS Sidebar 
  Style: Heritage Console / Field Manual
  Fonts: EB Garamond (Serif), IBM Plex Mono (Mono)
*/

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n();

  const navItems = [
    { to: '/chat', icon: Terminal, label: t('sidebar.command', 'Command'), id: 'CMD' },
    { to: '/explorer', icon: FolderSearch, label: t('sidebar.explorer', 'Explorer'), id: 'EXP' },
    { to: '/library', icon: BookOpen, label: t('sidebar.library', 'Library'), id: 'LIB' },
    { to: '/guides', icon: ScrollText, label: t('sidebar.guides', 'Guides'), id: 'GDE' },
    { to: '/settings', icon: Settings, label: t('sidebar.config', 'Config'), id: 'CFG' },
  ];

  return (
    <aside
      className={`
        bg-[var(--glass)] backdrop-blur-md border-r border-[var(--border)] flex flex-col transition-all duration-300 ease-in-out z-50 shadow-[4px_0_24px_rgba(45,42,35,0.06)] shrink-0 overflow-hidden min-h-0
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* HEADER */}
      <div className="h-16 border-b border-[var(--border)] flex items-center px-5 bg-[var(--glass-strong)]">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 rounded-lg border border-[var(--border)] bg-[var(--glass-strong)] overflow-hidden shadow-sm shrink-0">
            <img src="/logo.jpg" alt="IRIS" className="w-full h-full object-cover" />
          </div>

          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[var(--ink)] font-bold text-xl tracking-tight" style={{ fontFamily: '"EB Garamond", serif' }}>IRIS</span>
              <span className="text-[var(--muted)] text-sm uppercase tracking-[0.25em] font-mono leading-none">
                {t('sidebar.heritage', 'Heritage')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 min-h-0 py-6 px-3 space-y-3 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) => `
              flex items-center justify-center gap-3 px-4 py-4 font-mono text-base transition-all duration-200 rounded-lg border
              ${isActive
                ? 'bg-[#1f6d5a]/10 text-[#1f6d5a] border-[#1f6d5a]/30 font-bold shadow-sm'
                : 'text-[var(--muted)] border-transparent hover:bg-black/5 hover:text-[var(--ink)]'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                {!collapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="tracking-wider uppercase">{item.label}</span>
                    <span className="opacity-40 text-sm font-normal">{item.id}</span>
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* FOOTER / STATUS */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--glass-strong)]">
        {!collapsed ? (
          <div className="bg-[var(--glass)] border border-[var(--border)] rounded-lg p-4 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm font-mono text-[var(--muted)] uppercase tracking-wider">
                <span>RAM Load</span>
                <span className="text-[#1f6d5a] font-bold">3.2 GB</span>
              </div>
              <div className="w-full bg-[var(--paper-2)] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#1f6d5a] h-full w-[45%] transition-all duration-1000" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm font-mono text-[var(--muted)] uppercase tracking-wider">
                <span>Core.Freq</span>
                <span className="text-[#b07b2c] font-bold">12%</span>
              </div>
              <div className="w-full bg-[var(--paper-2)] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#b07b2c] h-full w-[12%] transition-all duration-1000" />
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-[var(--muted)] uppercase tracking-wider">Survival</span>
                <button
                  onClick={() => updateSettings({ survival_mode: !settings.survival_mode })}
                  className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${settings.survival_mode ? 'bg-[#1f6d5a]' : 'bg-[var(--border)]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${settings.survival_mode ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-[var(--muted)] uppercase tracking-wider">Advanced</span>
                <button
                  onClick={() => updateSettings({ advanced_mode: !settings.advanced_mode })}
                  className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${settings.advanced_mode ? 'bg-[#b07b2c]' : 'bg-[var(--border)]'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${settings.advanced_mode ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Activity className="w-5 h-5 text-[#1f6d5a] animate-pulse" />
          </div>
        )}

        <button
          onClick={onToggle}
          className="w-full mt-4 flex items-center justify-center p-4 text-[var(--muted)] hover:text-[var(--ink)] hover:bg-black/5 rounded-md transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}

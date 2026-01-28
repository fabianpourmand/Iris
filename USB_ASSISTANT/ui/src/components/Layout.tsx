import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div className="flex h-screen w-full bg-[var(--paper)] text-[var(--ink)] overflow-hidden selection:bg-[#1f6d5a] selection:text-white">

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex-1 flex flex-col relative bg-transparent min-w-0 min-h-0">
        {/* Subtle Paper Texture Overlay */}
        <div
          className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(31, 109, 90, 0.12), transparent 40%), radial-gradient(circle at 80% 30%, rgba(176, 123, 44, 0.12), transparent 45%)',
            filter: 'contrast(110%) brightness(100%)'
          }}
        />

        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Shield, Calendar, CalendarOff } from 'lucide-react';

export default function GuardAppLayout() {
  const navItems = [
    { to: '/guard', icon: Shield, label: 'Inicio' },
    { to: '/guard/schedule', icon: Calendar, label: 'Horario' },
    { to: '/guard/time-off', icon: CalendarOff, label: 'Permisos' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          <span className="font-bold text-foreground text-sm">CGuard Pro</span>
        </div>
        <span className="text-xs text-muted-foreground">Vigilante</span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t flex items-center justify-around py-2 z-50">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/guard'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

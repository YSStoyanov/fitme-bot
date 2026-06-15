'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  RefreshCw,
  Target,
  Wallet,
  Calendar,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Табло', icon: LayoutDashboard },
  { href: '/tasks', label: 'Задачи', icon: CheckSquare },
  { href: '/habits', label: 'Навици', icon: RefreshCw },
  { href: '/goals', label: 'Цели', icon: Target },
  { href: '/budget', label: 'Бюджет', icon: Wallet },
  { href: '/events', label: 'Събития', icon: Calendar },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 flex-shrink-0 flex flex-col h-screen overflow-y-auto"
      style={{ backgroundColor: '#1e293b' }}
    >
      {/* Logo / App Title */}
      <div className="px-6 py-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            Органайзер
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700">
        <p className="text-slate-500 text-xs">
          &copy; {new Date().getFullYear()} Органайзер
        </p>
      </div>
    </aside>
  );
}

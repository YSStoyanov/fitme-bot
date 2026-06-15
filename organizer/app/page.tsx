'use client';

import { useEffect, useState } from 'react';
import {
  CheckSquare,
  RefreshCw,
  Calendar,
  Wallet,
  AlertCircle,
  Check,
  Clock,
} from 'lucide-react';
import type { DashboardData, Task, Habit, OrgEvent } from '@/lib/types';

const EVENT_TYPE_ICONS: Record<string, string> = {
  birthday: '🎂',
  payment: '💳',
  bill: '🧾',
  subscription: '📦',
  deadline: '⏰',
  other: '📅',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  birthday: 'Рожден ден',
  payment: 'Вноска',
  bill: 'Сметка',
  subscription: 'Абонамент',
  deadline: 'Краен срок',
  other: 'Друго',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'ниско',
  medium: 'средно',
  high: 'високо',
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCompleteTask = async (task: Task) => {
    // Optimistic update
    if (data) {
      setData({
        ...data,
        tasks_today: data.tasks_today.filter((t) => t.id !== task.id),
      });
    }
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    });
  };

  const handleToggleHabit = async (habit: Habit) => {
    // Optimistic update
    if (data) {
      setData({
        ...data,
        habits_today: data.habits_today.map((h) =>
          h.id === habit.id ? { ...h, completed_today: !h.completed_today } : h
        ),
      });
    }
    await fetch(`/api/habits/${habit.id}/complete`, { method: 'POST' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-slate-400 text-sm">Зареждане...</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('bg-BG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Табло</h1>
        <p className="text-slate-500 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          icon={<CheckSquare size={20} className="text-blue-500" />}
          label="Задачи за днес"
          value={String(data?.tasks_today.length ?? 0)}
          sublabel={
            (data?.tasks_overdue ?? 0) > 0
              ? `${data?.tasks_overdue} просрочени`
              : 'Всичко навреме'
          }
          sublabelColor={(data?.tasks_overdue ?? 0) > 0 ? 'text-red-500' : 'text-green-500'}
          bg="bg-blue-50"
        />
        <SummaryCard
          icon={<RefreshCw size={20} className="text-emerald-500" />}
          label="Навици за днес"
          value={`${data?.habits_today.filter((h) => h.completed_today).length ?? 0} / ${data?.habits_today.length ?? 0}`}
          sublabel="изпълнени"
          sublabelColor="text-slate-400"
          bg="bg-emerald-50"
        />
        <SummaryCard
          icon={<Calendar size={20} className="text-violet-500" />}
          label="Предстоящи събития"
          value={String(data?.upcoming_events.length ?? 0)}
          sublabel="следващите 7 дни"
          sublabelColor="text-slate-400"
          bg="bg-violet-50"
        />
        <SummaryCard
          icon={<Wallet size={20} className="text-amber-500" />}
          label="Баланс (месец)"
          value={`${(data?.budget_summary.balance ?? 0).toFixed(2)} лв.`}
          sublabel={`Разходи: ${(data?.budget_summary.expenses ?? 0).toFixed(2)} лв.`}
          sublabelColor={
            (data?.budget_summary.balance ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'
          }
          bg="bg-amber-50"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks today */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <CheckSquare size={18} className="text-blue-500" />
                Задачи за днес
              </h2>
              <a href="/tasks" className="text-blue-500 text-sm hover:underline">
                Всички →
              </a>
            </div>

            {(!data?.tasks_today.length && !data?.tasks_overdue) && (
              <p className="text-slate-400 text-sm text-center py-6">
                Нямате задачи за днес
              </p>
            )}

            {(data?.tasks_overdue ?? 0) > 0 && (
              <div className="mb-3 flex items-center gap-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle size={14} />
                {data?.tasks_overdue} просрочени задачи
              </div>
            )}

            <div className="space-y-2">
              {data?.tasks_today.map((task) => (
                <TaskRow key={task.id} task={task} onComplete={() => handleCompleteTask(task)} />
              ))}
            </div>
          </div>
        </div>

        {/* Right column: habits + events */}
        <div className="space-y-6">
          {/* Habits */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <RefreshCw size={18} className="text-emerald-500" />
                Навици
              </h2>
              <a href="/habits" className="text-blue-500 text-sm hover:underline">
                Всички →
              </a>
            </div>

            {!data?.habits_today.length && (
              <p className="text-slate-400 text-sm text-center py-4">Няма добавени навици</p>
            )}

            <div className="space-y-2">
              {data?.habits_today.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  onToggle={() => handleToggleHabit(habit)}
                />
              ))}
            </div>
          </div>

          {/* Upcoming events */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-violet-500" />
                Предстоящи
              </h2>
              <a href="/events" className="text-blue-500 text-sm hover:underline">
                Всички →
              </a>
            </div>

            {!data?.upcoming_events.length && (
              <p className="text-slate-400 text-sm text-center py-4">Няма предстоящи събития</p>
            )}

            <div className="space-y-2">
              {data?.upcoming_events.slice(0, 5).map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sublabel,
  sublabelColor,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  sublabelColor: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-800 mb-0.5">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xs mt-1 ${sublabelColor}`}>{sublabel}</div>
    </div>
  );
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: () => void }) {
  const priorityColors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 group">
      <button
        onClick={onComplete}
        className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-500 flex items-center justify-center flex-shrink-0 transition-colors group-hover:border-blue-400"
      >
        <Check size={10} className="text-transparent group-hover:text-white" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800 truncate">{task.title}</div>
        {task.due_date && (
          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <Clock size={10} />
            {formatDate(task.due_date)}
          </div>
        )}
      </div>
      <span
        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
          priorityColors[task.priority] || 'bg-slate-100 text-slate-600'
        }`}
      >
        {PRIORITY_LABELS[task.priority] || task.priority}
      </span>
    </div>
  );
}

function HabitRow({ habit, onToggle }: { habit: Habit; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50">
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: habit.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800 truncate">{habit.name}</div>
        {(habit.streak ?? 0) > 0 && (
          <div className="text-xs text-amber-500">🔥 {habit.streak} дни поред</div>
        )}
      </div>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          habit.completed_today
            ? 'bg-emerald-500 text-white'
            : 'border-2 border-slate-300 hover:border-emerald-400'
        }`}
      >
        {habit.completed_today && <Check size={12} />}
      </button>
    </div>
  );
}

function EventRow({ event }: { event: OrgEvent }) {
  const typeColors: Record<string, string> = {
    birthday: 'text-pink-500',
    payment: 'text-blue-500',
    bill: 'text-orange-500',
    subscription: 'text-purple-500',
    deadline: 'text-red-500',
    other: 'text-slate-500',
  };

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50">
      <span className="text-lg leading-none mt-0.5">
        {EVENT_TYPE_ICONS[event.event_type] || '📅'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800 truncate">{event.title}</div>
        <div className="text-xs text-slate-400">{formatDate(event.date)}</div>
      </div>
      <div className={`text-xs font-medium flex-shrink-0 ${typeColors[event.event_type]}`}>
        {(event.days_until ?? 0) === 0 ? 'Днес' : `след ${event.days_until} дни`}
      </div>
    </div>
  );
}

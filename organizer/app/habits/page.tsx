'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import type { Habit } from '@/lib/types';

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#22C55E', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
];

function getLast7Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const DAY_LABELS = ['Пон', 'Вт', 'Ср', 'Чет', 'Пет', 'Съб', 'Нед'];

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay(); // 0=Sun
  const map = [6, 0, 1, 2, 3, 4, 5]; // map to Mon=0
  return DAY_LABELS[map[day]];
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });
  const [submitting, setSubmitting] = useState(false);

  const last7Days = getLast7Days();

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/habits');
      if (res.ok) setHabits(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleToggleToday = async (habit: Habit) => {
    // Optimistic update
    const today = new Date().toISOString().split('T')[0];
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habit.id) return h;
        const wasCompleted = h.completed_today;
        const newCompletions = wasCompleted
          ? (h.completions || []).filter((d) => d !== today)
          : [...(h.completions || []), today];
        const newStreak = wasCompleted
          ? Math.max(0, (h.streak || 0) - 1)
          : (h.streak || 0) + 1;
        return { ...h, completed_today: !wasCompleted, completions: newCompletions, streak: newStreak };
      })
    );
    await fetch(`/api/habits/${habit.id}/complete`, { method: 'POST' });
    // Refresh to get accurate streak
    fetchHabits();
  };

  const handleDelete = async (id: number) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ name: '', description: '', color: '#3B82F6' });
        setShowForm(false);
        fetchHabits();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const doneCount = habits.filter((h) => h.completed_today).length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Навици</h1>
          <p className="text-slate-500 text-sm mt-1">
            {doneCount} от {habits.length} изпълнени днес
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          Нов навик
        </button>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 font-medium">Прогрес за днес</span>
            <span className="text-sm font-bold text-slate-800">
              {habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${habits.length > 0 ? (doneCount / habits.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Add habit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Нов навик</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Име <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="напр. Пия 2л вода..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Допълнителни бележки..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Цвят</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'scale-110 ring-2 ring-offset-2 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Запазване...' : 'Запази'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Habits list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Зареждане...</div>
      ) : habits.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🌱</div>
          <p className="text-slate-600 font-medium">Няма добавени навици</p>
          <p className="text-slate-400 text-sm mt-1">Добавете своя първи навик</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              last7Days={last7Days}
              onToggle={() => handleToggleToday(habit)}
              onDelete={() => handleDelete(habit.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HabitCard({
  habit,
  last7Days,
  onToggle,
  onDelete,
}: {
  habit: Habit;
  last7Days: string[];
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 group">
      <div className="flex items-start gap-4">
        {/* Color indicator */}
        <div
          className="w-3 h-10 rounded-full flex-shrink-0 mt-0.5"
          style={{ backgroundColor: habit.color }}
        />

        <div className="flex-1 min-w-0">
          {/* Name & streak */}
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-slate-800">{habit.name}</h3>
            {(habit.streak ?? 0) > 0 && (
              <span className="text-xs text-amber-500 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                🔥 {habit.streak} дни
              </span>
            )}
          </div>
          {habit.description && (
            <p className="text-xs text-slate-500 mb-3">{habit.description}</p>
          )}

          {/* Last 7 days */}
          <div className="flex gap-1.5">
            {last7Days.map((date) => {
              const completed = (habit.completions || []).includes(date);
              const isToday = date === new Date().toISOString().split('T')[0];
              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      completed
                        ? 'text-white shadow-sm'
                        : 'bg-slate-100 text-slate-300'
                    } ${isToday ? 'ring-2 ring-offset-1' : ''}`}
                    style={
                      completed
                        ? { backgroundColor: habit.color }
                        : isToday
                        ? { ringColor: habit.color }
                        : {}
                    }
                  >
                    {completed && <Check size={12} />}
                  </div>
                  <span
                    className={`text-[10px] ${
                      isToday ? 'font-bold text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {getDayLabel(date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onToggle}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all font-medium text-sm ${
              habit.completed_today
                ? 'text-white shadow-sm'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
            style={habit.completed_today ? { backgroundColor: habit.color } : {}}
            title={habit.completed_today ? 'Отмяна' : 'Отбележи като изпълнено'}
          >
            <Check size={18} />
          </button>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

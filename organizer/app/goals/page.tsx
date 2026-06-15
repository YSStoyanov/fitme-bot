'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, ChevronDown, ChevronRight, Target, X } from 'lucide-react';
import type { Goal, GoalTask } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Активна',
  completed: 'Завършена',
  paused: 'Пауза',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  paused: 'bg-slate-100 text-slate-600',
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    description: '',
    target_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [newSubtask, setNewSubtask] = useState<Record<number, string>>({});
  const [addingSubtask, setAddingSubtask] = useState<number | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/goals');
      if (res.ok) setGoals(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalFormData.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalFormData),
      });
      if (res.ok) {
        const newGoal = await res.json();
        setGoals((prev) => [newGoal, ...prev]);
        setGoalFormData({ title: '', description: '', target_date: '' });
        setShowGoalForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
  };

  const handleStatusChange = async (goal: Goal, status: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, status: status as Goal['status'] } : g))
    );
    await fetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  };

  const handleAddSubtask = async (goalId: number) => {
    const title = newSubtask[goalId]?.trim();
    if (!title) return;
    const res = await fetch(`/api/goals/${goalId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      setNewSubtask((prev) => ({ ...prev, [goalId]: '' }));
      setAddingSubtask(null);
      fetchGoals();
    }
  };

  const handleToggleSubtask = async (goalId: number, taskId: number) => {
    // Optimistic update
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const updatedTasks = (g.tasks || []).map((t) =>
          t.id === taskId ? { ...t, completed: t.completed ? 0 : 1 } : t
        );
        const total = updatedTasks.length;
        const done = updatedTasks.filter((t) => t.completed).length;
        return {
          ...g,
          tasks: updatedTasks,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      })
    );
    await fetch(`/api/goals/${goalId}/tasks/${taskId}`, { method: 'PUT' });
  };

  const handleDeleteSubtask = async (goalId: number, taskId: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const updatedTasks = (g.tasks || []).filter((t) => t.id !== taskId);
        const total = updatedTasks.length;
        const done = updatedTasks.filter((t) => t.completed).length;
        return {
          ...g,
          tasks: updatedTasks,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      })
    );
    await fetch(`/api/goals/${goalId}/tasks/${taskId}`, { method: 'DELETE' });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Цели</h1>
          <p className="text-slate-500 text-sm mt-1">Дългосрочни цели и прогрес</p>
        </div>
        <button
          onClick={() => setShowGoalForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          Нова цел
        </button>
      </div>

      {/* Create goal modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Нова цел</h2>
              <button onClick={() => setShowGoalForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateGoal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Заглавие <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={goalFormData.title}
                  onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
                  placeholder="Въведете заглавие..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                <textarea
                  value={goalFormData.description}
                  onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
                  placeholder="Защо е важна тази цел..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Целева дата</label>
                <input
                  type="date"
                  value={goalFormData.target_date}
                  onChange={(e) => setGoalFormData({ ...goalFormData, target_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
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

      {/* Goals list */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Зареждане...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-16">
          <Target size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Няма добавени цели</p>
          <p className="text-slate-400 text-sm mt-1">Поставете своята първа цел</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const isExpanded = expandedGoals.has(goal.id);
            const tasks = goal.tasks || [];
            const isAddingTask = addingSubtask === goal.id;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group"
              >
                {/* Goal header */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleExpand(goal.id)}
                      className="mt-1 text-slate-400 hover:text-slate-600 flex-shrink-0"
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-800">{goal.title}</h3>
                          {goal.description && (
                            <p className="text-sm text-slate-500 mt-0.5">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={goal.status}
                            onChange={(e) => handleStatusChange(goal, e.target.value)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${
                              STATUS_COLORS[goal.status] || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <option value="active">Активна</option>
                            <option value="completed">Завършена</option>
                            <option value="paused">Пауза</option>
                          </select>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">
                            {tasks.length > 0
                              ? `${tasks.filter((t) => t.completed).length} / ${tasks.length} подзадачи`
                              : 'Няма подзадачи'}
                          </span>
                          <span className="text-xs font-bold text-slate-700">{goal.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              goal.progress >= 100
                                ? 'bg-green-500'
                                : goal.status === 'paused'
                                ? 'bg-slate-400'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>

                      {goal.target_date && (
                        <div className="text-xs text-slate-400 mt-2">
                          Целева дата: {formatDate(goal.target_date)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subtasks */}
                {isExpanded && (
                  <div className="border-t border-slate-50 px-5 py-3 bg-slate-50/50">
                    {tasks.length === 0 && !isAddingTask && (
                      <p className="text-slate-400 text-sm text-center py-2">Няма подзадачи</p>
                    )}

                    <div className="space-y-1.5 mb-2">
                      {tasks.map((task: GoalTask) => (
                        <SubtaskRow
                          key={task.id}
                          task={task}
                          onToggle={() => handleToggleSubtask(goal.id, task.id)}
                          onDelete={() => handleDeleteSubtask(goal.id, task.id)}
                        />
                      ))}
                    </div>

                    {/* Add subtask */}
                    {isAddingTask ? (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={newSubtask[goal.id] || ''}
                          onChange={(e) =>
                            setNewSubtask((prev) => ({ ...prev, [goal.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSubtask(goal.id);
                            if (e.key === 'Escape') setAddingSubtask(null);
                          }}
                          placeholder="Нова подзадача..."
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddSubtask(goal.id)}
                          className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setAddingSubtask(null)}
                          className="text-slate-400 hover:text-slate-600 px-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingSubtask(goal.id)}
                        className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 mt-1 transition-colors"
                      >
                        <Plus size={14} />
                        Добави подзадача
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubtaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: GoalTask;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 group/subtask">
      <button
        onClick={onToggle}
        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all border ${
          task.completed
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-slate-300 hover:border-blue-400 bg-white'
        }`}
      >
        {task.completed && <Check size={9} />}
      </button>
      <span
        className={`text-sm flex-1 ${
          task.completed ? 'line-through text-slate-400' : 'text-slate-700'
        }`}
      >
        {task.title}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover/subtask:opacity-100 text-slate-300 hover:text-red-500 transition-all"
      >
        <X size={13} />
      </button>
    </div>
  );
}

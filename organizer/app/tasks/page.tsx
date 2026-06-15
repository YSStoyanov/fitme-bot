'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Check, Clock, Tag, AlertCircle, X } from 'lucide-react';
import type { Task } from '@/lib/types';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'ниско',
  medium: 'средно',
  high: 'високо',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

type FilterType = 'all' | 'today' | 'overdue' | 'completed';

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.completed) return false;
  return task.due_date < new Date().toISOString().split('T')[0];
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (priorityFilter) params.set('priority', priorityFilter);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) setTasks(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, priorityFilter]);

  const handleToggleComplete = async (task: Task) => {
    const newCompleted = task.completed ? 0 : 1;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: newCompleted } : t))
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    });
    // Refresh to get sorted order
    fetchTasks();
  };

  const handleDelete = async (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({ title: '', description: '', due_date: '', priority: 'medium', category: '' });
        setShowForm(false);
        fetchTasks();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Всички' },
    { key: 'today', label: 'Днес' },
    { key: 'overdue', label: 'Изтекли' },
    { key: 'completed', label: 'Завършени' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Задачи</h1>
          <p className="text-slate-500 text-sm mt-1">Управлявайте своите задачи</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          Нова задача
        </button>
      </div>

      {/* Add task modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Нова задача</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Заглавие <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Въведете заглавие..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Допълнително описание..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Краен срок</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Приоритет</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="low">Ниско</option>
                    <option value="medium">Средно</option>
                    <option value="high">Високо</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Категория</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="напр. работа, личен..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Filter tabs */}
        <div className="flex bg-white border border-slate-200 rounded-lg p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Всички приоритети</option>
          <option value="high">Висок</option>
          <option value="medium">Среден</option>
          <option value="low">Нисък</option>
        </select>
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Зареждане...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-slate-400 text-sm">Няма задачи в тази категория</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggleComplete(task)}
                onDelete={() => handleDelete(task.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(task);

  return (
    <div
      className={`flex items-start gap-3 px-5 py-4 hover:bg-slate-50 group transition-colors ${
        task.completed ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border-2 ${
          task.completed
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-slate-300 hover:border-blue-400'
        }`}
      >
        {task.completed && <Check size={11} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={`text-sm font-medium text-slate-800 ${
            task.completed ? 'line-through text-slate-400' : ''
          }`}
        >
          {task.title}
        </div>
        {task.description && (
          <div className="text-xs text-slate-500 mt-0.5 truncate">{task.description}</div>
        )}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {task.due_date && (
            <div
              className={`flex items-center gap-1 text-xs ${
                overdue ? 'text-red-500' : 'text-slate-400'
              }`}
            >
              {overdue ? <AlertCircle size={11} /> : <Clock size={11} />}
              {formatDate(task.due_date)}
              {overdue && ' (просрочена)'}
            </div>
          )}
          {task.category && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Tag size={11} />
              {task.category}
            </div>
          )}
        </div>
      </div>

      {/* Priority badge */}
      <span
        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium ${
          PRIORITY_COLORS[task.priority] || 'bg-slate-100 text-slate-600'
        }`}
      >
        {PRIORITY_LABELS[task.priority] || task.priority}
      </span>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all ml-1 flex-shrink-0 mt-0.5"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

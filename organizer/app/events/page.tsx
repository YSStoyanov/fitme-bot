'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Bell } from 'lucide-react';
import type { OrgEvent } from '@/lib/types';

const EVENT_TYPES = [
  { value: 'birthday', label: 'Рожден ден', icon: '🎂' },
  { value: 'payment', label: 'Вноска', icon: '💳' },
  { value: 'bill', label: 'Сметка', icon: '🧾' },
  { value: 'subscription', label: 'Абонамент', icon: '📦' },
  { value: 'deadline', label: 'Краен срок', icon: '⏰' },
  { value: 'other', label: 'Друго', icon: '📅' },
];

const EVENT_TYPE_MAP = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t]));

const RECURRING_LABELS: Record<string, string> = {
  none: 'Без повторение',
  monthly: 'Месечно',
  yearly: 'Годишно',
};

const EVENT_BG_COLORS: Record<string, string> = {
  birthday: 'bg-pink-50 border-pink-100',
  payment: 'bg-blue-50 border-blue-100',
  bill: 'bg-orange-50 border-orange-100',
  subscription: 'bg-purple-50 border-purple-100',
  deadline: 'bg-red-50 border-red-100',
  other: 'bg-slate-50 border-slate-100',
};

const EVENT_TEXT_COLORS: Record<string, string> = {
  birthday: 'text-pink-700',
  payment: 'text-blue-700',
  bill: 'text-orange-700',
  subscription: 'text-purple-700',
  deadline: 'text-red-700',
  other: 'text-slate-700',
};

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

interface EventsData {
  upcoming: OrgEvent[];
  past: OrgEvent[];
}

export default function EventsPage() {
  const [eventsData, setEventsData] = useState<EventsData>({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'other',
    date: '',
    amount: '',
    recurring: 'none',
    reminder_days: '7',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      if (res.ok) setEventsData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({
          title: '',
          description: '',
          event_type: 'other',
          date: '',
          amount: '',
          recurring: 'none',
          reminder_days: '7',
        });
        setShowForm(false);
        fetchEvents();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setEventsData((prev) => ({
      upcoming: prev.upcoming.filter((e) => e.id !== id),
      past: prev.past.filter((e) => e.id !== id),
    }));
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
  };

  const isFinancial = (type: string) => ['payment', 'bill', 'subscription'].includes(type);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Събития</h1>
          <p className="text-slate-500 text-sm mt-1">
            Рождени дни, сметки, вноски, абонаменти и крайни срокове
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          Ново събитие
        </button>
      </div>

      {/* Add event modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-800">Ново събитие</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Event type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Тип събитие</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData({ ...formData, event_type: value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${
                        formData.event_type === value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Заглавие <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="напр. Рожден ден на Иван..."
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Дата <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                {isFinancial(formData.event_type) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Сума (лв.)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Повторение</label>
                  <select
                    value={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="none">Без повторение</option>
                    <option value="monthly">Месечно</option>
                    <option value="yearly">Годишно</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Напомняне (дни)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={formData.reminder_days}
                    onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
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

      {/* Upcoming events */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
          Предстоящи ({eventsData.upcoming.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Зареждане...</div>
        ) : eventsData.upcoming.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-slate-400 text-sm">Няма предстоящи събития</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventsData.upcoming.map((event) => (
              <EventCard key={event.id} event={event} onDelete={() => handleDelete(event.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Past events */}
      {eventsData.past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 hover:text-slate-700 transition-colors"
          >
            Минали ({eventsData.past.length})
            <span className="text-slate-400">{showPast ? '▲' : '▼'}</span>
          </button>
          {showPast && (
            <div className="space-y-3 opacity-70">
              {eventsData.past.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onDelete={() => handleDelete(event.id)}
                  isPast
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onDelete,
  isPast = false,
}: {
  event: OrgEvent;
  onDelete: () => void;
  isPast?: boolean;
}) {
  const typeInfo = EVENT_TYPE_MAP[event.event_type] || { icon: '📅', label: 'Друго' };
  const bgColor = EVENT_BG_COLORS[event.event_type] || 'bg-slate-50 border-slate-100';
  const textColor = EVENT_TEXT_COLORS[event.event_type] || 'text-slate-700';
  const isToday = event.days_until === 0;
  const isSoon = (event.days_until ?? 999) <= 7 && (event.days_until ?? 999) >= 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 group transition-opacity ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border ${bgColor}`}
        >
          {typeInfo.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">{event.title}</h3>
              {event.description && (
                <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
              )}
            </div>

            {/* Days until */}
            {!isPast && (
              <div
                className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  isToday
                    ? 'bg-blue-500 text-white'
                    : isSoon
                    ? 'bg-red-100 text-red-600'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isToday ? 'Днес!' : `след ${event.days_until} дни`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {/* Date */}
            <span className="text-xs text-slate-500">{formatDate(event.date)}</span>

            {/* Type badge */}
            <span className={`text-xs font-medium ${textColor}`}>{typeInfo.label}</span>

            {/* Amount */}
            {event.amount != null && (
              <span className="text-xs font-semibold text-slate-700">
                {event.amount.toFixed(2)} лв.
              </span>
            )}

            {/* Recurring */}
            {event.recurring !== 'none' && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                🔄 {RECURRING_LABELS[event.recurring]}
              </span>
            )}

            {/* Reminder */}
            {event.reminder_days > 0 && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Bell size={10} />
                {event.reminder_days} дни преди
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all flex-shrink-0"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

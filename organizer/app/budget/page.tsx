'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, X } from 'lucide-react';
import type { Transaction } from '@/lib/types';

const EXPENSE_CATEGORIES = [
  'Храна',
  'Транспорт',
  'Наем',
  'Сметки',
  'Здраве',
  'Развлечение',
  'Дрехи',
  'Друго',
];

const INCOME_CATEGORIES = ['Заплата', 'Бонус', 'Фриланс', 'Друго'];

const CATEGORY_COLORS = [
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#64748B',
];

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  const months = [
    'Януари',
    'Февруари',
    'Март',
    'Април',
    'Май',
    'Юни',
    'Юли',
    'Август',
    'Септември',
    'Октомври',
    'Ноември',
    'Декември',
  ];
  return `${months[parseInt(m) - 1]} ${y}`;
}

function changeMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

interface BudgetData {
  transactions: Transaction[];
  summary: { income: number; expenses: number; balance: number };
  expense_categories: { category: string; total: number }[];
}

export default function BudgetPage() {
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Храна',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/budget?month=${month}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.amount) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFormData({
          title: '',
          amount: '',
          type: 'expense',
          category: 'Храна',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setShowForm(false);
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (data) {
      setData({
        ...data,
        transactions: data.transactions.filter((t) => t.id !== id),
      });
    }
    await fetch(`/api/budget/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // Group transactions by date
  const grouped: Record<string, Transaction[]> = {};
  (data?.transactions || []).forEach((t) => {
    if (!grouped[t.date]) grouped[t.date] = [];
    grouped[t.date].push(t);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const totalExpenses = data?.summary.expenses || 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Бюджет</h1>
          <p className="text-slate-500 text-sm mt-1">Приходи и разходи</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          Добави
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setMonth(changeMonth(month, -1))}
          className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-slate-800 min-w-[160px] text-center">
          {formatMonth(month)}
        </span>
        <button
          onClick={() => setMonth(changeMonth(month, 1))}
          className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
        <button
          onClick={() => setMonth(new Date().toISOString().substring(0, 7))}
          className="ml-2 text-sm text-blue-500 hover:underline"
        >
          Текущ месец
        </button>
      </div>

      {/* Add transaction modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Нова транзакция</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type toggle */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Тип</label>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income', category: 'Заплата' })}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.type === 'income'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Приход
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense', category: 'Храна' })}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.type === 'expense'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Разход
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Описание <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="напр. Хранителни стоки..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Сума (лв.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Дата</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Категория</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {(formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Бележки</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Незадължително..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-emerald-500" />
            <span className="text-xs text-slate-500 font-medium">Приходи</span>
          </div>
          <div className="text-xl font-bold text-emerald-600">
            +{(data?.summary.income || 0).toFixed(2)} лв.
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-red-500" />
            <span className="text-xs text-slate-500 font-medium">Разходи</span>
          </div>
          <div className="text-xl font-bold text-red-600">
            -{(data?.summary.expenses || 0).toFixed(2)} лв.
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 font-medium">Баланс</span>
          </div>
          <div
            className={`text-xl font-bold ${
              (data?.summary.balance || 0) >= 0 ? 'text-slate-800' : 'text-red-600'
            }`}
          >
            {(data?.summary.balance || 0) >= 0 ? '+' : ''}
            {(data?.summary.balance || 0).toFixed(2)} лв.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-50">
              <h2 className="font-semibold text-slate-800 text-sm">Транзакции</h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Зареждане...</div>
            ) : sortedDates.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💳</div>
                <p className="text-slate-400 text-sm">Няма транзакции за този месец</p>
              </div>
            ) : (
              <div>
                {sortedDates.map((date) => (
                  <div key={date}>
                    <div className="px-5 py-2 bg-slate-50 border-y border-slate-50">
                      <span className="text-xs font-medium text-slate-500">{formatDate(date)}</span>
                    </div>
                    {grouped[date].map((t) => (
                      <TransactionRow key={t.id} transaction={t} onDelete={() => handleDelete(t.id)} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-800 text-sm mb-4">Разбивка по категории</h2>
            {!data?.expense_categories.length ? (
              <p className="text-slate-400 text-sm text-center py-4">Няма разходи</p>
            ) : (
              <div className="space-y-3">
                {data.expense_categories.map((cat, i) => {
                  const pct = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
                  const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-slate-600">{cat.category || 'Без категория'}</span>
                        </div>
                        <span className="text-xs font-medium text-slate-700">
                          {cat.total.toFixed(2)} лв.
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <div className="text-right mt-0.5">
                        <span className="text-[10px] text-slate-400">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({
  transaction,
  onDelete,
}: {
  transaction: Transaction;
  onDelete: () => void;
}) {
  const isIncome = transaction.type === 'income';

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 group border-b border-slate-50 last:border-0 transition-colors">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isIncome ? 'bg-emerald-50' : 'bg-red-50'
        }`}
      >
        {isIncome ? (
          <TrendingUp size={14} className="text-emerald-500" />
        ) : (
          <TrendingDown size={14} className="text-red-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-800 truncate">{transaction.title}</div>
        <div className="text-xs text-slate-400">
          {transaction.category || 'Без категория'}
          {transaction.notes && ` · ${transaction.notes}`}
        </div>
      </div>
      <div
        className={`text-sm font-semibold flex-shrink-0 ${
          isIncome ? 'text-emerald-600' : 'text-red-600'
        }`}
      >
        {isIncome ? '+' : '-'}
        {transaction.amount.toFixed(2)} лв.
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all ml-1"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

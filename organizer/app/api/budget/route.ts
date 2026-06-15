import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().substring(0, 7);

    const transactions = db
      .prepare(
        `SELECT * FROM transactions WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC, created_at DESC`
      )
      .all(month);

    const income_row = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND strftime('%Y-%m', date) = ?`
      )
      .get(month) as { total: number };

    const expense_row = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND strftime('%Y-%m', date) = ?`
      )
      .get(month) as { total: number };

    // Category breakdown for expenses
    const expense_categories = db
      .prepare(
        `SELECT category, SUM(amount) as total FROM transactions WHERE type = 'expense' AND strftime('%Y-%m', date) = ? GROUP BY category ORDER BY total DESC`
      )
      .all(month) as { category: string; total: number }[];

    const income = income_row.total;
    const expenses = expense_row.total;

    return NextResponse.json({
      transactions,
      summary: {
        income,
        expenses,
        balance: income - expenses,
      },
      expense_categories,
    });
  } catch (error) {
    console.error('Budget GET error:', error);
    return NextResponse.json({ error: 'Грешка при зареждане на бюджета' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { title, amount, type, category = '', date, notes = '' } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Заглавието е задължително' }, { status: 400 });
    }
    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Сумата е задължителна' }, { status: 400 });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return NextResponse.json({ error: 'Типът е задължителен' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Датата е задължителна' }, { status: 400 });
    }

    const result = db
      .prepare(
        `INSERT INTO transactions (title, amount, type, category, date, notes) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(title.trim(), parseFloat(amount), type, category, date, notes);

    const transaction = db
      .prepare(`SELECT * FROM transactions WHERE id = ?`)
      .get(result.lastInsertRowid);

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Budget POST error:', error);
    return NextResponse.json({ error: 'Грешка при добавяне на транзакция' }, { status: 500 });
  }
}

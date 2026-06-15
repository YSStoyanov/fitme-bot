import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Невалидно ID' }, { status: 400 });
    }

    const habit = db.prepare(`SELECT id FROM habits WHERE id = ?`).get(id);
    if (!habit) {
      return NextResponse.json({ error: 'Навикът не е намерен' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already completed today
    const existing = db
      .prepare(`SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?`)
      .get(id, today);

    if (existing) {
      // Toggle off - remove completion
      db.prepare(`DELETE FROM habit_completions WHERE habit_id = ? AND completed_date = ?`).run(id, today);
      return NextResponse.json({ completed: false, date: today });
    } else {
      // Mark as done
      db.prepare(`INSERT INTO habit_completions (habit_id, completed_date) VALUES (?, ?)`).run(id, today);
      return NextResponse.json({ completed: true, date: today });
    }
  } catch (error) {
    console.error('Habit complete POST error:', error);
    return NextResponse.json({ error: 'Грешка при отбелязване' }, { status: 500 });
  }
}

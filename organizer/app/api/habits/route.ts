import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const habits = db.prepare(`SELECT * FROM habits ORDER BY created_at ASC`).all() as {
      id: number;
      name: string;
      description: string;
      color: string;
      created_at: string;
    }[];

    const result = habits.map((habit) => {
      // Check if completed today
      const completedToday = db
        .prepare(`SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?`)
        .get(habit.id, today);

      // Calculate streak (consecutive days ending today)
      let streak = 0;
      const checkDate = new Date(today);
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const done = db
          .prepare(`SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?`)
          .get(habit.id, dateStr);
        if (done) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Last 7 days completions
      const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      const completions = db
        .prepare(
          `SELECT completed_date FROM habit_completions WHERE habit_id = ? AND completed_date >= ? ORDER BY completed_date ASC`
        )
        .all(habit.id, sevenDaysAgo) as { completed_date: string }[];

      return {
        ...habit,
        completed_today: !!completedToday,
        streak,
        completions: completions.map((c) => c.completed_date),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Habits GET error:', error);
    return NextResponse.json({ error: 'Грешка при зареждане на навиците' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { name, description = '', color = '#3B82F6' } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Името е задължително' }, { status: 400 });
    }

    const result = db
      .prepare(`INSERT INTO habits (name, description, color) VALUES (?, ?, ?)`)
      .run(name.trim(), description, color);

    const habit = db.prepare(`SELECT * FROM habits WHERE id = ?`).get(result.lastInsertRowid);
    return NextResponse.json({ ...habit, completed_today: false, streak: 0, completions: [] }, { status: 201 });
  } catch (error) {
    console.error('Habits POST error:', error);
    return NextResponse.json({ error: 'Грешка при създаване на навик' }, { status: 500 });
  }
}

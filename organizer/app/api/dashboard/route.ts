import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Tasks due today (not completed)
    const tasks_today = db
      .prepare(
        `SELECT * FROM tasks WHERE due_date = ? AND completed = 0 ORDER BY priority DESC`
      )
      .all(today);

    // Overdue tasks count
    const overdue_row = db
      .prepare(
        `SELECT COUNT(*) as count FROM tasks WHERE due_date < ? AND completed = 0`
      )
      .get(today) as { count: number };
    const tasks_overdue = overdue_row.count;

    // All habits with today's completion status and streak
    const habits = db.prepare(`SELECT * FROM habits ORDER BY created_at ASC`).all() as any[];

    const habits_today = habits.map((habit: any) => {
      const completedToday = db
        .prepare(
          `SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?`
        )
        .get(habit.id, today);

      // Calculate streak
      let streak = 0;
      let checkDate = new Date(today);
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const done = db
          .prepare(
            `SELECT id FROM habit_completions WHERE habit_id = ? AND completed_date = ?`
          )
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

    // Upcoming events in next 7 days
    const upcoming_events = db
      .prepare(
        `SELECT * FROM events WHERE date BETWEEN ? AND ? ORDER BY date ASC LIMIT 10`
      )
      .all(today, sevenDaysLater) as any[];

    const upcoming_events_with_days = upcoming_events.map((event: any) => {
      const eventDate = new Date(event.date);
      const diffMs = eventDate.getTime() - now.getTime();
      const days_until = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...event, days_until };
    });

    // Budget summary for current month
    const currentMonth = today.substring(0, 7); // YYYY-MM
    const income_row = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND strftime('%Y-%m', date) = ?`
      )
      .get(currentMonth) as { total: number };
    const expense_row = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND strftime('%Y-%m', date) = ?`
      )
      .get(currentMonth) as { total: number };

    const income = income_row.total;
    const expenses = expense_row.total;

    return NextResponse.json({
      tasks_today,
      tasks_overdue,
      habits_today,
      upcoming_events: upcoming_events_with_days,
      budget_summary: {
        income,
        expenses,
        balance: income - expenses,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на данните' },
      { status: 500 }
    );
  }
}

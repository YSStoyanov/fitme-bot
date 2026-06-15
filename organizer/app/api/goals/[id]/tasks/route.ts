import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const goalId = parseInt(params.id);
    if (isNaN(goalId)) {
      return NextResponse.json({ error: 'Невалидно ID' }, { status: 400 });
    }

    const goal = db.prepare(`SELECT id FROM goals WHERE id = ?`).get(goalId);
    if (!goal) {
      return NextResponse.json({ error: 'Целта не е намерена' }, { status: 404 });
    }

    const body = await request.json();
    const { title } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Заглавието е задължително' }, { status: 400 });
    }

    const result = db
      .prepare(`INSERT INTO goal_tasks (goal_id, title) VALUES (?, ?)`)
      .run(goalId, title.trim());

    const task = db.prepare(`SELECT * FROM goal_tasks WHERE id = ?`).get(result.lastInsertRowid);

    // Recalculate goal progress
    const allTasks = db
      .prepare(`SELECT completed FROM goal_tasks WHERE goal_id = ?`)
      .all(goalId) as { completed: number }[];
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.completed).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    db.prepare(`UPDATE goals SET progress = ? WHERE id = ?`).run(progress, goalId);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Goal task POST error:', error);
    return NextResponse.json({ error: 'Грешка при добавяне на подзадача' }, { status: 500 });
  }
}

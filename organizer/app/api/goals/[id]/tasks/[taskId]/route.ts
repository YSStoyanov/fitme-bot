import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const db = getDb();
    const goalId = parseInt(params.id);
    const taskId = parseInt(params.taskId);

    if (isNaN(goalId) || isNaN(taskId)) {
      return NextResponse.json({ error: 'Невалидно ID' }, { status: 400 });
    }

    const goalTask = db
      .prepare(`SELECT * FROM goal_tasks WHERE id = ? AND goal_id = ?`)
      .get(taskId, goalId) as { id: number; goal_id: number; title: string; completed: number } | undefined;

    if (!goalTask) {
      return NextResponse.json({ error: 'Подзадачата не е намерена' }, { status: 404 });
    }

    const body = await request.json();
    const newCompleted = body.completed !== undefined ? (body.completed ? 1 : 0) : (goalTask.completed === 1 ? 0 : 1);

    db.prepare(`UPDATE goal_tasks SET completed = ? WHERE id = ?`).run(newCompleted, taskId);

    // Recalculate goal progress
    const allTasks = db
      .prepare(`SELECT completed FROM goal_tasks WHERE goal_id = ?`)
      .all(goalId) as { completed: number }[];
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.completed).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    db.prepare(`UPDATE goals SET progress = ? WHERE id = ?`).run(progress, goalId);

    const updatedTask = db.prepare(`SELECT * FROM goal_tasks WHERE id = ?`).get(taskId);
    const updatedGoal = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(goalId) as Record<string, unknown>;
    const allGoalTasks = db.prepare(`SELECT * FROM goal_tasks WHERE goal_id = ? ORDER BY id ASC`).all(goalId);

    return NextResponse.json({ task: updatedTask, goal: { ...updatedGoal, tasks: allGoalTasks } });
  } catch (error) {
    console.error('Goal task PUT error:', error);
    return NextResponse.json({ error: 'Грешка при обновяване на подзадача' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const db = getDb();
    const goalId = parseInt(params.id);
    const taskId = parseInt(params.taskId);

    if (isNaN(goalId) || isNaN(taskId)) {
      return NextResponse.json({ error: 'Невалидно ID' }, { status: 400 });
    }

    const goalTask = db.prepare(`SELECT id FROM goal_tasks WHERE id = ? AND goal_id = ?`).get(taskId, goalId);
    if (!goalTask) {
      return NextResponse.json({ error: 'Подзадачата не е намерена' }, { status: 404 });
    }

    db.prepare(`DELETE FROM goal_tasks WHERE id = ?`).run(taskId);

    // Recalculate goal progress
    const allTasks = db
      .prepare(`SELECT completed FROM goal_tasks WHERE goal_id = ?`)
      .all(goalId) as { completed: number }[];
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.completed).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    db.prepare(`UPDATE goals SET progress = ? WHERE id = ?`).run(progress, goalId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Goal task DELETE error:', error);
    return NextResponse.json({ error: 'Грешка при изтриване на подзадача' }, { status: 500 });
  }
}

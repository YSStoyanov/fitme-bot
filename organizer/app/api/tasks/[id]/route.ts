import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Невалидно ID' }, { status: 400 });
    }

    const body = await request.json();
    const existing = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Задачата не е намерена' }, { status: 404 });
    }

    const {
      title,
      description,
      due_date,
      priority,
      category,
      completed,
    } = body as Record<string, unknown>;

    db.prepare(
      `UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        due_date = CASE WHEN ? IS NOT NULL THEN ? ELSE due_date END,
        priority = COALESCE(?, priority),
        category = COALESCE(?, category),
        completed = COALESCE(?, completed)
       WHERE id = ?`
    ).run(
      title ?? null,
      description ?? null,
      due_date !== undefined ? due_date : null,
      due_date !== undefined ? due_date : null,
      priority ?? null,
      category ?? null,
      completed !== undefined ? (completed ? 1 : 0) : null,
      id
    );

    const updated = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Task PUT error:', error);
    return NextResponse.json({ error: 'Грешка при обновяване' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Невалидно ID' }, { status: 400 });
    }

    const existing = db.prepare(`SELECT id FROM tasks WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Задачата не е намерена' }, { status: 404 });
    }

    db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task DELETE error:', error);
    return NextResponse.json({ error: 'Грешка при изтриване' }, { status: 500 });
  }
}

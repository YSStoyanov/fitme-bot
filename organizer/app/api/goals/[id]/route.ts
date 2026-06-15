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

    const existing = db.prepare(`SELECT id FROM goals WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Целта не е намерена' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, target_date, progress, status } = body as Record<string, unknown>;

    db.prepare(
      `UPDATE goals SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        target_date = CASE WHEN ? IS NOT NULL THEN ? ELSE target_date END,
        progress = COALESCE(?, progress),
        status = COALESCE(?, status)
       WHERE id = ?`
    ).run(
      title ?? null,
      description ?? null,
      target_date !== undefined ? target_date : null,
      target_date !== undefined ? target_date : null,
      progress !== undefined ? progress : null,
      status ?? null,
      id
    );

    const updated = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(id) as Record<string, unknown>;
    const tasks = db.prepare(`SELECT * FROM goal_tasks WHERE goal_id = ? ORDER BY id ASC`).all(id);
    return NextResponse.json({ ...updated, tasks });
  } catch (error) {
    console.error('Goal PUT error:', error);
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

    const existing = db.prepare(`SELECT id FROM goals WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Целта не е намерена' }, { status: 404 });
    }

    db.prepare(`DELETE FROM goals WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Goal DELETE error:', error);
    return NextResponse.json({ error: 'Грешка при изтриване' }, { status: 500 });
  }
}

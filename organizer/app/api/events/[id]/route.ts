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

    const existing = db.prepare(`SELECT id FROM events WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Събитието не е намерено' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, event_type, date, amount, recurring, reminder_days } =
      body as Record<string, unknown>;

    db.prepare(
      `UPDATE events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        event_type = COALESCE(?, event_type),
        date = COALESCE(?, date),
        amount = CASE WHEN ? IS NOT NULL THEN ? ELSE amount END,
        recurring = COALESCE(?, recurring),
        reminder_days = COALESCE(?, reminder_days)
       WHERE id = ?`
    ).run(
      title ?? null,
      description ?? null,
      event_type ?? null,
      date ?? null,
      amount !== undefined ? amount : null,
      amount !== undefined ? amount : null,
      recurring ?? null,
      reminder_days !== undefined ? reminder_days : null,
      id
    );

    const updated = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Event PUT error:', error);
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

    const existing = db.prepare(`SELECT id FROM events WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Събитието не е намерено' }, { status: 404 });
    }

    db.prepare(`DELETE FROM events WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Event DELETE error:', error);
    return NextResponse.json({ error: 'Грешка при изтриване' }, { status: 500 });
  }
}

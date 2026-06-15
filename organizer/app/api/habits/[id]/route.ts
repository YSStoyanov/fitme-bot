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

    const existing = db.prepare(`SELECT id FROM habits WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Навикът не е намерен' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, color } = body as Record<string, string>;

    db.prepare(
      `UPDATE habits SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        color = COALESCE(?, color)
       WHERE id = ?`
    ).run(name ?? null, description ?? null, color ?? null, id);

    const updated = db.prepare(`SELECT * FROM habits WHERE id = ?`).get(id);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Habit PUT error:', error);
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

    const existing = db.prepare(`SELECT id FROM habits WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Навикът не е намерен' }, { status: 404 });
    }

    db.prepare(`DELETE FROM habits WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Habit DELETE error:', error);
    return NextResponse.json({ error: 'Грешка при изтриване' }, { status: 500 });
  }
}

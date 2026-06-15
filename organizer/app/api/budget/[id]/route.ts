import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

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

    const existing = db.prepare(`SELECT id FROM transactions WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Транзакцията не е намерена' }, { status: 404 });
    }

    db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Budget DELETE error:', error);
    return NextResponse.json({ error: 'Грешка при изтриване' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const events = db
      .prepare(`SELECT * FROM events ORDER BY date ASC`)
      .all() as {
        id: number;
        title: string;
        description: string;
        event_type: string;
        date: string;
        amount: number | null;
        recurring: string;
        reminder_days: number;
        created_at: string;
      }[];

    const result = events.map((event) => {
      const eventDate = new Date(event.date);
      const diffMs = eventDate.getTime() - now.getTime();
      const days_until = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { ...event, days_until };
    });

    // Separate upcoming and past
    const upcoming = result.filter((e) => e.date >= today);
    const past = result.filter((e) => e.date < today);

    return NextResponse.json({ upcoming, past });
  } catch (error) {
    console.error('Events GET error:', error);
    return NextResponse.json({ error: 'Грешка при зареждане на събитията' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const {
      title,
      description = '',
      event_type,
      date,
      amount = null,
      recurring = 'none',
      reminder_days = 7,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Заглавието е задължително' }, { status: 400 });
    }
    if (!event_type) {
      return NextResponse.json({ error: 'Типът е задължителен' }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: 'Датата е задължителна' }, { status: 400 });
    }

    const result = db
      .prepare(
        `INSERT INTO events (title, description, event_type, date, amount, recurring, reminder_days) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        title.trim(),
        description,
        event_type,
        date,
        amount !== null && amount !== '' ? parseFloat(amount) : null,
        recurring,
        parseInt(reminder_days) || 7
      );

    const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(result.lastInsertRowid);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Events POST error:', error);
    return NextResponse.json({ error: 'Грешка при създаване на събитие' }, { status: 500 });
  }
}

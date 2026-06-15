import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const goals = db.prepare(`SELECT * FROM goals ORDER BY created_at DESC`).all() as {
      id: number;
      title: string;
      description: string;
      target_date: string | null;
      progress: number;
      status: string;
      created_at: string;
    }[];

    const result = goals.map((goal) => {
      const tasks = db
        .prepare(`SELECT * FROM goal_tasks WHERE goal_id = ? ORDER BY id ASC`)
        .all(goal.id);
      return { ...goal, tasks };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Goals GET error:', error);
    return NextResponse.json({ error: 'Грешка при зареждане на целите' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { title, description = '', target_date = null } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Заглавието е задължително' }, { status: 400 });
    }

    const result = db
      .prepare(`INSERT INTO goals (title, description, target_date) VALUES (?, ?, ?)`)
      .run(title.trim(), description, target_date || null);

    const goal = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(result.lastInsertRowid);
    return NextResponse.json({ ...goal, tasks: [] }, { status: 201 });
  } catch (error) {
    console.error('Goals POST error:', error);
    return NextResponse.json({ error: 'Грешка при създаване на цел' }, { status: 500 });
  }
}

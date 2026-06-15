import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const priority = searchParams.get('priority') || '';

    const today = new Date().toISOString().split('T')[0];

    let query = `SELECT * FROM tasks WHERE 1=1`;
    const params: (string | number)[] = [];

    if (filter === 'today') {
      query += ` AND due_date = ? AND completed = 0`;
      params.push(today);
    } else if (filter === 'overdue') {
      query += ` AND due_date < ? AND completed = 0`;
      params.push(today);
    } else if (filter === 'completed') {
      query += ` AND completed = 1`;
    }

    if (priority) {
      query += ` AND priority = ?`;
      params.push(priority);
    }

    query += ` ORDER BY completed ASC, CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END, due_date ASC NULLS LAST, created_at DESC`;

    const tasks = db.prepare(query).all(...params);

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на задачите' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const { title, description = '', due_date = null, priority = 'medium', category = '' } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Заглавието е задължително' }, { status: 400 });
    }

    const result = db
      .prepare(
        `INSERT INTO tasks (title, description, due_date, priority, category) VALUES (?, ?, ?, ?, ?)`
      )
      .run(title.trim(), description, due_date || null, priority, category);

    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(result.lastInsertRowid);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json(
      { error: 'Грешка при създаване на задача' },
      { status: 500 }
    );
  }
}

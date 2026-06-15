export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  completed: number;
  category: string;
  created_at: string;
}

export interface Habit {
  id: number;
  name: string;
  description: string;
  color: string;
  created_at: string;
  completed_today?: boolean;
  streak?: number;
  completions?: string[];
}

export interface HabitCompletion {
  id: number;
  habit_id: number;
  completed_date: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  target_date: string | null;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  tasks?: GoalTask[];
}

export interface GoalTask {
  id: number;
  goal_id: number;
  title: string;
  completed: number;
}

export interface Transaction {
  id: number;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  notes: string;
  created_at: string;
}

export interface OrgEvent {
  id: number;
  title: string;
  description: string;
  event_type: 'birthday' | 'payment' | 'bill' | 'subscription' | 'deadline' | 'other';
  date: string;
  amount: number | null;
  recurring: 'none' | 'monthly' | 'yearly';
  reminder_days: number;
  created_at: string;
  days_until?: number;
}

export interface DashboardData {
  tasks_today: Task[];
  tasks_overdue: number;
  habits_today: Habit[];
  upcoming_events: OrgEvent[];
  budget_summary: {
    income: number;
    expenses: number;
    balance: number;
  };
}

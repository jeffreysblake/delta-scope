/**
 * Database methods for scheduler features
 * Handles scheduled tasks, triggered actions, queued recommendations, and task executions
 */

import type Database from 'better-sqlite3';

export interface ScheduledTask {
  id: string;
  name: string;
  action: string;
  schedule: string;
  custom_cron?: string;
  enabled: boolean;
  last_run: number | null;
  next_run: number;
  params: Record<string, unknown>;
  priority: number;
  created_at: number;
}

export interface TriggeredAction {
  id: string;
  name: string;
  trigger: string;
  action: string;
  condition?: string;
  enabled: boolean;
  params: Record<string, unknown>;
  priority: number;
  created_at: number;
}

export interface QueuedRecommendation<T = unknown> {
  id: string;
  recommendation: T;
  queued_at: number;
  priority: 'high' | 'medium' | 'low';
  expires_at: number | null;
  displayed: boolean;
  dismissed: boolean;
}

export interface TaskExecution {
  task_id: string;
  started_at: number;
  completed_at: number | null;
  status: string;
  result: string | null;
  error: string | null;
}

/**
 * Scheduler database operations
 */
export class SchedulerDb {
  constructor(private db: Database.Database) {}

  saveScheduledTask(task: ScheduledTask): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO scheduled_tasks
      (id, name, action, schedule, custom_cron, enabled, last_run, next_run, params, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id, task.name, task.action, task.schedule,
      task.custom_cron || null, task.enabled ? 1 : 0,
      task.last_run, task.next_run, JSON.stringify(task.params),
      task.priority, task.created_at
    );
  }

  getScheduledTasks(): ScheduledTask[] {
    const rows = this.db.prepare('SELECT * FROM scheduled_tasks').all() as Array<{
      id: string; name: string; action: string; schedule: string;
      custom_cron: string | null; enabled: number; last_run: number | null;
      next_run: number; params: string; priority: number; created_at: number;
    }>;

    return rows.map(row => ({
      id: row.id, name: row.name, action: row.action, schedule: row.schedule,
      custom_cron: row.custom_cron || undefined, enabled: row.enabled === 1,
      last_run: row.last_run, next_run: row.next_run,
      params: JSON.parse(row.params), priority: row.priority, created_at: row.created_at,
    }));
  }

  updateScheduledTask(taskId: string, updates: Partial<Omit<ScheduledTask, 'id' | 'created_at'>>): void {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'enabled') {
        setClauses.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else if (key === 'params') {
        setClauses.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return;
    values.push(taskId);
    this.db.prepare(`UPDATE scheduled_tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteScheduledTask(taskId: string): void {
    this.db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(taskId);
  }

  saveTriggeredAction(action: TriggeredAction): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO triggered_actions
      (id, name, trigger, action, condition, enabled, params, priority, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      action.id, action.name, action.trigger, action.action,
      action.condition || null, action.enabled ? 1 : 0,
      JSON.stringify(action.params), action.priority, action.created_at
    );
  }

  getTriggeredActions(): TriggeredAction[] {
    const rows = this.db.prepare('SELECT * FROM triggered_actions').all() as Array<{
      id: string; name: string; trigger: string; action: string;
      condition: string | null; enabled: number; params: string;
      priority: number; created_at: number;
    }>;

    return rows.map(row => ({
      id: row.id, name: row.name, trigger: row.trigger, action: row.action,
      condition: row.condition || undefined, enabled: row.enabled === 1,
      params: JSON.parse(row.params), priority: row.priority, created_at: row.created_at,
    }));
  }

  deleteTriggeredAction(actionId: string): void {
    this.db.prepare('DELETE FROM triggered_actions WHERE id = ?').run(actionId);
  }

  saveQueuedRecommendation(queued: QueuedRecommendation): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO queued_recommendations
      (id, recommendation, queued_at, priority, expires_at, displayed, dismissed)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      queued.id, JSON.stringify(queued.recommendation), queued.queued_at,
      queued.priority, queued.expires_at,
      queued.displayed ? 1 : 0, queued.dismissed ? 1 : 0
    );
  }

  getQueuedRecommendations(): QueuedRecommendation[] {
    const rows = this.db.prepare('SELECT * FROM queued_recommendations').all() as Array<{
      id: string; recommendation: string; queued_at: number;
      priority: string; expires_at: number | null; displayed: number; dismissed: number;
    }>;

    return rows.map(row => ({
      id: row.id, recommendation: JSON.parse(row.recommendation),
      queued_at: row.queued_at, priority: row.priority as 'high' | 'medium' | 'low',
      expires_at: row.expires_at, displayed: row.displayed === 1, dismissed: row.dismissed === 1,
    }));
  }

  updateQueuedRecommendation(queuedId: string, updates: { displayed?: boolean; dismissed?: boolean }): void {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.displayed !== undefined) {
      setClauses.push('displayed = ?');
      values.push(updates.displayed ? 1 : 0);
    }
    if (updates.dismissed !== undefined) {
      setClauses.push('dismissed = ?');
      values.push(updates.dismissed ? 1 : 0);
    }

    if (setClauses.length === 0) return;
    values.push(queuedId);
    this.db.prepare(`UPDATE queued_recommendations SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  deleteQueuedRecommendation(queuedId: string): void {
    this.db.prepare('DELETE FROM queued_recommendations WHERE id = ?').run(queuedId);
  }

  saveTaskExecution(execution: TaskExecution): void {
    this.db.prepare(`
      INSERT INTO task_executions
      (task_id, started_at, completed_at, status, result, error)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      execution.task_id, execution.started_at, execution.completed_at,
      execution.status, execution.result, execution.error
    );
  }

  getTaskExecutions(taskId?: string, limit: number = 50): TaskExecution[] {
    let query = 'SELECT task_id, started_at, completed_at, status, result, error FROM task_executions';
    const params: unknown[] = [];

    if (taskId) {
      query += ' WHERE task_id = ?';
      params.push(taskId);
    }

    query += ' ORDER BY started_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params) as TaskExecution[];
  }
}

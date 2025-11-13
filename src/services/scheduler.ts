/**
 * Scheduler Service
 * Handles background daemon, scheduled tasks, triggered actions, and recommendation queue
 */

import { EventEmitter } from 'events';
import type { AgentRecommendation } from '../types/agent.js';
import { getDatabaseService } from './database.js';

export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'custom';
export type TriggerType = 'repo_discovery' | 'scan_complete' | 'launch' | 'idle' | 'user_action';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ScheduledTask {
  id: string;
  name: string;
  action: string;
  schedule: ScheduleFrequency;
  custom_cron?: string; // For custom schedules
  enabled: boolean;
  last_run: number | null;
  next_run: number;
  params: Record<string, any>;
  priority: number; // 1-10, higher = more important
  created_at: number;
}

export interface TriggeredAction {
  id: string;
  name: string;
  trigger: TriggerType;
  action: string;
  condition?: string; // Optional condition expression
  enabled: boolean;
  params: Record<string, any>;
  priority: number;
  created_at: number;
}

export interface QueuedRecommendation {
  id: string;
  recommendation: AgentRecommendation;
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
  status: TaskStatus;
  result: string | null;
  error: string | null;
}

/**
 * Scheduler Service
 * Manages background tasks, triggers, and recommendation queue
 */
export class SchedulerService extends EventEmitter {
  private db: ReturnType<typeof getDatabaseService>;
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private triggeredActions: Map<string, TriggeredAction> = new Map();
  private recommendationQueue: QueuedRecommendation[] = [];
  private daemonRunning: boolean = false;
  private daemonInterval: NodeJS.Timeout | null = null;
  private idleTimeout: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();

  constructor() {
    super();
    this.db = getDatabaseService();
    this.loadScheduledTasks();
    this.loadTriggeredActions();
    this.loadRecommendationQueue();
  }

  /**
   * Start the background daemon
   */
  startDaemon(intervalMs: number = 60000): void {
    if (this.daemonRunning) {
      return;
    }

    this.daemonRunning = true;
    this.emit('daemon_started');

    // Main daemon loop - check every minute
    this.daemonInterval = setInterval(() => {
      this.processPendingTasks();
      this.checkIdleState();
    }, intervalMs);

    // Initial check
    this.processPendingTasks();
  }

  /**
   * Stop the background daemon
   */
  stopDaemon(): void {
    if (!this.daemonRunning) {
      return;
    }

    this.daemonRunning = false;

    if (this.daemonInterval) {
      clearInterval(this.daemonInterval);
      this.daemonInterval = null;
    }

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }

    this.emit('daemon_stopped');
  }

  /**
   * Check if daemon is running
   */
  isDaemonRunning(): boolean {
    return this.daemonRunning;
  }

  /**
   * Add a scheduled task
   */
  addScheduledTask(task: Omit<ScheduledTask, 'id' | 'created_at'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scheduledTask: ScheduledTask = {
      ...task,
      id,
      created_at: Date.now(),
    };

    this.scheduledTasks.set(id, scheduledTask);
    this.db.saveScheduledTask(scheduledTask);
    this.emit('task_added', scheduledTask);

    return id;
  }

  /**
   * Remove a scheduled task
   */
  removeScheduledTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) {
      return false;
    }

    this.scheduledTasks.delete(taskId);
    this.db.deleteScheduledTask(taskId);
    this.emit('task_removed', task);

    return true;
  }

  /**
   * Update a scheduled task
   */
  updateScheduledTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) {
      return false;
    }

    const updatedTask = { ...task, ...updates };
    this.scheduledTasks.set(taskId, updatedTask);
    this.db.updateScheduledTask(taskId, updates);
    this.emit('task_updated', updatedTask);

    return true;
  }

  /**
   * Get all scheduled tasks
   */
  getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * Get scheduled task by ID
   */
  getScheduledTask(taskId: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(taskId);
  }

  /**
   * Add a triggered action
   */
  addTriggeredAction(action: Omit<TriggeredAction, 'id' | 'created_at'>): string {
    const id = `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const triggeredAction: TriggeredAction = {
      ...action,
      id,
      created_at: Date.now(),
    };

    this.triggeredActions.set(id, triggeredAction);
    this.db.saveTriggeredAction(triggeredAction);
    this.emit('trigger_added', triggeredAction);

    return id;
  }

  /**
   * Remove a triggered action
   */
  removeTriggeredAction(actionId: string): boolean {
    const action = this.triggeredActions.get(actionId);
    if (!action) {
      return false;
    }

    this.triggeredActions.delete(actionId);
    this.db.deleteTriggeredAction(actionId);
    this.emit('trigger_removed', action);

    return true;
  }

  /**
   * Get all triggered actions
   */
  getTriggeredActions(): TriggeredAction[] {
    return Array.from(this.triggeredActions.values());
  }

  /**
   * Fire a trigger
   */
  fireTrigger(triggerType: TriggerType, context?: Record<string, any>): void {
    const actions = Array.from(this.triggeredActions.values())
      .filter(a => a.enabled && a.trigger === triggerType)
      .sort((a, b) => b.priority - a.priority);

    for (const action of actions) {
      // Check condition if present
      if (action.condition && !this.evaluateCondition(action.condition, context)) {
        continue;
      }

      this.emit('trigger_fired', { trigger: triggerType, action, context });
      this.executeTriggeredAction(action, context);
    }
  }

  /**
   * Queue a recommendation
   */
  queueRecommendation(
    recommendation: AgentRecommendation,
    expiresIn?: number
  ): string {
    const queued: QueuedRecommendation = {
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recommendation,
      queued_at: Date.now(),
      priority: recommendation.priority,
      expires_at: expiresIn ? Date.now() + expiresIn : null,
      displayed: false,
      dismissed: false,
    };

    this.recommendationQueue.push(queued);
    this.db.saveQueuedRecommendation(queued);
    this.emit('recommendation_queued', queued);

    return queued.id;
  }

  /**
   * Get queued recommendations
   */
  getQueuedRecommendations(includeDisplayed: boolean = false): QueuedRecommendation[] {
    const now = Date.now();

    return this.recommendationQueue.filter(q => {
      // Skip dismissed
      if (q.dismissed) return false;

      // Skip expired
      if (q.expires_at && q.expires_at < now) return false;

      // Skip displayed if requested
      if (!includeDisplayed && q.displayed) return false;

      return true;
    }).sort((a, b) => {
      // Sort by priority then timestamp
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.queued_at - b.queued_at;
    });
  }

  /**
   * Mark recommendation as displayed
   */
  markRecommendationDisplayed(queuedId: string): boolean {
    const queued = this.recommendationQueue.find(q => q.id === queuedId);
    if (!queued) return false;

    queued.displayed = true;
    this.db.updateQueuedRecommendation(queuedId, { displayed: true });
    this.emit('recommendation_displayed', queued);

    return true;
  }

  /**
   * Dismiss a queued recommendation
   */
  dismissQueuedRecommendation(queuedId: string): boolean {
    const queued = this.recommendationQueue.find(q => q.id === queuedId);
    if (!queued) return false;

    queued.dismissed = true;
    this.db.updateQueuedRecommendation(queuedId, { dismissed: true });
    this.emit('recommendation_dismissed', queued);

    return true;
  }

  /**
   * Clear expired recommendations from queue
   */
  cleanupQueue(): number {
    const now = Date.now();
    const before = this.recommendationQueue.length;

    this.recommendationQueue = this.recommendationQueue.filter(q => {
      const shouldRemove = q.dismissed || (q.expires_at && q.expires_at < now);
      if (shouldRemove) {
        this.db.deleteQueuedRecommendation(q.id);
      }
      return !shouldRemove;
    });

    const removed = before - this.recommendationQueue.length;
    if (removed > 0) {
      this.emit('queue_cleaned', { removed });
    }

    return removed;
  }

  /**
   * Record user activity (resets idle timer)
   */
  recordActivity(): void {
    this.lastActivityTime = Date.now();

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  }

  /**
   * Get last activity timestamp
   */
  getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  /**
   * Calculate next run time based on schedule
   */
  private calculateNextRun(schedule: ScheduleFrequency, lastRun: number | null): number {
    const now = Date.now();
    const base = lastRun || now;

    switch (schedule) {
      case 'hourly':
        return base + 60 * 60 * 1000; // 1 hour

      case 'daily':
        // Next day at same time
        const nextDay = new Date(base);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay.getTime();

      case 'weekly':
        // Next week at same time
        const nextWeek = new Date(base);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.getTime();

      case 'custom':
        // TODO: Implement cron parsing
        return now + 60 * 60 * 1000; // Default to hourly

      default:
        return now + 60 * 60 * 1000;
    }
  }

  /**
   * Process pending tasks
   */
  private processPendingTasks(): void {
    const now = Date.now();
    const tasks = Array.from(this.scheduledTasks.values())
      .filter(t => t.enabled && t.next_run <= now)
      .sort((a, b) => b.priority - a.priority);

    for (const task of tasks) {
      this.executeScheduledTask(task);
    }
  }

  /**
   * Execute a scheduled task
   */
  private async executeScheduledTask(task: ScheduledTask): Promise<void> {
    const execution: TaskExecution = {
      task_id: task.id,
      started_at: Date.now(),
      completed_at: null,
      status: 'running',
      result: null,
      error: null,
    };

    this.emit('task_started', { task, execution });

    try {
      // Execute the action
      const result = await this.executeAction(task.action, task.params);

      execution.status = 'completed';
      execution.result = JSON.stringify(result);
      execution.completed_at = Date.now();

      // Update task
      task.last_run = Date.now();
      task.next_run = this.calculateNextRun(task.schedule, task.last_run);
      this.scheduledTasks.set(task.id, task);
      this.db.updateScheduledTask(task.id, {
        last_run: task.last_run,
        next_run: task.next_run,
      });

      this.db.saveTaskExecution(execution);
      this.emit('task_completed', { task, execution });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completed_at = Date.now();

      this.db.saveTaskExecution(execution);
      this.emit('task_failed', { task, execution, error });
    }
  }

  /**
   * Execute a triggered action
   */
  private async executeTriggeredAction(
    action: TriggeredAction,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const params = { ...action.params, ...context };
      const result = await this.executeAction(action.action, params);

      this.emit('action_executed', { action, result });
    } catch (error) {
      this.emit('action_failed', { action, error });
    }
  }

  /**
   * Execute an action by name
   */
  private async executeAction(action: string, params: Record<string, any>): Promise<any> {
    // Emit action for external handling
    const result = await new Promise((resolve, reject) => {
      this.emit('execute_action', { action, params, resolve, reject });
    });

    return result;
  }

  /**
   * Evaluate a condition expression
   */
  private evaluateCondition(condition: string, context?: Record<string, any>): boolean {
    try {
      // Simple expression evaluation
      // For security, we only support basic comparisons
      // Format: "key operator value" (e.g., "repo_count > 5")
      const match = condition.match(/^(\w+)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
      if (!match) return true;

      const [, key, operator, value] = match;
      const contextValue = context?.[key];
      const compareValue = isNaN(Number(value)) ? value : Number(value);

      switch (operator) {
        case '==': return contextValue == compareValue;
        case '!=': return contextValue != compareValue;
        case '>': return contextValue > compareValue;
        case '<': return contextValue < compareValue;
        case '>=': return contextValue >= compareValue;
        case '<=': return contextValue <= compareValue;
        default: return true;
      }
    } catch {
      return true; // If evaluation fails, allow action
    }
  }

  /**
   * Check for idle state and fire idle triggers
   */
  private checkIdleState(): void {
    const now = Date.now();
    const idleThreshold = 5 * 60 * 1000; // 5 minutes
    const timeSinceActivity = now - this.lastActivityTime;

    if (timeSinceActivity >= idleThreshold && !this.idleTimeout) {
      this.idleTimeout = setTimeout(() => {
        this.fireTrigger('idle', { idle_duration_ms: timeSinceActivity });
      }, 0);
    }
  }

  /**
   * Load scheduled tasks from database
   */
  private loadScheduledTasks(): void {
    const tasks = this.db.getScheduledTasks();
    for (const task of tasks) {
      this.scheduledTasks.set(task.id, {
        ...task,
        schedule: task.schedule as ScheduleFrequency,
      });
    }
  }

  /**
   * Load triggered actions from database
   */
  private loadTriggeredActions(): void {
    const actions = this.db.getTriggeredActions();
    for (const action of actions) {
      this.triggeredActions.set(action.id, {
        ...action,
        trigger: action.trigger as TriggerType,
      });
    }
  }

  /**
   * Load recommendation queue from database
   */
  private loadRecommendationQueue(): void {
    this.recommendationQueue = this.db.getQueuedRecommendations();
  }

  /**
   * Get task execution history
   */
  getTaskExecutionHistory(taskId?: string, limit: number = 50): TaskExecution[] {
    const executions = this.db.getTaskExecutions(taskId, limit);
    return executions.map(exec => ({
      ...exec,
      status: exec.status as TaskStatus,
    }));
  }

  /**
   * Close the scheduler
   */
  close(): void {
    this.stopDaemon();
    this.removeAllListeners();
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

/**
 * Get or create scheduler service
 */
export function getSchedulerService(): SchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
  }
  return schedulerInstance;
}

/**
 * Reset scheduler service (for testing)
 */
export function resetSchedulerService(): void {
  if (schedulerInstance) {
    schedulerInstance.close();
  }
  schedulerInstance = null;
}

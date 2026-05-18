import { Request, Response } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { AuthRequest, authenticate } from '../middleware/auth.js';

const taskSchema = z.object({
  title: z.string().min(1),
  tags: z.string().optional(),
  impact_score: z.number().min(1).max(5).optional(),
  urgency_score: z.number().min(1).max(5).optional(),
  learning_score: z.number().min(1).max(5).optional(),
  risk_score: z.number().min(1).max(5).optional(),
  energy_score: z.number().min(1).max(5).optional(),
  first_step: z.string().optional(),
});

export const createTask = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const result = taskSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
    }
    
    const { title, tags, impact_score, urgency_score, learning_score, risk_score, energy_score, first_step } = result.data;
    
    const insertTask = db.prepare(`
      INSERT INTO tasks (user_id, title, tags, impact_score, urgency_score, learning_score, risk_score, energy_score, first_step)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const resultTask = insertTask.run(
      req.userId,
      title,
      tags || '',
      impact_score || 3,
      urgency_score || 3,
      learning_score || 3,
      risk_score || 3,
      energy_score || 3,
      first_step || ''
    );
    
    db.prepare(`
      INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'create')
    `).run(req.userId, resultTask.lastInsertRowid);
    
    res.status(201).json({ message: 'Task created', taskId: resultTask.lastInsertRowid });
  },
];

export const getTasks = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const tasks = db.prepare(`
      SELECT * FROM tasks WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC
    `).all(req.userId);
    
    res.json({ tasks });
  },
];

// ── Update Task ──────────────────────────────────────────────────────────────
export const updateTask = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const taskId = Number(req.params.id);
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID required' });
    }

    const result = taskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
    }

    const { title, tags, impact_score, urgency_score, learning_score, risk_score, energy_score, first_step } = result.data;

    const existing = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(taskId, req.userId);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare(`
      UPDATE tasks SET
        title = ?,
        tags = ?,
        impact_score = ?,
        urgency_score = ?,
        learning_score = ?,
        risk_score = ?,
        energy_score = ?,
        first_step = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title,
      tags || '',
      impact_score || 3,
      urgency_score || 3,
      learning_score || 3,
      risk_score || 3,
      energy_score || 3,
      first_step || '',
      taskId,
      req.userId
    );

    db.prepare(`
      INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'edit')
    `).run(req.userId, taskId);

    res.json({ message: 'Task updated' });
  },
];

// ── Task History (completed & archived) ──────────────────────────────────────
export const getTaskHistory = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const tasks = db.prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? AND status IN ('completed', 'archived') 
      ORDER BY completed_at DESC, created_at DESC
    `).all(req.userId);

    res.json({ tasks });
  },
];

// ── Recommendation with score breakdown ──────────────────────────────────────
export const getRecommendation = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const weights = db.prepare(`
      SELECT * FROM weights WHERE user_id = ?
    `).get(req.userId) as {
      impact_weight: number;
      urgency_weight: number;
      learning_weight: number;
      risk_weight: number;
      energy_weight: number;
    } | undefined;
    
    const defaultWeights = {
      impact_weight: 30,
      urgency_weight: 20,
      learning_weight: 15,
      risk_weight: 15,
      energy_weight: 20,
    };
    
    const w = weights || defaultWeights;
    const totalWeight = w.impact_weight + w.urgency_weight + w.learning_weight + w.risk_weight + w.energy_weight;
    
    const now = new Date().toISOString();
    
    const tasks = db.prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? 
      AND status = 'active'
      AND (snoozed_until IS NULL OR snoozed_until <= ?)
      ORDER BY created_at DESC
    `).all(req.userId, now) as Array<{
      id: number;
      title: string;
      tags: string;
      impact_score: number;
      urgency_score: number;
      learning_score: number;
      risk_score: number;
      energy_score: number;
      first_step: string;
    }>;
    
    if (tasks.length === 0) {
      return res.json({ recommendation: null, message: 'No tasks available' });
    }
    
    const scoredTasks = tasks.map((task) => {
      const impactContribution = (task.impact_score * w.impact_weight) / totalWeight;
      const urgencyContribution = (task.urgency_score * w.urgency_weight) / totalWeight;
      const learningContribution = (task.learning_score * w.learning_weight) / totalWeight;
      const riskContribution = (task.risk_score * w.risk_weight) / totalWeight;
      const energyContribution = (task.energy_score * w.energy_weight) / totalWeight;

      const totalScore = impactContribution + urgencyContribution + learningContribution + riskContribution + energyContribution;
      
      return {
        ...task,
        totalScore,
        breakdown: {
          impact: { score: task.impact_score, weight: w.impact_weight, contribution: Math.round(impactContribution * 100) / 100 },
          urgency: { score: task.urgency_score, weight: w.urgency_weight, contribution: Math.round(urgencyContribution * 100) / 100 },
          learning: { score: task.learning_score, weight: w.learning_weight, contribution: Math.round(learningContribution * 100) / 100 },
          risk: { score: task.risk_score, weight: w.risk_weight, contribution: Math.round(riskContribution * 100) / 100 },
          energy: { score: task.energy_score, weight: w.energy_weight, contribution: Math.round(energyContribution * 100) / 100 },
        },
      };
    });
    
    scoredTasks.sort((a, b) => b.totalScore - a.totalScore);
    
    const topTask = scoredTasks[0];
    const reasons = [];
    
    if (topTask.impact_score >= 4) reasons.push('high impact');
    if (topTask.urgency_score >= 4) reasons.push('time-sensitive');
    if (topTask.learning_score >= 4) reasons.push('learning opportunity');
    if (topTask.risk_score >= 4) reasons.push('reduces risk');
    if (topTask.energy_score >= 4) reasons.push('you feel motivated');
    
    res.json({
      recommendation: {
        id: topTask.id,
        title: topTask.title,
        tags: topTask.tags,
        first_step: topTask.first_step,
        totalScore: Math.round(topTask.totalScore * 100) / 100,
        reason: reasons.length > 0 ? reasons.join(', ') : 'best overall fit',
        breakdown: topTask.breakdown,
      },
    });
  },
];

// ── Snooze with duration ─────────────────────────────────────────────────────
export const snoozeTask = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const { id, duration } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID required' });
    }

    // duration: '2h', 'tomorrow', 'nextweek' — defaults to 30 minutes
    let snoozeMs = 30 * 60 * 1000;
    let label = '30 minutes';

    if (duration === '2h') {
      snoozeMs = 2 * 60 * 60 * 1000;
      label = '2 hours';
    } else if (duration === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      snoozeMs = tomorrow.getTime() - Date.now();
      label = 'tomorrow 9 AM';
    } else if (duration === 'nextweek') {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + (8 - nextWeek.getDay())); // next Monday
      nextWeek.setHours(9, 0, 0, 0);
      snoozeMs = nextWeek.getTime() - Date.now();
      label = 'next Monday 9 AM';
    }

    const snoozeUntil = new Date(Date.now() + snoozeMs).toISOString();
    
    db.prepare(`
      UPDATE tasks SET snoozed_until = ? WHERE id = ? AND user_id = ?
    `).run(snoozeUntil, id, req.userId);
    
    db.prepare(`
      INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'snooze')
    `).run(req.userId, id);
    
    res.json({ message: `Task snoozed until ${label}` });
  },
];

export const completeTask = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID required' });
    }
    
    const completedAt = new Date().toISOString();
    
    db.prepare(`
      UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ? AND user_id = ?
    `).run(completedAt, id, req.userId);
    
    db.prepare(`
      INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'complete')
    `).run(req.userId, id);
    
    res.json({ message: 'Task completed' });
  },
];

export const archiveTask = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID required' });
    }
    
    db.prepare(`
      UPDATE tasks SET status = 'archived' WHERE id = ? AND user_id = ?
    `).run(id, req.userId);
    
    db.prepare(`
      INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'archive')
    `).run(req.userId, id);
    
    res.json({ message: 'Task archived' });
  },
];

export const getWeights = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const weights = db.prepare(`
      SELECT * FROM weights WHERE user_id = ?
    `).get(req.userId);
    
    res.json({ weights });
  },
];

export const updateWeights = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const { impact_weight, urgency_weight, learning_weight, risk_weight, energy_weight } = req.body;
    
    db.prepare(`
      UPDATE weights SET 
        impact_weight = ?,
        urgency_weight = ?,
        learning_weight = ?,
        risk_weight = ?,
        energy_weight = ?
      WHERE user_id = ?
    `).run(
      impact_weight || 30,
      urgency_weight || 20,
      learning_weight || 15,
      risk_weight || 15,
      energy_weight || 20,
      req.userId
    );
    
    res.json({ message: 'Weights updated' });
  },
];

export const getWeeklyStats = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM task_history 
      WHERE user_id = ? AND action = 'complete' AND created_at >= ?
    `).get(req.userId, weekAgo) as { count: number };
    
    const snoozed = db.prepare(`
      SELECT COUNT(*) as count FROM task_history 
      WHERE user_id = ? AND action = 'snooze' AND created_at >= ?
    `).get(req.userId, weekAgo) as { count: number };
    
    const archived = db.prepare(`
      SELECT COUNT(*) as count FROM task_history 
      WHERE user_id = ? AND action = 'archive' AND created_at >= ?
    `).get(req.userId, weekAgo) as { count: number };
    
    res.json({
      stats: {
        completed: completed.count,
        snoozed: snoozed.count,
        archived: archived.count,
      },
    });
  },
];

// ── Export data ───────────────────────────────────────────────────────────────
export const exportData = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const format = (req.query.format as string) || 'json';

    const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(req.userId) as Array<Record<string, unknown>>;
    const weights = db.prepare('SELECT * FROM weights WHERE user_id = ?').get(req.userId);
    const history = db.prepare(`
      SELECT th.*, t.title as task_title FROM task_history th 
      JOIN tasks t ON t.id = th.task_id 
      WHERE th.user_id = ?
      ORDER BY th.created_at DESC
    `).all(req.userId);

    if (format === 'csv') {
      if (tasks.length === 0) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="decision-prioritiser-export.csv"');
        return res.send('No tasks to export');
      }

      const headers = Object.keys(tasks[0]);
      const csvRows = [
        headers.join(','),
        ...tasks.map(task =>
          headers.map(h => {
            const val = String(task[h] ?? '');
            return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
          }).join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="decision-prioritiser-export.csv"');
      return res.send(csvRows.join('\n'));
    }

    // JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="decision-prioritiser-export.json"');
    res.json({ tasks, weights, history, exportedAt: new Date().toISOString() });
  },
];

// ── Weekly Review Stats ──────────────────────────────────────────────────────
export const getWeeklyReview = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisWeekISO = thisWeekStart.toISOString();
    const lastWeekISO = lastWeekStart.toISOString();

    const thisWeekCompleted = db.prepare(`
      SELECT COUNT(*) as count FROM task_history 
      WHERE user_id = ? AND action = 'complete' AND created_at >= ?
    `).get(req.userId, thisWeekISO) as { count: number };

    const lastWeekCompleted = db.prepare(`
      SELECT COUNT(*) as count FROM task_history 
      WHERE user_id = ? AND action = 'complete' AND created_at >= ? AND created_at < ?
    `).get(req.userId, lastWeekISO, thisWeekISO) as { count: number };

    // Get dimension averages for completed tasks this week
    const completedTasksThisWeek = db.prepare(`
      SELECT t.impact_score, t.urgency_score, t.learning_score, t.risk_score, t.energy_score
      FROM tasks t
      JOIN task_history th ON t.id = th.task_id
      WHERE th.user_id = ? AND th.action = 'complete' AND th.created_at >= ?
    `).all(req.userId, thisWeekISO) as Array<{
      impact_score: number;
      urgency_score: number;
      learning_score: number;
      risk_score: number;
      energy_score: number;
    }>;

    const dimensionAverages = {
      impact: 0,
      urgency: 0,
      learning: 0,
      risk: 0,
      energy: 0,
    };

    if (completedTasksThisWeek.length > 0) {
      const n = completedTasksThisWeek.length;
      dimensionAverages.impact = Math.round(completedTasksThisWeek.reduce((s, t) => s + t.impact_score, 0) / n * 10) / 10;
      dimensionAverages.urgency = Math.round(completedTasksThisWeek.reduce((s, t) => s + t.urgency_score, 0) / n * 10) / 10;
      dimensionAverages.learning = Math.round(completedTasksThisWeek.reduce((s, t) => s + t.learning_score, 0) / n * 10) / 10;
      dimensionAverages.risk = Math.round(completedTasksThisWeek.reduce((s, t) => s + t.risk_score, 0) / n * 10) / 10;
      dimensionAverages.energy = Math.round(completedTasksThisWeek.reduce((s, t) => s + t.energy_score, 0) / n * 10) / 10;
    }

    // Get current weights
    const weights = db.prepare('SELECT * FROM weights WHERE user_id = ?').get(req.userId) as {
      impact_weight: number;
      urgency_weight: number;
      learning_weight: number;
      risk_weight: number;
      energy_weight: number;
    } | undefined;

    res.json({
      review: {
        thisWeekCompleted: thisWeekCompleted.count,
        lastWeekCompleted: lastWeekCompleted.count,
        dimensionAverages,
        currentWeights: weights || { impact_weight: 30, urgency_weight: 20, learning_weight: 15, risk_weight: 15, energy_weight: 20 },
      },
    });
  },
];

// ── Tag Management ───────────────────────────────────────────────────────────
export const getTags = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const tasks = db.prepare(`
      SELECT tags FROM tasks WHERE user_id = ? AND status = 'active'
    `).all(req.userId) as Array<{ tags: string }>;

    const tagCounts: Record<string, number> = {};
    tasks.forEach(task => {
      if (task.tags) {
        task.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const tagList = Object.entries(tagCounts).map(([name, count]) => ({ name, count }));
    tagList.sort((a, b) => b.count - a.count);

    res.json({ tags: tagList });
  },
];

export const renameTag = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const { oldName, newName } = req.body;

    if (!oldName || !newName) {
      return res.status(400).json({ error: 'Both oldName and newName are required' });
    }

    const tasks = db.prepare(`
      SELECT id, tags FROM tasks WHERE user_id = ? AND tags LIKE ?
    `).all(req.userId, `%${oldName}%`) as Array<{ id: number; tags: string }>;

    const updateStmt = db.prepare('UPDATE tasks SET tags = ? WHERE id = ?');

    tasks.forEach(task => {
      const updatedTags = task.tags
        .split(',')
        .map(t => t.trim())
        .map(t => (t === oldName ? newName.trim() : t))
        .join(', ');
      updateStmt.run(updatedTags, task.id);
    });

    res.json({ message: `Tag renamed from "${oldName}" to "${newName}"`, affected: tasks.length });
  },
];

export const deleteTag = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const tasks = db.prepare(`
      SELECT id, tags FROM tasks WHERE user_id = ? AND tags LIKE ?
    `).all(req.userId, `%${name}%`) as Array<{ id: number; tags: string }>;

    const updateStmt = db.prepare('UPDATE tasks SET tags = ? WHERE id = ?');

    tasks.forEach(task => {
      const updatedTags = task.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t !== name)
        .join(', ');
      updateStmt.run(updatedTags, task.id);
    });

    res.json({ message: `Tag "${name}" deleted`, affected: tasks.length });
  },
];
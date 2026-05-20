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
  async (req: AuthRequest, res: Response) => {
    const result = taskSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
    }
    
    const { title, tags, impact_score, urgency_score, learning_score, risk_score, energy_score, first_step } = result.data;
    
    try {
      const resultTask = await db.execute({
        sql: `
          INSERT INTO tasks (user_id, title, tags, impact_score, urgency_score, learning_score, risk_score, energy_score, first_step)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          req.userId!,
          title,
          tags || '',
          impact_score || 3,
          urgency_score || 3,
          learning_score || 3,
          risk_score || 3,
          energy_score || 3,
          first_step || ''
        ]
      });
      
      const newTaskId = Number(resultTask.lastInsertRowid);
      
      await db.execute({
        sql: `INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'create')`,
        args: [req.userId!, newTaskId]
      });
      
      res.status(201).json({ message: 'Task created', taskId: newTaskId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while creating task' });
    }
  },
];

export const getTasks = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const tasksResult = await db.execute({
        sql: `SELECT * FROM tasks WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC`,
        args: [req.userId!]
      });
      
      res.json({ tasks: tasksResult.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while fetching tasks' });
    }
  },
];

// ── Update Task ──────────────────────────────────────────────────────────────
export const updateTask = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const taskId = Number(req.params.id);
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID required' });
    }

    const result = taskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
    }

    const { title, tags, impact_score, urgency_score, learning_score, risk_score, energy_score, first_step } = result.data;

    try {
      const existingResult = await db.execute({
        sql: 'SELECT id FROM tasks WHERE id = ? AND user_id = ?',
        args: [taskId, req.userId!]
      });
      
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      await db.execute({
        sql: `
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
        `,
        args: [
          title,
          tags || '',
          impact_score || 3,
          urgency_score || 3,
          learning_score || 3,
          risk_score || 3,
          energy_score || 3,
          first_step || '',
          taskId,
          req.userId!
        ]
      });

      await db.execute({
        sql: `INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'edit')`,
        args: [req.userId!, taskId]
      });

      res.json({ message: 'Task updated' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while updating task' });
    }
  },
];

// ── Task History (completed & archived) ──────────────────────────────────────
export const getTaskHistory = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const tasksResult = await db.execute({
        sql: `
          SELECT * FROM tasks 
          WHERE user_id = ? AND status IN ('completed', 'archived') 
          ORDER BY completed_at DESC, created_at DESC
        `,
        args: [req.userId!]
      });

      res.json({ tasks: tasksResult.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while fetching history' });
    }
  },
];

// ── Recommendation with score breakdown ──────────────────────────────────────
export const getRecommendation = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const weightsResult = await db.execute({
        sql: `SELECT * FROM weights WHERE user_id = ?`,
        args: [req.userId!]
      });
      
      const weights = weightsResult.rows[0] as unknown as {
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
      
      const tasksResult = await db.execute({
        sql: `
          SELECT * FROM tasks 
          WHERE user_id = ? 
          AND status = 'active'
          AND (snoozed_until IS NULL OR snoozed_until <= ?)
          ORDER BY created_at DESC
        `,
        args: [req.userId!, now]
      });
      
      const tasks = tasksResult.rows as unknown as Array<{
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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while getting recommendation' });
    }
  },
];

// ── Snooze with duration ─────────────────────────────────────────────────────
export const snoozeTask = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
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
    
    try {
      await db.execute({
        sql: `UPDATE tasks SET snoozed_until = ? WHERE id = ? AND user_id = ?`,
        args: [snoozeUntil, id, req.userId!]
      });
      
      await db.execute({
        sql: `INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'snooze')`,
        args: [req.userId!, id]
      });
      
      res.json({ message: `Task snoozed until ${label}` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while snoozing task' });
    }
  },
];

export const completeTask = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID required' });
    }
    
    const completedAt = new Date().toISOString();
    
    try {
      await db.execute({
        sql: `UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ? AND user_id = ?`,
        args: [completedAt, id, req.userId!]
      });
      
      await db.execute({
        sql: `INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'complete')`,
        args: [req.userId!, id]
      });
      
      res.json({ message: 'Task completed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while completing task' });
    }
  },
];

export const archiveTask = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID required' });
    }
    
    try {
      await db.execute({
        sql: `UPDATE tasks SET status = 'archived' WHERE id = ? AND user_id = ?`,
        args: [id, req.userId!]
      });
      
      await db.execute({
        sql: `INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'archive')`,
        args: [req.userId!, id]
      });
      
      res.json({ message: 'Task archived' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while archiving task' });
    }
  },
];

export const getWeights = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const weightsResult = await db.execute({
        sql: `SELECT * FROM weights WHERE user_id = ?`,
        args: [req.userId!]
      });
      
      res.json({ weights: weightsResult.rows[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while fetching weights' });
    }
  },
];

export const updateWeights = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { impact_weight, urgency_weight, learning_weight, risk_weight, energy_weight } = req.body;
    
    try {
      await db.execute({
        sql: `
          UPDATE weights SET 
            impact_weight = ?,
            urgency_weight = ?,
            learning_weight = ?,
            risk_weight = ?,
            energy_weight = ?
          WHERE user_id = ?
        `,
        args: [
          impact_weight || 30,
          urgency_weight || 20,
          learning_weight || 15,
          risk_weight || 15,
          energy_weight || 20,
          req.userId!
        ]
      });
      
      res.json({ message: 'Weights updated' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while updating weights' });
    }
  },
];

export const getWeeklyStats = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    try {
      const completedResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM task_history WHERE user_id = ? AND action = 'complete' AND created_at >= ?`,
        args: [req.userId!, weekAgo]
      });
      
      const snoozedResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM task_history WHERE user_id = ? AND action = 'snooze' AND created_at >= ?`,
        args: [req.userId!, weekAgo]
      });
      
      const archivedResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM task_history WHERE user_id = ? AND action = 'archive' AND created_at >= ?`,
        args: [req.userId!, weekAgo]
      });
      
      const completedCount = Number(completedResult.rows[0]?.count || 0);
      const snoozedCount = Number(snoozedResult.rows[0]?.count || 0);
      const archivedCount = Number(archivedResult.rows[0]?.count || 0);
      
      res.json({
        stats: {
          completed: completedCount,
          snoozed: snoozedCount,
          archived: archivedCount,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while getting weekly stats' });
    }
  },
];

// ── Export data ───────────────────────────────────────────────────────────────
export const exportData = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const format = (req.query.format as string) || 'json';

    try {
      const tasksResult = await db.execute({
        sql: 'SELECT * FROM tasks WHERE user_id = ?',
        args: [req.userId!]
      });
      const tasks = tasksResult.rows as unknown as Array<Record<string, unknown>>;
      
      const weightsResult = await db.execute({
        sql: 'SELECT * FROM weights WHERE user_id = ?',
        args: [req.userId!]
      });
      const weights = weightsResult.rows[0];
      
      const historyResult = await db.execute({
        sql: `
          SELECT th.*, t.title as task_title FROM task_history th 
          JOIN tasks t ON t.id = th.task_id 
          WHERE th.user_id = ?
          ORDER BY th.created_at DESC
        `,
        args: [req.userId!]
      });
      const history = historyResult.rows;

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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while exporting data' });
    }
  },
];

// ── Weekly Review Stats ──────────────────────────────────────────────────────
export const getWeeklyReview = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const thisWeekISO = thisWeekStart.toISOString();
    const lastWeekISO = lastWeekStart.toISOString();

    try {
      const thisWeekCompletedResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM task_history WHERE user_id = ? AND action = 'complete' AND created_at >= ?`,
        args: [req.userId!, thisWeekISO]
      });

      const lastWeekCompletedResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM task_history WHERE user_id = ? AND action = 'complete' AND created_at >= ? AND created_at < ?`,
        args: [req.userId!, lastWeekISO, thisWeekISO]
      });

      const thisWeekCompletedCount = Number(thisWeekCompletedResult.rows[0]?.count || 0);
      const lastWeekCompletedCount = Number(lastWeekCompletedResult.rows[0]?.count || 0);

      // Get dimension averages for completed tasks this week
      const completedTasksThisWeekResult = await db.execute({
        sql: `
          SELECT t.impact_score, t.urgency_score, t.learning_score, t.risk_score, t.energy_score
          FROM tasks t
          JOIN task_history th ON t.id = th.task_id
          WHERE th.user_id = ? AND th.action = 'complete' AND th.created_at >= ?
        `,
        args: [req.userId!, thisWeekISO]
      });
      
      const completedTasksThisWeek = completedTasksThisWeekResult.rows as unknown as Array<{
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
      const weightsResult = await db.execute({
        sql: 'SELECT * FROM weights WHERE user_id = ?',
        args: [req.userId!]
      });
      const weights = weightsResult.rows[0];

      res.json({
        review: {
          thisWeekCompleted: thisWeekCompletedCount,
          lastWeekCompleted: lastWeekCompletedCount,
          dimensionAverages,
          currentWeights: weights || { impact_weight: 30, urgency_weight: 20, learning_weight: 15, risk_weight: 15, energy_weight: 20 },
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while generating weekly review' });
    }
  },
];

// ── Tag Management ───────────────────────────────────────────────────────────
export const getTags = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const tasksResult = await db.execute({
        sql: `SELECT tags FROM tasks WHERE user_id = ? AND status = 'active'`,
        args: [req.userId!]
      });
      const tasks = tasksResult.rows as unknown as Array<{ tags: string }>;

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
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while getting tags' });
    }
  },
];

export const renameTag = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { oldName, newName } = req.body;

    if (!oldName || !newName) {
      return res.status(400).json({ error: 'Both oldName and newName are required' });
    }

    try {
      const tasksResult = await db.execute({
        sql: `SELECT id, tags FROM tasks WHERE user_id = ? AND tags LIKE ?`,
        args: [req.userId!, `%${oldName}%`]
      });
      const tasks = tasksResult.rows as unknown as Array<{ id: number; tags: string }>;

      for (const task of tasks) {
        const updatedTags = task.tags
          .split(',')
          .map(t => t.trim())
          .map(t => (t === oldName ? newName.trim() : t))
          .join(', ');
        
        await db.execute({
          sql: 'UPDATE tasks SET tags = ? WHERE id = ?',
          args: [updatedTags, task.id]
        });
      }

      res.json({ message: `Tag renamed from "${oldName}" to "${newName}"`, affected: tasks.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while renaming tag' });
    }
  },
];

export const deleteTag = [
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    try {
      const tasksResult = await db.execute({
        sql: `SELECT id, tags FROM tasks WHERE user_id = ? AND tags LIKE ?`,
        args: [req.userId!, `%${name}%`]
      });
      const tasks = tasksResult.rows as unknown as Array<{ id: number; tags: string }>;

      for (const task of tasks) {
        const updatedTags = task.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t !== name)
          .join(', ');
          
        await db.execute({
          sql: 'UPDATE tasks SET tags = ? WHERE id = ?',
          args: [updatedTags, task.id]
        });
      }

      res.json({ message: `Tag "${name}" deleted`, affected: tasks.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Database error while deleting tag' });
    }
  },
];
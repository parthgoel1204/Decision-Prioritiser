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
      const score =
        (task.impact_score * w.impact_weight) / totalWeight +
        (task.urgency_score * w.urgency_weight) / totalWeight +
        (task.learning_score * w.learning_weight) / totalWeight +
        (task.risk_score * w.risk_weight) / totalWeight +
        (task.energy_score * w.energy_weight) / totalWeight;
      
      return { ...task, totalScore: score };
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
        ...topTask,
        reason: reasons.length > 0 ? reasons.join(', ') : 'best overall fit',
      },
    });
  },
];

export const snoozeTask = [
  authenticate,
  (req: AuthRequest, res: Response) => {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Task ID required' });
    }
    
    const snoozeUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    db.prepare(`
      UPDATE tasks SET snoozed_until = ? WHERE id = ? AND user_id = ?
    `).run(snoozeUntil, id, req.userId);
    
    db.prepare(`
      INSERT INTO task_history (user_id, task_id, action) VALUES (?, ?, 'snooze')
    `).run(req.userId, id);
    
    res.json({ message: 'Task snoozed for 30 minutes' });
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
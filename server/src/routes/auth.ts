import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const signup = (req: Request, res: Response) => {
  const result = signupSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  
  const { email, password } = result.data;
  
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  
  if (existingUser) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const insertUser = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
  const resultUser = insertUser.run(email, hashedPassword);
  const userId = resultUser.lastInsertRowid;
  
  const insertWeights = db.prepare(
    'INSERT INTO weights (user_id, impact_weight, urgency_weight, learning_weight, risk_weight, energy_weight) VALUES (?, 30, 20, 15, 15, 20)'
  );
  insertWeights.run(userId);
  
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
  
  res.status(201).json({ message: 'User created', token, userId });
};

export const login = (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  
  const { email, password } = result.data;
  
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as { id: number; password: string } | undefined;
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
  
  res.json({ message: 'Login successful', token, userId: user.id });
};
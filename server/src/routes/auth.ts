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

export const signup = async (req: Request, res: Response) => {
  const result = signupSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  
  const { email, password } = result.data;
  
  try {
    const existingUserResult = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email]
    });
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const resultUser = await db.execute({
      sql: 'INSERT INTO users (email, password) VALUES (?, ?)',
      args: [email, hashedPassword]
    });
    
    const userId = Number(resultUser.lastInsertRowid);
    
    await db.execute({
      sql: 'INSERT INTO weights (user_id, impact_weight, urgency_weight, learning_weight, risk_weight, energy_weight) VALUES (?, 30, 20, 15, 15, 20)',
      args: [userId]
    });
    
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ message: 'User created', token, userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error during signup' });
  }
};

export const login = async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.errors });
  }
  
  const { email, password } = result.data;
  
  try {
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    
    const user = userResult.rows[0] as unknown as { id: number; password: string } | undefined;
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );
    
    res.json({ message: 'Login successful', token, userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error during login' });
  }
};
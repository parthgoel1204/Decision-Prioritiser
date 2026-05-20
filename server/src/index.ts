import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { signup, login } from './routes/auth.js';
import { initDb } from './db.js';
import {
  createTask,
  getTasks,
  updateTask,
  getTaskHistory,
  getRecommendation,
  snoozeTask,
  completeTask,
  archiveTask,
  getWeights,
  updateWeights,
  getWeeklyStats,
  getWeeklyReview,
  exportData,
  getTags,
  renameTag,
  deleteTag,
} from './routes/tasks.js';

dotenv.config();

// Initialize the Database
initDb();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Auth
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);

// Tasks CRUD
app.post('/api/tasks', ...createTask);
app.get('/api/tasks', getTasks);
app.put('/api/tasks/:id', updateTask);
app.get('/api/tasks/history', getTaskHistory);

// Recommendation
app.get('/api/recommendation', getRecommendation);

// Task actions
app.post('/api/snooze', snoozeTask);
app.post('/api/complete', completeTask);
app.post('/api/archive', archiveTask);

// Weights
app.get('/api/weights', getWeights);
app.post('/api/weights', updateWeights);

// Stats & Review
app.get('/api/stats', getWeeklyStats);
app.get('/api/stats/review', getWeeklyReview);

// Tags
app.get('/api/tags', getTags);
app.put('/api/tags/rename', renameTag);
app.delete('/api/tags', deleteTag);

// Export
app.get('/api/export', exportData);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
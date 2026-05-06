import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { signup, login } from './routes/auth.js';
import {
  createTask,
  getTasks,
  getRecommendation,
  snoozeTask,
  completeTask,
  archiveTask,
  getWeights,
  updateWeights,
  getWeeklyStats,
} from './routes/tasks.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);

app.post('/api/tasks', ...createTask);
app.get('/api/tasks', getTasks);
app.get('/api/recommendation', getRecommendation);
app.post('/api/snooze', snoozeTask);
app.post('/api/complete', completeTask);
app.post('/api/archive', archiveTask);
app.get('/api/weights', getWeights);
app.post('/api/weights', updateWeights);
app.get('/api/stats', getWeeklyStats);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
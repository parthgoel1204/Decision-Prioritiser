import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';

interface Task {
  id: number;
  title: string;
  tags: string;
  impact_score: number;
  urgency_score: number;
  learning_score: number;
  risk_score: number;
  energy_score: number;
  first_step: string;
}

interface Recommendation {
  id: number;
  title: string;
  reason: string;
  first_step: string;
}

export default function Dashboard() {
  const [view, setView] = useState<'recommend' | 'add' | 'list' | 'weights' | 'timer'>('recommend');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerTask, setTimerTask] = useState<string>('');
  
  const [newTask, setNewTask] = useState({
    title: '',
    tags: '',
    impact_score: 3,
    urgency_score: 3,
    learning_score: 3,
    risk_score: 3,
    energy_score: 3,
    first_step: '',
  });
  
  const [stats, setStats] = useState({ completed: 0, snoozed: 0, archived: 0 });
  const { logout } = useAuth();
  const navigate = useNavigate();

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get('/api/tasks');
      setTasks(res.data.tasks);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchRecommendation = useCallback(async () => {
    try {
      const res = await axios.get('/api/recommendation');
      setRecommendation(res.data.recommendation);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchRecommendation();
    fetchStats();
  }, [fetchTasks, fetchRecommendation, fetchStats]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((s) => s - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
      new Audio('/notifications.mp3')?.play()?.catch(() => {});
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/tasks', newTask);
      setNewTask({
        title: '',
        tags: '',
        impact_score: 3,
        urgency_score: 3,
        learning_score: 3,
        risk_score: 3,
        energy_score: 3,
        first_step: '',
      });
      fetchTasks();
      fetchRecommendation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccept = () => {
    if (recommendation) {
      setTimerTask(recommendation.title);
      setTimerSeconds(25 * 60);
      setView('timer');
      setTimerRunning(true);
    }
  };

  const handleSnooze = async () => {
    if (!recommendation) return;
    try {
      await axios.post('/api/snooze', { id: recommendation.id });
      fetchRecommendation();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async () => {
    if (!recommendation) return;
    try {
      await axios.post('/api/complete', { id: recommendation.id });
      fetchRecommendation();
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await axios.post('/api/archive', { id });
      fetchTasks();
      fetchRecommendation();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const ScoreSlider = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-gray-600">{value}</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold">Decision Prioritiser</h1>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Log Out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('recommend')}
            className={`px-4 py-2 rounded ${view === 'recommend' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            What to Do
          </button>
          <button
            onClick={() => setView('add')}
            className={`px-4 py-2 rounded ${view === 'add' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            Add Task
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
          >
            My Tasks ({tasks.length})
          </button>
        </div>

        {view === 'recommend' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">What Should I Do Next?</h2>
            
            {recommendation ? (
              <div>
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">{recommendation.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Because:</strong> {recommendation.reason}
                  </p>
                  {recommendation.first_step && (
                    <p className="text-sm text-gray-600">
                      <strong>Start with:</strong> {recommendation.first_step}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Start (25 min)
                  </button>
                  <button
                    onClick={handleSnooze}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Snooze
                  </button>
                  <button
                    onClick={handleComplete}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Complete
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No tasks available. Add some tasks to get recommendations!</p>
            )}

            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium mb-2">This Week</h3>
              <div className="flex gap-4 text-sm">
                <span>{stats.completed} completed</span>
                <span>{stats.snoozed} snoozed</span>
                <span>{stats.archived} archived</span>
              </div>
            </div>
          </div>
        )}

        {view === 'add' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
            
            <form onSubmit={handleAddTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newTask.tags}
                  onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="work, learning, urgent"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">First Step (25-min starter)</label>
                <input
                  type="text"
                  value={newTask.first_step}
                  onChange={(e) => setNewTask({ ...newTask, first_step: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="What can you do in 25 minutes?"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <ScoreSlider
                  label="Impact"
                  value={newTask.impact_score}
                  onChange={(v) => setNewTask({ ...newTask, impact_score: v })}
                />
                <ScoreSlider
                  label="Urgency"
                  value={newTask.urgency_score}
                  onChange={(v) => setNewTask({ ...newTask, urgency_score: v })}
                />
                <ScoreSlider
                  label="Learning"
                  value={newTask.learning_score}
                  onChange={(v) => setNewTask({ ...newTask, learning_score: v })}
                />
                <ScoreSlider
                  label="Risk Reduction"
                  value={newTask.risk_score}
                  onChange={(v) => setNewTask({ ...newTask, risk_score: v })}
                />
                <ScoreSlider
                  label="Energy"
                  value={newTask.energy_score}
                  onChange={(v) => setNewTask({ ...newTask, energy_score: v })}
                />
              </div>
              
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Add Task
              </button>
            </form>
          </div>
        )}

        {view === 'list' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">My Tasks</h2>
            
            {tasks.length === 0 ? (
              <p className="text-gray-600">No tasks yet. Add some tasks!</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="p-3 border rounded flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{task.title}</h3>
                      {task.tags && (
                        <p className="text-xs text-gray-500 mt-1">{task.tags}</p>
                      )}
                      <div className="flex gap-2 mt-2 text-xs">
                        <span className="px-2 py-1 bg-gray-100 rounded">Impact: {task.impact_score}</span>
                        <span className="px-2 py-1 bg-gray-100 rounded">Energy: {task.energy_score}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleArchive(task.id)}
                      className="text-gray-400 hover:text-red-600 text-sm"
                    >
                      Archive
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'timer' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Focus Timer</h2>
            
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 mb-2">{timerTask}</p>
              <div className="text-6xl font-bold mb-6">{formatTime(timerSeconds)}</div>
              
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {timerRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  onClick={() => {
                    setTimerSeconds(25 * 60);
                    setTimerRunning(false);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
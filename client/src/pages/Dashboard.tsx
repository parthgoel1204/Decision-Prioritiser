import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import EmptyState from '../components/EmptyState';
import ScoreBreakdown from '../components/ScoreBreakdown';
import SnoozeModal from '../components/SnoozeModal';
import EditTaskModal from '../components/EditTaskModal';
import SettingsView from '../components/SettingsView';
import HistoryView from '../components/HistoryView';
import WeeklyReviewModal from '../components/WeeklyReviewModal';

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

interface BreakdownItem { score: number; weight: number; contribution: number; }
interface Recommendation {
  id: number;
  title: string;
  tags: string;
  reason: string;
  first_step: string;
  totalScore: number;
  breakdown: {
    impact: BreakdownItem; urgency: BreakdownItem; learning: BreakdownItem;
    risk: BreakdownItem; energy: BreakdownItem;
  };
}

type View = 'recommend' | 'add' | 'list' | 'history' | 'settings' | 'timer';

export default function Dashboard() {
  const [view, setView] = useState<View>('recommend');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerTask, setTimerTask] = useState('');
  const [stats, setStats] = useState({ completed: 0, snoozed: 0, archived: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', tags: '', impact_score: 3, urgency_score: 3,
    learning_score: 3, risk_score: 3, energy_score: 3, first_step: '',
  });

  const { logout } = useAuth();
  const navigate = useNavigate();

  const fetchTasks = useCallback(async () => {
    try { const res = await axios.get('/api/tasks'); setTasks(res.data.tasks); } catch (err) { console.error(err); }
  }, []);
  const fetchRecommendation = useCallback(async () => {
    try { const res = await axios.get('/api/recommendation'); setRecommendation(res.data.recommendation); } catch (err) { console.error(err); }
  }, []);
  const fetchStats = useCallback(async () => {
    try { const res = await axios.get('/api/stats'); setStats(res.data.stats); } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchTasks(); fetchRecommendation(); fetchStats(); }, [fetchTasks, fetchRecommendation, fetchStats]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
      new Audio('/notifications.mp3')?.play()?.catch(() => {});
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n' || e.key === 'N') setView('add');
      else if (e.key === 'r' || e.key === 'R') setView('recommend');
      else if (e.key === ' ' && view === 'timer') { e.preventDefault(); setTimerRunning((r) => !r); }
      else if (e.key === 'Escape') { setSnoozeOpen(false); setEditTask(null); setReviewOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/tasks', newTask);
      setNewTask({ title: '', tags: '', impact_score: 3, urgency_score: 3, learning_score: 3, risk_score: 3, energy_score: 3, first_step: '' });
      fetchTasks(); fetchRecommendation(); setView('recommend');
    } catch (err) { console.error(err); }
  };

  const handleAccept = () => {
    if (recommendation) { setTimerTask(recommendation.title); setTimerSeconds(25 * 60); setView('timer'); setTimerRunning(true); }
  };
  const handleSnooze = async (duration: string) => {
    if (!recommendation) return;
    try { await axios.post('/api/snooze', { id: recommendation.id, duration }); fetchRecommendation(); } catch (err) { console.error(err); }
  };
  const handleComplete = async () => {
    if (!recommendation) return;
    try { await axios.post('/api/complete', { id: recommendation.id }); fetchRecommendation(); fetchTasks(); fetchStats(); } catch (err) { console.error(err); }
  };
  const handleArchive = async (id: number) => {
    try { await axios.post('/api/archive', { id }); fetchTasks(); fetchRecommendation(); fetchStats(); } catch (err) { console.error(err); }
  };
  const handleEditSave = async (task: Task) => {
    try { await axios.put(`/api/tasks/${task.id}`, task); setEditTask(null); fetchTasks(); fetchRecommendation(); } catch (err) { console.error(err); }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  // Filter tasks
  const allTags = [...new Set(tasks.flatMap((t) => t.tags.split(',').map((x) => x.trim()).filter(Boolean)))];
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !tagFilter || t.tags.split(',').map((x) => x.trim()).includes(tagFilter);
    return matchesSearch && matchesTag;
  });

  const ScoreSlider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => {
    const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-green-500'];
    return (
      <div>
        <div className="flex justify-between mb-1.5">
          <label className="text-xs font-medium text-foreground/70">{label}</label>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${colors[value]}`}>{value}</span>
        </div>
        <input type="range" min="1" max="5" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary" />
      </div>
    );
  };

  const navItems: { key: View; label: string; icon: string }[] = [
    { key: 'recommend', label: 'Focus', icon: '🎯' },
    { key: 'add', label: 'Add', icon: '➕' },
    { key: 'list', label: 'Tasks', icon: '📋' },
    { key: 'history', label: 'History', icon: '📜' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Decision Prioritiser</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setReviewOpen(true)} className="text-sm px-3 py-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all" title="Weekly Review">
              📊
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Log Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab bar */}
        <div className="flex gap-1.5 p-1.5 bg-accent/50 rounded-2xl mb-6 overflow-x-auto">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => setView(item.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                view === item.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <span>{item.icon}</span> {item.label}
              {item.key === 'list' && <span className="ml-1 text-xs opacity-60">({tasks.length})</span>}
            </button>
          ))}
        </div>

        {/* ─── Recommendation View ─── */}
        {view === 'recommend' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">What Should I Do Next?</h2>
            {recommendation ? (
              <div className="space-y-4">
                <div className="p-5 bg-primary/5 border border-primary/10 rounded-xl">
                  <h3 className="text-base font-semibold text-foreground mb-1">{recommendation.title}</h3>
                  {recommendation.tags && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {recommendation.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-accent text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground"><strong>Because:</strong> {recommendation.reason}</p>
                  {recommendation.first_step && <p className="text-sm text-muted-foreground mt-1"><strong>Start with:</strong> {recommendation.first_step}</p>}
                </div>

                {recommendation.breakdown && <ScoreBreakdown breakdown={recommendation.breakdown} totalScore={recommendation.totalScore} />}

                <div className="flex flex-wrap gap-2">
                  <button onClick={handleAccept} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all active:scale-[0.97]">▶ Start (25 min)</button>
                  <button onClick={() => setSnoozeOpen(true)} className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-all active:scale-[0.97]">💤 Snooze</button>
                  <button onClick={handleComplete} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">✅ Complete</button>
                </div>
              </div>
            ) : (
              <EmptyState icon="🎯" title="No tasks to recommend" description="Add some tasks and I'll tell you what to focus on first." actionLabel="Add a Task" onAction={() => setView('add')} />
            )}

            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground/70 mb-2">This Week</h3>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">✅ {stats.completed}</span>
                <span className="flex items-center gap-1">💤 {stats.snoozed}</span>
                <span className="flex items-center gap-1">📁 {stats.archived}</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Add Task View ─── */}
        {view === 'add' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-5">Add New Task</h2>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">Task Title</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">Tags (comma-separated)</label>
                <input type="text" value={newTask.tags} onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="work, learning, urgent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/70 mb-1.5">First Step (25-min starter)</label>
                <input type="text" value={newTask.first_step} onChange={(e) => setNewTask({ ...newTask, first_step: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" placeholder="What can you do in 25 minutes?" />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
                <ScoreSlider label="Impact" value={newTask.impact_score} onChange={(v) => setNewTask({ ...newTask, impact_score: v })} />
                <ScoreSlider label="Urgency" value={newTask.urgency_score} onChange={(v) => setNewTask({ ...newTask, urgency_score: v })} />
                <ScoreSlider label="Learning" value={newTask.learning_score} onChange={(v) => setNewTask({ ...newTask, learning_score: v })} />
                <ScoreSlider label="Risk Reduction" value={newTask.risk_score} onChange={(v) => setNewTask({ ...newTask, risk_score: v })} />
                <ScoreSlider label="Energy" value={newTask.energy_score} onChange={(v) => setNewTask({ ...newTask, energy_score: v })} />
              </div>
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]">
                Add Task
              </button>
            </form>
          </div>
        )}

        {/* ─── My Tasks View ─── */}
        {view === 'list' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">My Tasks</h2>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔍</span>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks..."
                  className="w-full pl-9 pr-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
              {allTags.length > 0 && (
                <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
                  className="px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground">
                  <option value="">All Tags</option>
                  {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              )}
            </div>

            {filteredTasks.length === 0 ? (
              <EmptyState icon={tasks.length === 0 ? '📝' : '🔍'} title={tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
                description={tasks.length === 0 ? 'Add your first task to get started with prioritised productivity.' : 'Try adjusting your search or filter.'}
                actionLabel={tasks.length === 0 ? 'Add a Task' : undefined} onAction={tasks.length === 0 ? () => setView('add') : undefined} />
            ) : (
              <div className="space-y-2.5">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="p-4 rounded-xl border border-border hover:bg-accent/30 transition-colors group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground">{task.title}</h3>
                        {task.tags && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {task.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                              <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-accent text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 mt-2 text-xs">
                          <span className="px-2 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded">Impact: {task.impact_score}</span>
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded">Energy: {task.energy_score}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditTask(task)} className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all" title="Edit">✏️</button>
                        <button onClick={() => handleArchive(task.id)} className="px-2.5 py-1.5 text-xs rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all" title="Archive">📁</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── History View ─── */}
        {view === 'history' && <HistoryView />}

        {/* ─── Settings View ─── */}
        {view === 'settings' && <SettingsView onWeightsUpdated={fetchRecommendation} />}

        {/* ─── Timer View ─── */}
        {view === 'timer' && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Focus Timer</h2>
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground mb-3">{timerTask}</p>
              <div className="text-7xl font-bold text-foreground mb-8 font-mono tabular-nums">{formatTime(timerSeconds)}</div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setTimerRunning(!timerRunning)}
                  className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-all active:scale-[0.97]">
                  {timerRunning ? '⏸ Pause' : '▶ Start'}
                </button>
                <button onClick={() => { setTimerSeconds(25 * 60); setTimerRunning(false); }}
                  className="px-8 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-all active:scale-[0.97]">
                  ↺ Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SnoozeModal isOpen={snoozeOpen} onClose={() => setSnoozeOpen(false)} onSnooze={handleSnooze} />
      <EditTaskModal task={editTask} isOpen={!!editTask} onClose={() => setEditTask(null)} onSave={handleEditSave} />
      <WeeklyReviewModal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} />
    </div>
  );
}
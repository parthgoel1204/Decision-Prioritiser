import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/App';
import { toast } from 'sonner';

// shadcn
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Lucide icons
import {
  Target, Plus, ListTodo, History, Settings, LogOut, BarChart3, Search,
  Play, Pause, RotateCcw, Zap, Clock, CheckCircle2, Archive, Pencil,
  Moon, AlarmClock, Wand2, Loader2,
} from 'lucide-react';

// Custom components
import EmptyState from '@/components/EmptyState';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import SnoozeModal from '@/components/SnoozeModal';
import EditTaskModal from '@/components/EditTaskModal';
import SettingsView from '@/components/SettingsView';
import HistoryView from '@/components/HistoryView';
import WeeklyReviewModal from '@/components/WeeklyReviewModal';

// Hooks
import { useScoreSuggestion } from '@/hooks/useScoreSuggestion';

// ── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: number; title: string; tags: string;
  impact_score: number; urgency_score: number; learning_score: number;
  risk_score: number; energy_score: number; first_step: string;
}

interface BreakdownItem { score: number; weight: number; contribution: number; }
interface Recommendation {
  id: number; title: string; tags: string; reason: string; first_step: string;
  totalScore: number;
  breakdown: { impact: BreakdownItem; urgency: BreakdownItem; learning: BreakdownItem; risk: BreakdownItem; energy: BreakdownItem; };
}

type View = 'recommend' | 'add' | 'list' | 'history' | 'settings' | 'timer';

const scoreDimensions = [
  { key: 'impact_score' as const, label: 'Impact', emoji: '💥' },
  { key: 'urgency_score' as const, label: 'Urgency', emoji: '⏰' },
  { key: 'learning_score' as const, label: 'Learning', emoji: '📚' },
  { key: 'risk_score' as const, label: 'Risk Reduction', emoji: '🛡️' },
  { key: 'energy_score' as const, label: 'Energy', emoji: '⚡' },
];

// ── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [view, setView] = useState<View>('recommend');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerTask, setTimerTask] = useState('');
  const [stats, setStats] = useState({ completed: 0, snoozed: 0, archived: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', tags: '', impact_score: 3, urgency_score: 3,
    learning_score: 3, risk_score: 3, energy_score: 3, first_step: '',
  });

  const { isLoading: aiLoading, error: aiError, reasons, suggestScores, clearSuggestion } =
    useScoreSuggestion((suggested) => {
      setNewTask((prev) => ({
        ...prev,
        impact_score: suggested.impact,
        urgency_score: suggested.urgency,
        learning_score: suggested.learning,
        risk_score: suggested.risk,
        energy_score: suggested.energy,
      }));
    });

  const { logout } = useAuth();
  const navigate = useNavigate();

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    try { setTasks((await axios.get('/api/tasks')).data.tasks); } catch (e) { console.error(e); }
  }, []);
  const fetchRecommendation = useCallback(async () => {
    try { setRecommendation((await axios.get('/api/recommendation')).data.recommendation); } catch (e) { console.error(e); }
  }, []);
  const fetchStats = useCallback(async () => {
    try { setStats((await axios.get('/api/stats')).data.stats); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchTasks(); fetchRecommendation(); fetchStats(); }, [fetchTasks, fetchRecommendation, fetchStats]);

  // ── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
      toast.success('Focus session complete! Great work 🎉');
      new Audio('/notifications.mp3')?.play()?.catch(() => {});
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

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

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/tasks', newTask);
      setNewTask({ title: '', tags: '', impact_score: 3, urgency_score: 3, learning_score: 3, risk_score: 3, energy_score: 3, first_step: '' });
      clearSuggestion();
      fetchTasks(); fetchRecommendation();
      toast.success('Task added!');
      setView('recommend');
    } catch { toast.error('Failed to add task'); }
  };

  const handleAccept = () => {
    if (!recommendation) return;
    setTimerTask(recommendation.title); setTimerSeconds(25 * 60); setView('timer'); setTimerRunning(true);
    toast('Focus mode started', { description: recommendation.title });
  };

  const handleSnooze = async (duration: string) => {
    if (!recommendation) return;
    try { await axios.post('/api/snooze', { id: recommendation.id, duration }); fetchRecommendation(); toast.info('Task snoozed'); } catch { toast.error('Failed to snooze'); }
  };

  const handleComplete = async () => {
    if (!recommendation) return;
    try { await axios.post('/api/complete', { id: recommendation.id }); fetchRecommendation(); fetchTasks(); fetchStats(); toast.success('Task completed! 🎉'); } catch { toast.error('Failed to complete'); }
  };

  const handleArchive = async (id: number) => {
    try { await axios.post('/api/archive', { id }); fetchTasks(); fetchRecommendation(); fetchStats(); toast.info('Task archived'); } catch { toast.error('Failed to archive'); }
  };

  const handleEditSave = async (task: Task) => {
    try { await axios.put(`/api/tasks/${task.id}`, task); setEditTask(null); fetchTasks(); fetchRecommendation(); toast.success('Task updated'); } catch { toast.error('Failed to update'); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── Derived state ────────────────────────────────────────────────────────

  const allTags = [...new Set(tasks.flatMap((t) => t.tags.split(',').map((x) => x.trim()).filter(Boolean)))];
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = tagFilter === 'all' || t.tags.split(',').map((x) => x.trim()).includes(tagFilter);
    return matchesSearch && matchesTag;
  });

  const navItems: { key: View; label: string; icon: React.ElementType }[] = [
    { key: 'recommend', label: 'Focus', icon: Target },
    { key: 'add', label: 'Add', icon: Plus },
    { key: 'list', label: 'Tasks', icon: ListTodo },
    { key: 'history', label: 'History', icon: History },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Target className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-base font-bold tracking-tight">Decision Prioritiser</h1>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setReviewOpen(true)}>
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Weekly Review</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => { logout(); navigate('/login'); toast.info('Logged out'); }}
            >
              <LogOut className="h-4 w-4 mr-1.5" /> Log Out
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab bar */}
        <Tabs value={view} onValueChange={(v) => setView(v as View)} className="mb-6">
          <TabsList className="w-full">
            {navItems.map((item) => (
              <TabsTrigger key={item.key} value={item.key} className="flex-1 gap-1.5">
                <item.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.key === 'list' && <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">{tasks.length}</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* ─── Recommendation ─── */}
        {view === 'recommend' && (
          <div key="recommend" className="animate-view-in">
          <Card>
            <CardHeader>
              <CardTitle>What Should I Do Next?</CardTitle>
              <CardDescription>Your algorithm-ranked top priority based on your custom weights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendation ? (
                <>
                  <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-5 space-y-2">
                      <h3 className="text-base font-semibold">{recommendation.title}</h3>
                      {recommendation.tags && (
                        <div className="flex flex-wrap gap-1.5">
                          {recommendation.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground"><strong>Because:</strong> {recommendation.reason}</p>
                      {recommendation.first_step && <p className="text-sm text-muted-foreground"><strong>Start with:</strong> {recommendation.first_step}</p>}
                    </CardContent>
                  </Card>

                  {recommendation.breakdown && <ScoreBreakdown breakdown={recommendation.breakdown} totalScore={recommendation.totalScore} />}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={handleAccept} className="gap-1.5"><Play className="h-3.5 w-3.5" /> Start (25 min)</Button>
                    <Button variant="outline" onClick={() => setSnoozeOpen(true)} className="gap-1.5"><Moon className="h-3.5 w-3.5" /> Snooze</Button>
                    <Button variant="secondary" onClick={handleComplete} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</Button>
                  </div>
                </>
              ) : (
                <EmptyState icon={<Target className="h-10 w-10 text-muted-foreground" />} title="No tasks to recommend"
                  description="Add some tasks and I'll tell you what to focus on first." actionLabel="Add a Task" onAction={() => setView('add')} />
              )}

              <Separator />
              <div>
                <h3 className="text-sm font-medium text-foreground/70 mb-2">This Week</h3>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {stats.completed}</span>
                  <span className="flex items-center gap-1.5"><AlarmClock className="h-3.5 w-3.5 text-amber-500" /> {stats.snoozed}</span>
                  <span className="flex items-center gap-1.5"><Archive className="h-3.5 w-3.5 text-blue-500" /> {stats.archived}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* ─── Add Task ─── */}
        {view === 'add' && (
          <div key="add" className="animate-view-in">
          <Card>
            <CardHeader>
              <CardTitle>Add New Task</CardTitle>
              <CardDescription>Define what needs doing and rate it across five dimensions.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTask} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Task Title</Label>
                  <Input id="task-title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required autoFocus />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-tags">Tags (comma-separated)</Label>
                  <Input id="task-tags" value={newTask.tags} onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })} placeholder="work, learning, urgent" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-step">First Step (25-min starter)</Label>
                  <Input id="task-step" value={newTask.first_step} onChange={(e) => setNewTask({ ...newTask, first_step: e.target.value })} placeholder="What can you do in 25 minutes?" />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!newTask.title.trim() || aiLoading}
                    onClick={() => suggestScores(newTask.title, newTask.first_step)}
                    className="w-full border-dashed"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analysing your task...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Suggest Scores with AI
                      </>
                    )}
                  </Button>

                  {aiError && (
                    <p className="text-xs text-destructive text-center">{aiError}</p>
                  )}

                  {reasons && !aiError && (
                    <p className="text-xs text-muted-foreground text-center">
                      Scores suggested — review and adjust as needed
                    </p>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  {scoreDimensions.map((dim) => {
                    const dimKey = dim.key.replace('_score', '') as 'impact' | 'urgency' | 'learning' | 'risk' | 'energy';
                    return (
                      <div key={dim.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1.5"><span>{dim.emoji}</span> {dim.label}</Label>
                          <Badge variant="secondary" className="font-mono">{newTask[dim.key]}</Badge>
                        </div>
                        <Slider min={1} max={5} step={1} value={[newTask[dim.key]]} onValueChange={([v]) => setNewTask({ ...newTask, [dim.key]: v })} />
                        {reasons?.[dimKey] && (
                          <p className="text-xs text-muted-foreground italic pl-1">
                            {reasons[dimKey]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button type="submit" className="w-full gap-1.5"><Plus className="h-4 w-4" /> Add Task</Button>
              </form>
            </CardContent>
          </Card>
          </div>
        )}

        {/* ─── My Tasks ─── */}
        {view === 'list' && (
          <div key="list" className="animate-view-in">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5" /> My Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks…" className="pl-9" />
                </div>
                {allTags.length > 0 && (
                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Tags" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={tasks.length === 0 ? <ListTodo className="h-10 w-10 text-muted-foreground" /> : <Search className="h-10 w-10 text-muted-foreground" />}
                  title={tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
                  description={tasks.length === 0 ? 'Add your first task to get started.' : 'Try adjusting your search or filter.'}
                  actionLabel={tasks.length === 0 ? 'Add a Task' : undefined}
                  onAction={tasks.length === 0 ? () => setView('add') : undefined}
                />
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="flex items-start justify-between p-3.5 rounded-lg border hover:bg-accent/50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{task.title}</h3>
                        {task.tags && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {task.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs gap-1"><Zap className="h-3 w-3" /> {task.impact_score}</Badge>
                          <Badge variant="secondary" className="text-xs gap-1"><Clock className="h-3 w-3" /> {task.energy_score}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTask(task)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleArchive(task.id)}><Archive className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>Archive</TooltipContent></Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* ─── History ─── */}
        {view === 'history' && <div key="history" className="animate-view-in"><HistoryView /></div>}

        {/* ─── Settings ─── */}
        {view === 'settings' && <div key="settings" className="animate-view-in"><SettingsView onWeightsUpdated={fetchRecommendation} /></div>}

        {/* ─── Timer ─── */}
        {view === 'timer' && (
          <div key="timer" className="animate-view-in">
          <Card>
            <CardHeader>
              <CardTitle>Focus Timer</CardTitle>
              <CardDescription>{timerTask}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <div className="text-7xl font-bold font-mono tabular-nums mb-8">{formatTime(timerSeconds)}</div>
                <div className="flex gap-3 justify-center">
                  <Button size="lg" onClick={() => setTimerRunning(!timerRunning)} className="gap-2 min-w-[120px]">
                    {timerRunning ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Start</>}
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => { setTimerSeconds(25 * 60); setTimerRunning(false); }} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
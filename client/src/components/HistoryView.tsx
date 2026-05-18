import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EmptyState from './EmptyState';

interface HistoryTask {
  id: number;
  title: string;
  tags: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  impact_score: number;
  urgency_score: number;
  learning_score: number;
  risk_score: number;
  energy_score: number;
}

export default function HistoryView() {
  const [tasks, setTasks] = useState<HistoryTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'archived'>('all');

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get('/api/tasks/history');
      setTasks(res.data.tasks);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filtered = tasks.filter((t) => filter === 'all' || t.status === filter);

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h2 className="text-lg font-semibold text-foreground">Task History</h2>
          </div>
          <span className="text-xs text-muted-foreground bg-accent px-2.5 py-1 rounded-full">
            {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 p-1 bg-accent/50 rounded-xl mb-5">
          {(['all', 'completed', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-all ${
                filter === f
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? '🗂️ All' : f === 'completed' ? '✅ Completed' : '📁 Archived'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No history yet"
            description="Tasks you complete or archive will appear here as a record of your progress."
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-border hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {task.status === 'completed' ? '✅' : '📁'}
                      </span>
                      <h3 className="text-sm font-medium text-foreground truncate">{task.title}</h3>
                    </div>
                    {task.tags && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {task.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs rounded-full bg-accent text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                      task.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {task.status}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(task.completed_at || task.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

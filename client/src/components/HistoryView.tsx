import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from './EmptyState';
import { Inbox, CheckCircle2, Archive } from 'lucide-react';

interface HistoryTask {
  id: number;
  title: string;
  tags: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export default function HistoryView() {
  const [tasks, setTasks] = useState<HistoryTask[]>([]);
  const [filter, setFilter] = useState('all');

  const fetchHistory = useCallback(async () => {
    try { const res = await axios.get('/api/tasks/history'); setTasks(res.data.tasks); } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = tasks.filter((t) => filter === 'all' || t.status === filter);

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Task History
          </CardTitle>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 gap-1.5"><Inbox className="h-3.5 w-3.5" /> All</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Completed</TabsTrigger>
            <TabsTrigger value="archived" className="flex-1 gap-1.5"><Archive className="h-3.5 w-3.5" /> Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        {filtered.length === 0 ? (
          <EmptyState icon={<Inbox className="h-10 w-10 text-muted-foreground" />} title="No history yet"
            description="Tasks you complete or archive will appear here as a record of your progress." />
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => (
              <div key={task.id} className="flex items-start justify-between p-3.5 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {task.status === 'completed'
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      : <Archive className="h-4 w-4 text-amber-500 shrink-0" />}
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  {task.tags && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                      {task.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs font-normal">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right ml-3 shrink-0">
                  <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="text-xs capitalize">
                    {task.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">{formatDate(task.completed_at || task.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

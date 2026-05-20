import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface WeeklyReviewData {
  thisWeekCompleted: number;
  lastWeekCompleted: number;
  dimensionAverages: { impact: number; urgency: number; learning: number; risk: number; energy: number; };
  currentWeights: { impact_weight: number; urgency_weight: number; learning_weight: number; risk_weight: number; energy_weight: number; };
}

interface WeeklyReviewModalProps { isOpen: boolean; onClose: () => void; }

const dimensions = [
  { key: 'impact' as const, label: 'Impact', emoji: '💥' },
  { key: 'urgency' as const, label: 'Urgency', emoji: '⏰' },
  { key: 'learning' as const, label: 'Learning', emoji: '📚' },
  { key: 'risk' as const, label: 'Risk', emoji: '🛡️' },
  { key: 'energy' as const, label: 'Energy', emoji: '⚡' },
];

export default function WeeklyReviewModal({ isOpen, onClose }: WeeklyReviewModalProps) {
  const [data, setData] = useState<WeeklyReviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReview = useCallback(async () => {
    setLoading(true);
    try { const res = await axios.get('/api/stats/review'); setData(res.data.review); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isOpen) fetchReview(); }, [isOpen, fetchReview]);

  const weekDelta = data ? data.thisWeekCompleted - data.lastWeekCompleted : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Weekly Review
          </DialogTitle>
          <DialogDescription>Your productivity snapshot for this week.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
        ) : data ? (
          <div className="space-y-5 pt-2">
            {/* Completion comparison */}
            <div className="grid grid-cols-2 gap-3">
              <Card><CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{data.thisWeekCompleted}</div>
                <div className="text-xs text-muted-foreground mt-1">This Week</div>
              </CardContent></Card>
              <Card><CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{data.lastWeekCompleted}</div>
                <div className="text-xs text-muted-foreground mt-1">Last Week</div>
              </CardContent></Card>
            </div>

            <div className={`flex items-center justify-center gap-2 text-sm font-medium p-3 rounded-lg ${
              weekDelta > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : weekDelta < 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'bg-accent text-muted-foreground'
            }`}>
              {weekDelta > 0 ? <TrendingUp className="h-4 w-4" />
               : weekDelta < 0 ? <TrendingDown className="h-4 w-4" />
               : <Minus className="h-4 w-4" />}
              {weekDelta > 0 ? `${weekDelta} more completed than last week!`
               : weekDelta < 0 ? `${Math.abs(weekDelta)} fewer than last week`
               : 'Same pace — keep it steady!'}
            </div>

            {/* Dimension averages */}
            {data.thisWeekCompleted > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Avg Scores of Completed Tasks
                </h4>
                {dimensions.map((dim) => {
                  const avg = data.dimensionAverages[dim.key];
                  return (
                    <div key={dim.key} className="flex items-center gap-3">
                      <span className="text-sm">{dim.emoji}</span>
                      <span className="text-xs font-medium text-foreground/70 w-16">{dim.label}</span>
                      <Progress value={(avg / 5) * 100} className="h-2 flex-1" />
                      <Badge variant="outline" className="text-xs font-mono">{avg}</Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Insight */}
            <Card className="bg-primary/5 border-primary/10">
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold text-foreground/70 mb-2">💡 Insight</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {data.thisWeekCompleted > 0
                    ? (() => {
                        const entries = Object.entries(data.dimensionAverages) as [string, number][];
                        const highest = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
                        return `Your completed tasks scored highest on ${highest[0]} (avg ${highest[1]}). Consider adjusting your weights in Settings if this doesn't match your priorities.`;
                      })()
                    : 'Complete some tasks this week to see insights about your work patterns.'}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface WeeklyReviewData {
  thisWeekCompleted: number;
  lastWeekCompleted: number;
  dimensionAverages: {
    impact: number;
    urgency: number;
    learning: number;
    risk: number;
    energy: number;
  };
  currentWeights: {
    impact_weight: number;
    urgency_weight: number;
    learning_weight: number;
    risk_weight: number;
    energy_weight: number;
  };
}

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WeeklyReviewModal({ isOpen, onClose }: WeeklyReviewModalProps) {
  const [data, setData] = useState<WeeklyReviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/stats/review');
      setData(res.data.review);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchReview();
  }, [isOpen, fetchReview]);

  if (!isOpen) return null;

  const weekDelta = data
    ? data.thisWeekCompleted - data.lastWeekCompleted
    : 0;

  const dimensions = [
    { key: 'impact', label: 'Impact', emoji: '💥' },
    { key: 'urgency', label: 'Urgency', emoji: '⏰' },
    { key: 'learning', label: 'Learning', emoji: '📚' },
    { key: 'risk', label: 'Risk', emoji: '🛡️' },
    { key: 'energy', label: 'Energy', emoji: '⚡' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in
                    max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-5">
          <span className="text-2xl">📊</span>
          <h3 className="text-lg font-semibold text-foreground">Weekly Review</h3>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Loading your data...</div>
        ) : data ? (
          <div className="space-y-5">
            {/* Completion comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-accent/50 border border-border text-center">
                <div className="text-3xl font-bold text-foreground">{data.thisWeekCompleted}</div>
                <div className="text-xs text-muted-foreground mt-1">This Week</div>
              </div>
              <div className="p-4 rounded-xl bg-accent/50 border border-border text-center">
                <div className="text-3xl font-bold text-foreground">{data.lastWeekCompleted}</div>
                <div className="text-xs text-muted-foreground mt-1">Last Week</div>
              </div>
            </div>

            <div className={`text-center text-sm font-medium p-2.5 rounded-lg ${
              weekDelta > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : weekDelta < 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'bg-accent text-muted-foreground'
            }`}>
              {weekDelta > 0
                ? `🎉 ${weekDelta} more task${weekDelta > 1 ? 's' : ''} completed than last week!`
                : weekDelta < 0
                ? `${Math.abs(weekDelta)} fewer task${Math.abs(weekDelta) > 1 ? 's' : ''} than last week`
                : 'Same pace as last week — keep it steady!'}
            </div>

            {/* Dimension averages */}
            {data.thisWeekCompleted > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Avg Scores of Completed Tasks
                </h4>
                <div className="space-y-2.5">
                  {dimensions.map((dim) => {
                    const avg = data.dimensionAverages[dim.key];
                    return (
                      <div key={dim.key} className="flex items-center gap-3">
                        <span className="text-sm">{dim.emoji}</span>
                        <span className="text-xs font-medium text-foreground/70 w-16">{dim.label}</span>
                        <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${(avg / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-foreground/60 w-6 text-right">{avg}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weight insight */}
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10">
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
            </div>
          </div>
        ) : null}

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 text-sm font-medium rounded-xl border border-border
                     text-muted-foreground hover:bg-accent transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

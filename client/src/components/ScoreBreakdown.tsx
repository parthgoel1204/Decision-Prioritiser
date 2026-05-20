import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface BreakdownItem {
  score: number;
  weight: number;
  contribution: number;
}

interface ScoreBreakdownProps {
  breakdown: {
    impact: BreakdownItem;
    urgency: BreakdownItem;
    learning: BreakdownItem;
    risk: BreakdownItem;
    energy: BreakdownItem;
  };
  totalScore: number;
}

const dimensionConfig = [
  { key: 'impact' as const, label: 'Impact', emoji: '💥' },
  { key: 'urgency' as const, label: 'Urgency', emoji: '⏰' },
  { key: 'learning' as const, label: 'Learning', emoji: '📚' },
  { key: 'risk' as const, label: 'Risk', emoji: '🛡️' },
  { key: 'energy' as const, label: 'Energy', emoji: '⚡' },
];

export default function ScoreBreakdown({ breakdown, totalScore }: ScoreBreakdownProps) {
  const maxContribution = Math.max(...Object.values(breakdown).map((b) => b.contribution));

  return (
    <div className="rounded-xl border border-border p-4 bg-card/50 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Score Breakdown
        </h4>
        <Badge variant="secondary" className="font-mono">{totalScore}</Badge>
      </div>

      <div className="space-y-3">
        {dimensionConfig.map((dim) => {
          const item = breakdown[dim.key];
          const barValue = maxContribution > 0 ? (item.contribution / maxContribution) * 100 : 0;

          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-foreground/70 flex items-center gap-1.5">
                  <span>{dim.emoji}</span> {dim.label}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Score: {item.score}</span>
                  <span className="opacity-40">·</span>
                  <span>Weight: {item.weight}%</span>
                </div>
              </div>
              <Progress value={barValue} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

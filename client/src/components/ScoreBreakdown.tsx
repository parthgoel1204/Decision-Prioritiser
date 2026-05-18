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
  { key: 'impact', label: 'Impact', color: 'bg-violet-500', track: 'bg-violet-500/15' },
  { key: 'urgency', label: 'Urgency', color: 'bg-rose-500', track: 'bg-rose-500/15' },
  { key: 'learning', label: 'Learning', color: 'bg-sky-500', track: 'bg-sky-500/15' },
  { key: 'risk', label: 'Risk', color: 'bg-amber-500', track: 'bg-amber-500/15' },
  { key: 'energy', label: 'Energy', color: 'bg-emerald-500', track: 'bg-emerald-500/15' },
] as const;

export default function ScoreBreakdown({ breakdown, totalScore }: ScoreBreakdownProps) {
  const maxContribution = Math.max(
    ...Object.values(breakdown).map((b) => b.contribution)
  );

  return (
    <div className="rounded-xl border border-border p-4 bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Score Breakdown
        </h4>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Total:</span>
          <span className="text-sm font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-md">
            {totalScore}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {dimensionConfig.map((dim) => {
          const item = breakdown[dim.key];
          const barWidth = maxContribution > 0 ? (item.contribution / maxContribution) * 100 : 0;

          return (
            <div key={dim.key} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground/70">{dim.label}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Score: {item.score}</span>
                  <span className="opacity-50">·</span>
                  <span>Weight: {item.weight}%</span>
                </div>
              </div>
              <div className={`h-2 rounded-full ${dim.track} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${dim.color} transition-all duration-700 ease-out`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

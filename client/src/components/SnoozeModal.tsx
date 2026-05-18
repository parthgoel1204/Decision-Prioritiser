interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (duration: string) => void;
}

const snoozeOptions = [
  { key: '30m', label: '30 Minutes', icon: '⏱️', description: 'Quick break, come back soon' },
  { key: '2h', label: '2 Hours', icon: '☕', description: 'After a deep work session' },
  { key: 'tomorrow', label: 'Tomorrow', icon: '🌅', description: 'Fresh start at 9 AM' },
  { key: 'nextweek', label: 'Next Week', icon: '📅', description: 'Monday morning at 9 AM' },
];

export default function SnoozeModal({ isOpen, onClose, onSnooze }: SnoozeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-1">Snooze Task</h3>
        <p className="text-sm text-muted-foreground mb-5">When should this task come back?</p>

        <div className="space-y-2.5">
          {snoozeOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                onSnooze(opt.key);
                onClose();
              }}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border
                         hover:bg-accent hover:border-primary/20 transition-all duration-200
                         group active:scale-[0.98]"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{opt.icon}</span>
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">{opt.label}</div>
                <div className="text-xs text-muted-foreground">{opt.description}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 text-sm text-muted-foreground hover:text-foreground
                     transition-colors rounded-lg hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

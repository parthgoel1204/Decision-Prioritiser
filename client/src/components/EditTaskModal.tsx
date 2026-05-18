import { useState, useEffect } from 'react';

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

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

function ScoreSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-green-500'];

  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-xs font-medium text-foreground/70">{label}</label>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${colors[value]} text-white`}>{value}</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  );
}

export default function EditTaskModal({ task, isOpen, onClose, onSave }: EditTaskModalProps) {
  const [form, setForm] = useState<Task>({
    id: 0,
    title: '',
    tags: '',
    impact_score: 3,
    urgency_score: 3,
    learning_score: 3,
    risk_score: 3,
    energy_score: 3,
    first_step: '',
  });

  useEffect(() => {
    if (task) {
      setForm({ ...task });
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in
                    max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-5">Edit Task</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition-all"
              placeholder="work, learning, urgent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">First Step</label>
            <input
              type="text"
              value={form.first_step}
              onChange={(e) => setForm({ ...form, first_step: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition-all"
              placeholder="What can you do in 25 minutes?"
            />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
            <ScoreSlider label="Impact" value={form.impact_score} onChange={(v) => setForm({ ...form, impact_score: v })} />
            <ScoreSlider label="Urgency" value={form.urgency_score} onChange={(v) => setForm({ ...form, urgency_score: v })} />
            <ScoreSlider label="Learning" value={form.learning_score} onChange={(v) => setForm({ ...form, learning_score: v })} />
            <ScoreSlider label="Risk Reduction" value={form.risk_score} onChange={(v) => setForm({ ...form, risk_score: v })} />
            <ScoreSlider label="Energy" value={form.energy_score} onChange={(v) => setForm({ ...form, energy_score: v })} />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-border
                         text-muted-foreground hover:bg-accent transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground
                         hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/25
                         active:scale-[0.97]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

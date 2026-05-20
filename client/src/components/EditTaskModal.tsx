import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

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

const scoreDimensions = [
  { key: 'impact_score' as const, label: 'Impact', emoji: '💥' },
  { key: 'urgency_score' as const, label: 'Urgency', emoji: '⏰' },
  { key: 'learning_score' as const, label: 'Learning', emoji: '📚' },
  { key: 'risk_score' as const, label: 'Risk Reduction', emoji: '🛡️' },
  { key: 'energy_score' as const, label: 'Energy', emoji: '⚡' },
];

export default function EditTaskModal({ task, isOpen, onClose, onSave }: EditTaskModalProps) {
  const [form, setForm] = useState<Task>({
    id: 0, title: '', tags: '', impact_score: 3, urgency_score: 3,
    learning_score: 3, risk_score: 3, energy_score: 3, first_step: '',
  });

  useEffect(() => {
    if (task) setForm({ ...task });
  }, [task]);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update the details and scores for this task.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <Input id="edit-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="work, learning, urgent" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-step">First Step</Label>
            <Input id="edit-step" value={form.first_step} onChange={(e) => setForm({ ...form, first_step: e.target.value })} placeholder="What can you do in 25 minutes?" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2">
            {scoreDimensions.map((dim) => (
              <div key={dim.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <span>{dim.emoji}</span> {dim.label}
                  </Label>
                  <span className="text-xs font-bold text-muted-foreground bg-accent px-2 py-0.5 rounded">
                    {form[dim.key]}
                  </span>
                </div>
                <Slider
                  min={1} max={5} step={1}
                  value={[form[dim.key]]}
                  onValueChange={([v]) => setForm({ ...form, [dim.key]: v })}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Coffee, Sunrise, CalendarDays } from 'lucide-react';

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (duration: string) => void;
}

const snoozeOptions = [
  { key: '30m', label: '30 Minutes', icon: Clock, description: 'Quick break, come back soon' },
  { key: '2h', label: '2 Hours', icon: Coffee, description: 'After a deep work session' },
  { key: 'tomorrow', label: 'Tomorrow', icon: Sunrise, description: 'Fresh start at 9 AM' },
  { key: 'nextweek', label: 'Next Week', icon: CalendarDays, description: 'Monday morning at 9 AM' },
];

export default function SnoozeModal({ isOpen, onClose, onSnooze }: SnoozeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Snooze Task</DialogTitle>
          <DialogDescription>When should this task come back?</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {snoozeOptions.map((opt) => (
            <Button
              key={opt.key}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4 gap-3"
              onClick={() => {
                onSnooze(opt.key);
                onClose();
              }}
            >
              <opt.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="text-left">
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground font-normal">{opt.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

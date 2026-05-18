interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="text-5xl mb-4 animate-bounce-slow">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground/80 mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium
                     hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25
                     active:scale-[0.97]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

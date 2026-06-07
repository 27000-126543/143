interface StatusBadgeProps {
  status: string;
  label?: string;
  color: string;
  pulse?: boolean;
}

export default function StatusBadge({ status, label, color, pulse = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${pulse ? 'animate-pulse' : ''}`}
      style={{
        backgroundColor: color + '20',
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label || status}
    </span>
  );
}

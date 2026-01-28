interface PerformanceBadgeProps {
  ramRequired: number;
  ramAvailable: number;
  size?: 'sm' | 'md';
}

export function PerformanceBadge({ ramRequired, ramAvailable, size = 'md' }: PerformanceBadgeProps) {
  const ratio = ramAvailable / ramRequired;
  
  let badge: { text: string; color: string };
  
  if (ratio >= 1.5) {
    badge = { text: 'FAST', color: 'bg-[#1f6d5a]/10 text-[#1f6d5a] border-[#1f6d5a]/30' };
  } else if (ratio >= 1.0) {
    badge = { text: 'OK', color: 'bg-[#b07b2c]/10 text-[#b07b2c] border-[#b07b2c]/30' };
  } else {
    badge = { text: 'RISK', color: 'bg-red-500/10 text-red-600 border-red-500/30' };
  }

  const sizeClasses = size === 'sm' ? 'text-sm px-2 py-0.5' : 'text-base px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-semibold rounded border ${badge.color} ${sizeClasses}`}>
      {badge.text}
    </span>
  );
}

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
}

export function Toggle({ enabled, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {label && <span className="text-base font-medium text-[#2d2a23]">{label}</span>}
        {description && <p className="text-sm text-[#6f6757] mt-1">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
          enabled ? 'bg-[#1f6d5a] border-[#1f6d5a]' : 'bg-[#e7e0cf] border-[rgba(45,42,35,0.25)]'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

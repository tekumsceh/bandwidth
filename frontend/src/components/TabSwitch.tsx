type Option<T extends string | number> = {
  value: T;
  label: string;
  badge?: string | number;
};

type Props<T extends string | number> = {
  value: T;
  onChange: (next: T) => void;
  options: Option<T>[];
  className?: string;
};

function TabSwitch<T extends string | number>({ value, onChange, options, className }: Props<T>) {
  return (
    <div className={className || 'tabs'} style={{ marginBottom: className ? undefined : '0.75rem' }}>
      {options.map((opt) => (
        <button
          key={`${opt.value}`}
          type="button"
          className={`tab-button btn-filter ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          {opt.badge != null && (
            <span className="badge badge-warning" style={{ marginLeft: '0.4rem', fontSize: '0.65rem' }}>
              {opt.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default TabSwitch;


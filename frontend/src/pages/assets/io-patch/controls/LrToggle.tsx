type LrToggleProps = {
  value: 'L' | 'R' | '';
  onChange: (side: 'L' | 'R') => void;
};

export function LrToggle({ value, onChange }: LrToggleProps) {
  return (
    <div className="io-patch-lr-toggle">
      <button
        type="button"
        className={`io-patch-lr-btn ${value === 'L' ? 'on' : ''}`}
        onClick={() => onChange('L')}
        title="Left channel"
      >
        L
      </button>
      <button
        type="button"
        className={`io-patch-lr-btn ${value === 'R' ? 'on' : ''}`}
        onClick={() => onChange('R')}
        title="Right channel"
      >
        R
      </button>
    </div>
  );
}

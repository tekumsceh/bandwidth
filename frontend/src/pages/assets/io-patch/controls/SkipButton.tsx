type SkipButtonProps = {
  skipped: boolean;
  onChange: (skipped: boolean) => void;
};

export function SkipButton({ skipped, onChange }: SkipButtonProps) {
  return (
    <button
      type="button"
      className={`io-patch-skip-btn ${skipped ? 'on' : 'off'}`}
      onClick={() => onChange(!skipped)}
      title={skipped ? 'Channel skipped' : 'Skip channel'}
    >
      Skip
    </button>
  );
}

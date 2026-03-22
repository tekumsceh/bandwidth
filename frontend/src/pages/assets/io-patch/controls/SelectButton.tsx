import type { ReactNode } from 'react';
import { usePopupSide } from '../../ioPatchHooks';

type SelectButtonProps = {
  ch: number;
  popupKey: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  placeholder?: string;
  dropdownClassName?: string;
  optionIcons?: Record<string, ReactNode>;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

export function SelectButton({ ch, popupKey, value, options, onChange, icon, placeholder, dropdownClassName, optionIcons, openPopupId, setOpenPopupId }: SelectButtonProps) {
  const isOpen = openPopupId === popupKey;
  const openRight = usePopupSide(ch);
  const displayValue = (value === '—' || value === '') && placeholder ? placeholder : value;

  return (
    <div className="io-patch-select-wrap">
      <button
        type="button"
        className={`io-patch-select-btn ${icon ? 'has-icon' : ''}`}
        onClick={() => setOpenPopupId(isOpen ? null : popupKey)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-io-patch-trigger
      >
        {icon && <span className="io-patch-select-icon">{icon}</span>}
        {displayValue}
      </button>
      {isOpen && (
        <>
          <div className="io-patch-select-backdrop" aria-hidden="true" />
          <div
            className={`io-patch-select-dropdown ${dropdownClassName ?? ''} ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`}
            data-io-patch-popup
            role="listbox"
            aria-label="Select option"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                role="option"
                aria-selected={opt === value}
                className={`io-patch-select-opt ${opt === value ? 'active' : ''} ${optionIcons?.[opt] ? 'has-icon' : ''}`}
                onClick={() => {
                  onChange(opt);
                  setOpenPopupId(null);
                }}
              >
                {optionIcons?.[opt] && (
                  <span className="io-patch-select-opt-icon">{optionIcons[opt]}</span>
                )}
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

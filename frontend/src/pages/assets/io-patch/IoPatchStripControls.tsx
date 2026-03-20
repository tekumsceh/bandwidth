import { useEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Link as LinkIcon, Search } from 'lucide-react';
import { fuzzyMatch } from '../../../utils/fuzzyMatch';
import { CHANNEL_COLORS } from '../ioPatchConstants';
import { usePopupSide } from '../ioPatchHooks';
import { getInstruments, getInstrument } from '../instrumentIcons';
import { IemIcon, WedgeIcon } from './IoPatchIcons';

type OutputTypeNameProps = {
  value: string;
};

export function OutputTypeName({ value }: OutputTypeNameProps) {
  return (
    <div className="io-patch-instrument-name" title={value === 'Wedge' ? 'Wedge monitor' : value === 'IEM' ? 'IEM body pack' : ''}>
      {value || '—'}
    </div>
  );
}

type WedgeIemSelectorProps = {
  ch: number;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

export function WedgeIemSelector({ ch, value, onChange, onClear, openPopupId, setOpenPopupId }: WedgeIemSelectorProps) {
  const popupId = `wedge-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);

  return (
    <div className="io-patch-instrument-wrap">
      <button
        type="button"
        className="io-patch-instrument-btn"
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={value ? (value === 'Wedge' ? 'Wedge monitor' : 'IEM body pack') : 'Select type'}
        data-io-patch-trigger
      >
        {value === 'IEM' ? (
          <IemIcon size={22} />
        ) : value === 'Wedge' ? (
          <WedgeIcon size={22} />
        ) : (
          <span className="io-patch-instrument-placeholder">src</span>
        )}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-instrument-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-instrument-picker io-patch-wedge-iem-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-instrument-clear"
              onClick={() => {
                onClear();
                setOpenPopupId(null);
              }}
              title="Clear"
            >
              ✕
            </button>
            <button
              type="button"
              className={`io-patch-instrument-swatch ${value === 'Wedge' ? 'active' : ''}`}
              onClick={() => {
                onChange('Wedge');
                setOpenPopupId(null);
              }}
              title="Wedge monitor"
            >
              <WedgeIcon size={40} />
            </button>
            <button
              type="button"
              className={`io-patch-instrument-swatch ${value === 'IEM' ? 'active' : ''}`}
              onClick={() => {
                onChange('IEM');
                setOpenPopupId(null);
              }}
              title="IEM body pack"
            >
              <IemIcon size={40} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type InstrumentNameEditableProps = {
  value?: string;
  label?: string;
  onLabelChange: (label: string) => void;
};

export function InstrumentNameEditable({ value, label, onLabelChange }: InstrumentNameEditableProps) {
  const inst = getInstrument(value);
  const displayText = (label !== undefined && label !== '' ? label : inst?.shortLabel) ?? '—';
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const startEdit = () => {
    setEditText(displayText === '—' ? '' : displayText);
    setCursorPos(displayText === '—' ? 0 : displayText.length);
    setEditing(true);
    queueMicrotask(() => boxRef.current?.focus());
  };

  const commitEdit = () => {
    setEditing(false);
    onLabelChange(editText.trim());
  };

  useEffect(() => {
    if (editing) return;
    setEditText(displayText === '—' ? '' : displayText);
    setCursorPos(displayText === '—' ? 0 : displayText.length);
  }, [editing, displayText]);

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
      setEditText(displayText === '—' ? '' : displayText);
      setCursorPos(displayText === '—' ? 0 : displayText.length);
      return;
    }
    e.preventDefault();
    if (e.key === 'Backspace') {
      if (cursorPos > 0) {
        const next = editText.slice(0, cursorPos - 1) + editText.slice(cursorPos);
        setEditText(next);
        setCursorPos(cursorPos - 1);
      }
      return;
    }
    if (e.key === 'Delete') {
      if (cursorPos < editText.length) {
        const next = editText.slice(0, cursorPos) + editText.slice(cursorPos + 1);
        setEditText(next);
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      setCursorPos((p) => Math.max(0, p - 1));
      return;
    }
    if (e.key === 'ArrowRight') {
      setCursorPos((p) => Math.min(editText.length, p + 1));
      return;
    }
    if (e.key === 'Home') {
      setCursorPos(0);
      return;
    }
    if (e.key === 'End') {
      setCursorPos(editText.length);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const next = editText.slice(0, cursorPos) + e.key + editText.slice(cursorPos);
      setEditText(next);
      setCursorPos(cursorPos + 1);
    }
  };

  const handlePaste = (e: ReactClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = (e.clipboardData?.getData('text/plain') ?? '').replace(/\r?\n/g, ' ');
    const next = editText.slice(0, cursorPos) + text + editText.slice(cursorPos);
    setEditText(next);
    setCursorPos(cursorPos + text.length);
  };

  if (!editing) {
    return (
      <div
        className="io-patch-instrument-name io-patch-instrument-name-editable"
        onClick={startEdit}
        title={inst?.label}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            startEdit();
          }
        }}
      >
        {displayText || '\u200b'}
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className="io-patch-instrument-name io-patch-instrument-name-edit"
      role="textbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onBlur={commitEdit}
    >
      <span className="io-patch-instrument-name-text">{editText.slice(0, cursorPos)}</span>
      <span className="io-patch-mic-search-cursor" aria-hidden />
      <span className="io-patch-instrument-name-text">{editText.slice(cursorPos)}</span>
    </div>
  );
}

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

type LinkButtonProps = {
  ch: number;
  linkedCh: number | undefined;
  onLink: (targetCh: number) => void;
  onUnlink: () => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

export function LinkButton({ ch, linkedCh, onLink, onUnlink, openPopupId, setOpenPopupId }: LinkButtonProps) {
  const popupId = `link-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);
  const isLinked = linkedCh !== undefined;

  return (
    <div className="io-patch-link-wrap">
      <button
        type="button"
        className={`io-patch-link-btn ${isLinked ? 'linked' : ''}`}
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={isLinked ? `Linked to channel ${String(linkedCh + 1).padStart(2, '0')}` : 'Link channel'}
        data-io-patch-trigger
      >
        <LinkIcon size={16} strokeWidth={2} />
        {isLinked && <span className="io-patch-link-num">{String(linkedCh + 1).padStart(2, '0')}</span>}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-link-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-link-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            {isLinked ? (
              <button
                type="button"
                className="io-patch-link-unlink"
                onClick={() => {
                  onUnlink();
                  setOpenPopupId(null);
                }}
              >
                Unlink
              </button>
            ) : (
              <div className="io-patch-link-channel-grid">
                {Array.from({ length: 32 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`io-patch-link-channel-btn ${i === ch ? 'self' : ''}`}
                    onClick={() => {
                      if (i !== ch) {
                        onLink(i);
                        setOpenPopupId(null);
                      }
                    }}
                    disabled={i === ch}
                    title={i === ch ? 'Same channel' : `Link to channel ${String(i + 1).padStart(2, '0')}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

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

type InstrumentButtonProps = {
  ch: number;
  value?: string;
  onChange: (id: string) => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

export function InstrumentButton({ ch, value, onChange, openPopupId, setOpenPopupId }: InstrumentButtonProps) {
  const popupId = `instrument-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);
  const inst = getInstrument(value);
  const Icon = inst?.Icon;

  return (
    <div className="io-patch-instrument-wrap">
      <button
        type="button"
        className="io-patch-instrument-btn"
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        title={inst?.label ?? 'Select instrument'}
        data-io-patch-trigger
      >
        {Icon ? <Icon size={22} /> : <span className="io-patch-instrument-placeholder">src</span>}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-instrument-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-instrument-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-instrument-clear"
              onClick={() => {
                onChange('');
                setOpenPopupId(null);
              }}
              title="Clear"
            >
              ✕
            </button>
            {getInstruments().map((i) => {
              const SwatchIcon = i.Icon;
              return (
                <button
                  key={i.id}
                  type="button"
                  className={`io-patch-instrument-swatch ${value === i.id ? 'active' : ''}`}
                  onClick={() => {
                    onChange(i.id);
                    setOpenPopupId(null);
                  }}
                  title={i.label}
                >
                  {SwatchIcon ? <SwatchIcon size={40} /> : <span className="io-patch-instrument-swatch-text">{i.shortLabel}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

type ChannelNumProps = {
  ch: number;
  color?: string;
  onColorChange: (color: string) => void;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
  icon: ReactNode;
};

export function ChannelNum({ ch, color, onColorChange, openPopupId, setOpenPopupId, icon }: ChannelNumProps) {
  const popupId = `color-${ch}`;
  const isOpen = openPopupId === popupId;
  const openRight = usePopupSide(ch);

  return (
    <div className="io-patch-ch-num-wrap">
      <button
        type="button"
        className={`io-patch-ch-num ${color ? 'has-color' : ''}`}
        style={
          color
            ? {
                borderColor: color,
                boxShadow: `inset 0 2px 4px rgba(0, 0, 0, 0.35), inset 0 0 8px ${color}35`,
              }
            : undefined
        }
        onClick={() => setOpenPopupId(isOpen ? null : popupId)}
        data-io-patch-trigger
      >
        <span className="io-patch-ch-icon">{icon}</span>
        {String(ch + 1).padStart(2, '0')}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-color-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div className={`io-patch-color-picker ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`} data-io-patch-popup>
            <button
              type="button"
              className="io-patch-color-swatch io-patch-color-clear"
              onClick={() => {
                onColorChange('');
                setOpenPopupId(null);
              }}
              title="Clear color"
            >
              ✕
            </button>
            {CHANNEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="io-patch-color-swatch"
                style={{ backgroundColor: c }}
                onClick={() => {
                  onColorChange(color === c ? '' : c);
                  setOpenPopupId(null);
                }}
                title={c}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type MicSelectorProps = {
  ch: number;
  popupKey: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  openPopupId: string | null;
  setOpenPopupId: (id: string | null) => void;
};

export function MicSelector({ ch, popupKey, value, options, onChange, icon, openPopupId, setOpenPopupId }: MicSelectorProps) {
  const isOpen = openPopupId === popupKey;
  const openRight = usePopupSide(ch);
  const [search, setSearch] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? options.filter((opt) => fuzzyMatch(search, opt))
    : options;

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setCursorPos(0);
      setSearchExpanded(false);
      setHighlightedIdx(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchExpanded) {
      queueMicrotask(() => searchRef.current?.focus());
    }
  }, [searchExpanded]);

  useEffect(() => {
    if (!isOpen || searchExpanded) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSearchExpanded(true);
        setSearch(e.key);
        setCursorPos(1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, searchExpanded]);

  useEffect(() => {
    setHighlightedIdx(0);
  }, [search]);

  useEffect(() => {
    setCursorPos((p) => Math.min(p, search.length));
  }, [search]);

  useEffect(() => {
    if (!searchExpanded || filtered.length === 0) return;
    listRef.current?.querySelector('[data-highlighted]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedIdx, searchExpanded, filtered]);

  return (
    <div className="io-patch-select-wrap">
      <button
        type="button"
        className={`io-patch-select-btn ${value && value !== '—' ? 'has-value' : icon ? 'has-icon' : ''}`}
        onClick={() => setOpenPopupId(isOpen ? null : popupKey)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Microphone: ${value}`}
        data-io-patch-trigger
      >
        {value && value !== '—' ? (
          <span className="io-patch-select-value">{value}</span>
        ) : (
          icon && <span className="io-patch-select-icon">{icon}</span>
        )}
      </button>
      {isOpen && (
        <>
          <div
            className="io-patch-select-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
          <div
            className={`io-patch-select-dropdown io-patch-mic-dropdown ${openRight ? 'io-patch-picker-right' : 'io-patch-picker-left'}`}
            data-io-patch-popup
            role="listbox"
            aria-label="Select microphone"
          >
            <div className={`io-patch-mic-search ${searchExpanded ? 'expanded' : ''}`}>
              <button
                type="button"
                className="io-patch-mic-search-trigger"
                onClick={() => !searchExpanded && setSearchExpanded(true)}
                aria-label="Search microphones"
              >
                <Search size={16} strokeWidth={2} className="io-patch-mic-search-icon" />
              </button>
              <div
                ref={searchRef}
                className="io-patch-mic-search-box"
                role="textbox"
                tabIndex={0}
                aria-label="Search microphones"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIdx((i) => Math.min(i + 1, filtered.length - 1));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIdx((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === 'Enter' && filtered[highlightedIdx]) {
                    e.preventDefault();
                    onChange(filtered[highlightedIdx]);
                    setOpenPopupId(null);
                    return;
                  }
                  e.preventDefault();
                  if (e.key === 'Backspace') {
                    if (cursorPos > 0) {
                      const next = search.slice(0, cursorPos - 1) + search.slice(cursorPos);
                      setSearch(next);
                      setCursorPos(cursorPos - 1);
                    }
                    return;
                  }
                  if (e.key === 'Delete') {
                    if (cursorPos < search.length) {
                      const next = search.slice(0, cursorPos) + search.slice(cursorPos + 1);
                      setSearch(next);
                    }
                    return;
                  }
                  if (e.key === 'ArrowLeft') {
                    setCursorPos((p) => Math.max(0, p - 1));
                    return;
                  }
                  if (e.key === 'ArrowRight') {
                    setCursorPos((p) => Math.min(search.length, p + 1));
                    return;
                  }
                  if (e.key === 'Home') {
                    setCursorPos(0);
                    return;
                  }
                  if (e.key === 'End') {
                    setCursorPos(search.length);
                    return;
                  }
                  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    const next = search.slice(0, cursorPos) + e.key + search.slice(cursorPos);
                    setSearch(next);
                    setCursorPos(cursorPos + 1);
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const text = e.clipboardData.getData('text/plain').replace(/\r?\n/g, ' ');
                  const next = search.slice(0, cursorPos) + text + search.slice(cursorPos);
                  setSearch(next);
                  setCursorPos(cursorPos + text.length);
                }}
              >
                <span className="io-patch-mic-search-text">{search.slice(0, cursorPos)}</span>
                <span className="io-patch-mic-search-cursor" aria-hidden />
                <span className="io-patch-mic-search-text">{search.slice(cursorPos)}</span>
              </div>
            </div>
            <div className="io-patch-mic-list" ref={listRef}>
              {filtered.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={opt === value || (searchExpanded && idx === highlightedIdx)}
                  data-highlighted={searchExpanded && idx === highlightedIdx ? '' : undefined}
                  className={`io-patch-select-opt ${opt === value ? 'active' : ''} ${searchExpanded && idx === highlightedIdx ? 'highlighted' : ''}`}
                  onClick={() => {
                    onChange(opt);
                    setOpenPopupId(null);
                  }}
                >
                  {opt}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="io-patch-mic-no-results">No matches</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
          <div
            className="io-patch-select-backdrop"
            onClick={() => setOpenPopupId(null)}
            aria-hidden="true"
          />
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

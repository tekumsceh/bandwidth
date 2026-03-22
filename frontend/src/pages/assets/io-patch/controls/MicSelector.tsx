import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { fuzzyMatch } from '../../../../utils/fuzzyMatch';
import { usePopupSide } from '../../ioPatchHooks';

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
          <div className="io-patch-select-backdrop" aria-hidden="true" />
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

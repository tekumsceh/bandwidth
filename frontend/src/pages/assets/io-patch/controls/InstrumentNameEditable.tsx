import { useEffect, useRef, useState, type ClipboardEvent as ReactClipboardEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { getInstrument } from '../../instrumentIcons';

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

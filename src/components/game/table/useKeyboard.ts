import { useEffect, useRef } from 'react';

/**
 * The keys a card player reaches for without thinking.
 *
 * Undo is the one that matters — Ctrl+Z is muscle memory everywhere else, and
 * a game that ignores it feels like a web page rather than an application.
 * The rest follow the same convention Microsoft's version uses, so someone
 * switching over does not have to learn anything.
 *
 * Full keyboard play, with a cursor that moves between piles, is a larger
 * thing and not this.
 */

export interface Shortcuts {
  undo?: () => void;
  redo?: () => void;
  hint?: () => void;
  /** Deal a fresh hand. */
  newDeal?: () => void;
  /** Space: turn the stock over, or deal the next row. */
  stock?: () => void;
}

/** Typing in a field should type, not play a card. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  );
}

export function useKeyboard(shortcuts: Shortcuts): void {
  // Held in a ref so the listener is attached once rather than being torn down
  // and rebuilt on every render, which every one of these handlers would
  // otherwise cause by being a fresh closure.
  const current = useRef(shortcuts);
  current.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;

      const keys = current.current;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      let action: (() => void) | undefined;

      if (mod && key === 'z') {
        // Shift+Ctrl+Z is redo on every platform that has no Ctrl+Y.
        action = event.shiftKey ? keys.redo : keys.undo;
      } else if (mod && key === 'y') {
        action = keys.redo;
      } else if (mod) {
        // Leave every other shortcut to the browser: Ctrl+R, Ctrl+T and the
        // rest are not ours to take.
        return;
      } else if (key === 'h') {
        action = keys.hint;
      } else if (key === 'n') {
        action = keys.newDeal;
      } else if (key === ' ') {
        action = keys.stock;
      }

      if (!action) return;
      event.preventDefault();
      action();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

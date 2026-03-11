import { useEffect, useCallback } from 'react';

interface KeyboardShortcutOptions {
  onNavigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onRoute: () => void;
  onClear: () => void;
  onSearch: () => void;
  onPresetRecall: (index: number) => void;
  enabled: boolean;
}

export function useKeyboardShortcuts({
  onNavigate,
  onRoute,
  onClear,
  onSearch,
  onPresetRecall,
  enabled,
}: KeyboardShortcutOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't capture when typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          onNavigate('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          onNavigate('down');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onNavigate('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNavigate('right');
          break;
        case 'Enter':
          e.preventDefault();
          onRoute();
          break;
        case 'Escape':
          e.preventDefault();
          onClear();
          break;
        case '/':
          e.preventDefault();
          onSearch();
          break;
        default:
          // 1-9 for preset recall
          if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            onPresetRecall(parseInt(e.key) - 1);
          }
          break;
      }
    },
    [enabled, onNavigate, onRoute, onClear, onSearch, onPresetRecall],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

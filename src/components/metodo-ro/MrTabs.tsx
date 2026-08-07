import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface MrTabItem {
  id: string;
  label: string;
}

interface MrTabsProps {
  items: MrTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
  children: (activeId: string, panelId: string, tabId: string) => ReactNode;
}

/**
 * Accessible tabs (WAI-ARIA): tablist + tab + tabpanel + arrow keys.
 */
export function MrTabs({ items, activeId, onChange, label, children }: MrTabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  function tabId(id: string) {
    return `${baseId}-tab-${id}`;
  }
  function panelId(id: string) {
    return `${baseId}-panel-${id}`;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = items.findIndex((t) => t.id === activeId);
    if (idx < 0) return;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (idx + 1) % items.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (idx - 1 + items.length) % items.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      next = items.length - 1;
    } else {
      return;
    }
    onChange(items[next].id);
    const btn = listRef.current?.querySelector<HTMLButtonElement>(
      `#${CSS.escape(tabId(items[next].id))}`
    );
    btn?.focus();
  }

  return (
    <>
      <div
        ref={listRef}
        className="mr-tabs"
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={tabId(item.id)}
              aria-selected={selected}
              aria-controls={panelId(item.id)}
              tabIndex={selected ? 0 : -1}
              className={`mr-tab${selected ? ' mr-tab--active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={panelId(activeId)}
        aria-labelledby={tabId(activeId)}
        className="mr-tabpanel"
        tabIndex={0}
      >
        {children(activeId, panelId(activeId), tabId(activeId))}
      </div>
    </>
  );
}

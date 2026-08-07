import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type MouseEvent,
} from 'react';
import { MrButton } from './MrButton';

interface MrModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  /** Footer actions (buttons). If omitted, only Cerrar. */
  footer?: ReactNode;
  /** role alertdialog for destructive confirms */
  danger?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: focus trap, ESC, restore focus, body scroll lock.
 */
export function MrModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  danger,
  initialFocusRef,
}: MrModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ??
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const nodes = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onBackdrop(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="mr-modal-root"
      role="presentation"
      onMouseDown={onBackdrop}
    >
      <div
        ref={panelRef}
        className={`mr-modal${danger ? ' mr-modal--danger' : ''}`}
        role={danger ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <header className="mr-modal__header">
          <h2 id={titleId} className="mr-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="mr-modal__close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {description ? (
          <p id={descId} className="mr-modal__desc">
            {description}
          </p>
        ) : null}
        <div className="mr-modal__body">{children}</div>
        <footer className="mr-modal__footer">
          {footer ?? (
            <MrButton variant="ghost" onClick={onClose}>
              Cerrar
            </MrButton>
          )}
        </footer>
      </div>
    </div>
  );
}

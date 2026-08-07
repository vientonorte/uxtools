import type { ReactNode } from 'react';

interface MrCardProps {
  title?: string;
  hint?: string;
  children?: ReactNode;
  className?: string;
}

export function MrCard({ title, hint, children, className = '' }: MrCardProps) {
  return (
    <section className={`mr-card${className ? ` ${className}` : ''}`}>
      {title && <h2 className="mr-card__title">{title}</h2>}
      {hint && <p className="mr-card__hint">{hint}</p>}
      {children ?? null}
    </section>
  );
}

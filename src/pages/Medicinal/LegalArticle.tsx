import type { ReactNode } from 'react';

interface LegalArticleProps {
  title: string;
  variant?: 'default' | 'warning' | 'protection' | 'rights';
  keyText?: string;
  children: ReactNode;
  footnote?: string;
}

export function LegalArticle({
  title,
  variant = 'default',
  keyText,
  children,
  footnote,
}: LegalArticleProps) {
  const variantClass = variant !== 'default'
    ? ` med-card__back-article--${variant}`
    : '';

  return (
    <div className={`med-card__back-article${variantClass}`}>
      <h3 className="med-card__back-art-title">{title}</h3>
      {keyText && (
        <p className="med-card__back-art-text med-card__back-art-text--key">
          {keyText}
        </p>
      )}
      <p className="med-card__back-art-text">{children}</p>
      {footnote && (
        <p className="med-card__back-art-rights">{footnote}</p>
      )}
    </div>
  );
}

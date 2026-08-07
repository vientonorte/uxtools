import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface MrButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function MrButton({
  variant = 'ghost',
  className = '',
  type = 'button',
  children,
  ...rest
}: MrButtonProps) {
  return (
    <button
      type={type}
      className={`mr-btn mr-btn--${variant}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}

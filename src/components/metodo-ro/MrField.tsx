import type { ChangeEvent, ReactNode } from 'react';
import { MR_LIMITS } from '../../lib/metodo-ro-storage';

interface MrFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  as?: 'input' | 'textarea';
  type?: string;
  placeholder?: string;
  hint?: string;
  hideLabel?: boolean;
  maxLength?: number;
  showCount?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MrField({
  id,
  label,
  value,
  onChange,
  as = 'input',
  type = 'text',
  placeholder,
  hint,
  hideLabel,
  maxLength = as === 'textarea' ? MR_LIMITS.text : MR_LIMITS.short,
  showCount = as === 'textarea',
  disabled,
  className,
}: MrFieldProps) {
  const count = value.length;

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const next = e.target.value.slice(0, maxLength);
    onChange(next);
  }

  return (
    <div className={`mr-field${className ? ` ${className}` : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
      </label>
      {hint && !hideLabel ? <p className="mr-field__hint">{hint}</p> : null}
      {as === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
      {showCount ? (
        <span className="mr-field__count" aria-live="polite">
          {count}/{maxLength}
        </span>
      ) : null}
    </div>
  );
}

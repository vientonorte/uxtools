import type { ReactNode } from 'react';

type StepTone = 'rosa' | 'naranja' | 'azul' | 'verde' | 'stop';

interface MrStepHeadProps {
  num: number | string;
  tone?: StepTone;
  children: ReactNode;
}

export function MrStepHead({ num, tone = 'rosa', children }: MrStepHeadProps) {
  return (
    <div className="mr-step-head">
      <span className={`mr-step-num mr-step-num--${tone}`}>{num}</span>
      <h3>{children}</h3>
    </div>
  );
}

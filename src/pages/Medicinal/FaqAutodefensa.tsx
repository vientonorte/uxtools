import { useState } from 'react';
import { FAQ_AUTODEFENSA, type FaqItem } from './faqData';

const URGENCY_EMOJI: Record<FaqItem['urgency'], string> = {
  critica: '🔴',
  alta: '🟠',
  media: '🟡',
};

function FaqItemPanel({ item, isOpen, onToggle }: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [copyLabel, setCopyLabel] = useState('Copiar texto');
  const triggerId = `faq-trigger-${item.id}`;
  const bodyId = `faq-body-${item.id}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(item.say);
      setCopyLabel('¡Copiado!');
      setTimeout(() => setCopyLabel('Copiar texto'), 2000);
    } catch {
      setCopyLabel('Error al copiar');
      setTimeout(() => setCopyLabel('Copiar texto'), 2000);
    }
  }

  return (
    <div className={`med-faq-item med-faq-item--${item.color}`}>
      <button
        id={triggerId}
        className="med-faq-item__trigger"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <span aria-hidden="true">{URGENCY_EMOJI[item.urgency]}</span>
        <span className="med-faq-item__scenario">{item.scenario}</span>
        <span className="med-faq-item__badges" aria-hidden="true">
          {item.articles.map((art) => (
            <span key={art} className="med-faq-item__badge">{art}</span>
          ))}
        </span>
        <span className="med-faq-item__chevron" aria-hidden="true">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={triggerId}
          className="med-faq-item__body"
        >
          <p className="med-faq-item__action">{item.action}</p>

          <div className="med-faq-item__say-block">
            <p className="med-faq-item__say-label">Muestra / Di:</p>
            <p className="med-faq-item__say-text">{item.say}</p>
            <button
              type="button"
              className="med-faq-item__copy"
              onClick={handleCopy}
              aria-label="Copiar texto al portapapeles"
            >
              {copyLabel}
            </button>
          </div>

          <div>
            <p className="med-faq-item__dont-label">No debes:</p>
            <ul className="med-faq-item__dont-list">
              {item.dont.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>

          <details className="med-faq-item__legal-details">
            <summary>Base legal</summary>
            <p className="med-faq-item__legal-text">{item.legal}</p>
          </details>
        </div>
      )}
    </div>
  );
}

export function FaqAutodefensa() {
  const [openId, setOpenId] = useState<string | null>(null);

  function handleToggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="med-faq" aria-label="FAQ Autodefensa Legal">
      <h2 className="med-faq__title">Escenarios de autodefensa</h2>
      <p className="med-faq__sub">
        Qué hacer y qué decir en cada situación legal. Toca el escenario para expandir.
      </p>
      <div className="med-faq__list">
        {FAQ_AUTODEFENSA.map((item) => (
          <FaqItemPanel
            key={item.id}
            item={item}
            isOpen={openId === item.id}
            onToggle={() => handleToggle(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

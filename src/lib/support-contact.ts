/** Contacto de apoyo configurable. Vacío hasta que la persona lo escriba. Solo localStorage. */

export const SUPPORT_CONTACT_KEY = 'uxtools-support-contact';

export interface SupportContact {
  label: string;
  phone: string;
}

export const EMPTY_SUPPORT_CONTACT: SupportContact = {
  label: '',
  phone: '',
};

export function loadSupportContact(): SupportContact {
  try {
    const raw = localStorage.getItem(SUPPORT_CONTACT_KEY);
    if (!raw) return { ...EMPTY_SUPPORT_CONTACT };
    const parsed = JSON.parse(raw) as Partial<SupportContact>;
    return {
      label: typeof parsed.label === 'string' ? parsed.label.slice(0, 80) : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone.slice(0, 24) : '',
    };
  } catch {
    return { ...EMPTY_SUPPORT_CONTACT };
  }
}

export function saveSupportContact(contact: SupportContact): void {
  const next: SupportContact = {
    label: contact.label.trim().slice(0, 80),
    phone: contact.phone.trim().slice(0, 24),
  };
  localStorage.setItem(SUPPORT_CONTACT_KEY, JSON.stringify(next));
}

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function telHref(phone: string): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < 8) return null;
  return `tel:+${digits}`;
}

export function waHref(phone: string, text?: string): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < 8) return null;
  const base = `https://wa.me/${digits}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

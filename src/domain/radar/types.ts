/**
 * R.A.D.A.R. El Polijuego® — domain kernel (pure TS).
 * Shared by web suite and the future Expo app. No I/O, no React.
 *
 * Naming:
 *   selfradar  → Método Ro weekly review (see types/metodo-ro.ts)
 *   radar.solo → individual game mode (this module)
 */

export const RADAR_CYCLE = ['rev', 'aco', 'deb', 'acc', 'rec'] as const;
export type RadarCycleStep = (typeof RADAR_CYCLE)[number];

/** Four action lanes + transient locations. */
export const LANES = ['do', 'later', 'talk', 'drop'] as const;
export type LaneId = (typeof LANES)[number];

export const CARD_LOCATIONS = ['deck', 'hand', ...LANES] as const;
export type CardLocation = (typeof CARD_LOCATIONS)[number];

export const SESSION_KINDS = ['solo', 'passplay', 'room'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const LOCALES = ['es', 'en', 'pt'] as const;
export type RadarLocale = (typeof LOCALES)[number];

export const PRODUCT_IDS = {
  proApp: 'radar.pro',
  suiteLifetime: 'vn.suite.lifetime',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

export type EntitlementFlag =
  | 'rooms'
  | 'expansion_decks'
  | 'export_agreements'
  | 'calendar'
  | 'suite_modules';

/** Decider 2026-08-22: 1 store app = Polijuego. `suite_modules` is a license flag for *future* VN apps, not extra screens in this binary. */
export const TIER_FLAGS: Record<'free' | 'pro' | 'lifetime', readonly EntitlementFlag[]> = {
  free: [],
  pro: ['rooms', 'expansion_decks', 'export_agreements', 'calendar'],
  lifetime: ['rooms', 'expansion_decks', 'export_agreements', 'calendar', 'suite_modules'],
};

export interface RadarCardDef {
  key: string;
  deckId: string;
  /** ES is canonical; EN/PT fall back to ES if missing. */
  prompt: Record<RadarLocale, string>;
  hint?: Partial<Record<RadarLocale, string>>;
}

export interface RadarDeck {
  id: string;
  slug: string;
  title: Record<RadarLocale, string>;
  isBase: boolean;
  cards: RadarCardDef[];
}

export interface Seat {
  seat: 0 | 1 | 2 | 3 | 4 | 5;
  displayName: string;
  color: string;
  isLocal: boolean;
}

export interface PlacedCard {
  id: string;
  cardKey: string;
  deckId: string;
  location: CardLocation;
  seat: Seat['seat'] | null;
  sortKey: number;
  note: string;
  updatedAt: number;
}

export interface Agreement {
  id: string;
  body: string;
  dueAt: number | null;
  calendarEventId: string | null;
  createdAt: number;
}

export interface RadarSession {
  id: string;
  kind: SessionKind;
  locale: RadarLocale;
  cycleStep: RadarCycleStep;
  title: string;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  roomId: string | null;
  seats: Seat[];
  cards: PlacedCard[];
  agreements: Agreement[];
}

export interface Move {
  v: 1;
  sessionId: string;
  cardId: string;
  from: CardLocation;
  to: CardLocation;
  actorSeat: Seat['seat'];
  ts: number;
  prevHash: string;
}

export function isLane(value: string): value is LaneId {
  return (LANES as readonly string[]).includes(value);
}

export function isLocation(value: string): value is CardLocation {
  return (CARD_LOCATIONS as readonly string[]).includes(value);
}

export function canUse(flags: readonly EntitlementFlag[], need: EntitlementFlag): boolean {
  return flags.includes(need);
}

export function flagsForProducts(products: readonly ProductId[]): readonly EntitlementFlag[] {
  if (products.includes(PRODUCT_IDS.suiteLifetime)) return TIER_FLAGS.lifetime;
  if (products.includes(PRODUCT_IDS.proApp)) return TIER_FLAGS.pro;
  return TIER_FLAGS.free;
}

export function applyMove(session: RadarSession, move: Move): RadarSession {
  if (move.sessionId !== session.id) return session;
  if (session.closedAt != null) return session;
  const cards = session.cards.map((card) => {
    if (card.id !== move.cardId) return card;
    const seat = move.to === 'hand' ? move.actorSeat : move.to === 'deck' ? null : card.seat;
    return {
      ...card,
      location: move.to,
      seat,
      updatedAt: move.ts,
    };
  });
  return { ...session, cards, updatedAt: move.ts };
}

export const BASE_DECK_SLUG = 'base';

/** Seed mazo base — copy de producto, no de bujo personal. */
export const BASE_DECK: RadarDeck = {
  id: 'deck-base',
  slug: BASE_DECK_SLUG,
  isBase: true,
  title: {
    es: 'Mazo base',
    en: 'Base deck',
    pt: 'Baralho base',
  },
  cards: [
    {
      key: 'needs-now',
      deckId: 'deck-base',
      prompt: {
        es: '¿Qué necesitás que pase esta semana en el vínculo?',
        en: 'What needs to happen in the relationship this week?',
        pt: 'O que precisa acontecer no vínculo esta semana?',
      },
    },
    {
      key: 'hard-to-say',
      deckId: 'deck-base',
      prompt: {
        es: 'Algo que te cuesta decir y igual querés poner sobre la mesa.',
        en: 'Something hard to say that you still want on the table.',
        pt: 'Algo difícil de dizer que mesmo assim quer colocar na mesa.',
      },
    },
    {
      key: 'care-offer',
      deckId: 'deck-base',
      prompt: {
        es: 'Qué estás dispuesto/a a ofrecer con cuidado, sin sobre-comprometerte.',
        en: 'What you can offer with care, without over-committing.',
        pt: 'O que você pode oferecer com cuidado, sem se sobrecarregar.',
      },
    },
    {
      key: 'boundary',
      deckId: 'deck-base',
      prompt: {
        es: 'Un límite que necesita ser explícito, no adivinado.',
        en: 'A boundary that needs to be explicit, not guessed.',
        pt: 'Um limite que precisa ser explícito, não adivinhado.',
      },
    },
  ],
};

export const LANE_COPY: Record<LaneId, Record<RadarLocale, string>> = {
  do: { es: 'Hacer', en: 'Do', pt: 'Fazer' },
  later: { es: 'Posponer', en: 'Later', pt: 'Adiar' },
  talk: { es: 'Discutir', en: 'Talk', pt: 'Discutir' },
  drop: { es: 'Eliminar', en: 'Drop', pt: 'Eliminar' },
};

export const CYCLE_COPY: Record<RadarCycleStep, Record<RadarLocale, string>> = {
  rev: { es: 'Revisión', en: 'Review', pt: 'Revisão' },
  aco: { es: 'Acordar', en: 'Agree', pt: 'Acordar' },
  deb: { es: 'Debatir', en: 'Debate', pt: 'Debater' },
  acc: { es: 'Accionar', en: 'Act', pt: 'Agir' },
  rec: { es: 'Reconectar', en: 'Reconnect', pt: 'Reconectar' },
};

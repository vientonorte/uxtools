import type { ToolId } from './onboarding-i18n';

export const SPRINT_DAYS = [
  'map',
  'sketch',
  'decide',
  'prototype',
  'test',
] as const;

export type SprintDay = (typeof SPRINT_DAYS)[number];

export type SketchId = 'benchmark' | 'uxflow' | 'dx';
export type DecideId = 'poliradar' | 'selfradar';

export const SKETCH_OPTIONS: { id: SketchId; tool: ToolId }[] = [
  { id: 'benchmark', tool: 'benchmark' },
  { id: 'uxflow', tool: 'uxflow' },
  { id: 'dx', tool: 'dx' },
];

export const DECIDE_OPTIONS: { id: DecideId; tool: ToolId }[] = [
  { id: 'poliradar', tool: 'poliradar' },
  { id: 'selfradar', tool: 'selfradar' },
];

export interface SprintCopy {
  eyebrow: string;
  title: string;
  sub: string;
  stamp: string;
  stamped: string;
  next: string;
  back: string;
  score: string;
  days: Record<
    SprintDay,
    {
      n: string;
      name: string;
      question: string;
      do: string;
      dont: string;
      cta: string;
    }
  >;
  sketches: Record<SketchId, { name: string; job: string }>;
  decide: Record<DecideId, { name: string; job: string }>;
  story: string[];
  checks: string[];
  testHint: string;
}

export const SPRINT_COPY: Record<'es' | 'en' | 'pt', SprintCopy> = {
  es: {
    eyebrow: 'UX Tools · Design Sprint VN',
    title: 'Juega el sprint. Aprende la suite.',
    sub: 'Cinco días GV en un ciclo: Map → Sketch → Decide → Prototype → Test. Cada día desbloquea una herramienta de vientonorte.io/uxtools.',
    stamp: 'Sellar este día',
    stamped: 'Día sellado',
    next: 'Siguiente día',
    back: 'Día anterior',
    score: 'días sellados',
    days: {
      map: {
        n: 'Día 1',
        name: 'Map',
        question: '¿Qué problema? ¿Para quién?',
        do: 'Toca un nodo del mapa vocacional. Es el job, no la feature.',
        dont: 'No codear la solución obvia.',
        cta: 'Sellar Map',
      },
      sketch: {
        n: 'Día 2',
        name: 'Sketch',
        question: '¿Qué opciones plausibles hay en el hub?',
        do: 'Elige UNA de tres. No abras las tres “por si acaso”.',
        dont: 'No implementar las 4.',
        cta: 'Sellar Sketch',
      },
      decide: {
        n: 'Día 3',
        name: 'Decide',
        question: '¿Cuál apuesta testeamos?',
        do: 'Una sola. PoliRadar es el modo relacional; Self Radar el individual.',
        dont: 'Sin dual CTA. El Decider es Rö; aquí eliges tu camino de prueba.',
        cta: 'Sellar Decide',
      },
      prototype: {
        n: 'Día 4',
        name: 'Prototype',
        question: '¿Cómo se siente real?',
        do: 'Abre la apuesta o documenta el flujo en UXFlow. Solo el storyboard.',
        dont: 'Sin Ads. Sin GA. Sin refactor extra.',
        cta: 'Sellar Prototype',
      },
      test: {
        n: 'Día 5',
        name: 'Test',
        question: '¿Funciona en este dispositivo?',
        do: 'Smoke de 3 checks. Datos locales. Luego el hub.',
        dont: 'No declarar done solo porque se ve bonito.',
        cta: 'Sellar Test y entrar',
      },
    },
    sketches: {
      benchmark: {
        name: 'UX Benchmark',
        job: 'Live: análisis comparativo de experiencia para productos digitales.',
      },
      uxflow: {
        name: 'UXFLOW',
        job: 'Live: motor de documentación — flujos, criterios, export a Figma.',
      },
      dx: {
        name: 'Operating Model DX',
        job: 'Live: matriz Eisenhower. Priorizar fricción DX (Jira, Miro, Figma).',
      },
    },
    decide: {
      poliradar: {
        name: 'PoliRadar',
        job: 'Live: RADAR El Polijuego. Pareja/grupo. Pantalla completa + QR.',
      },
      selfradar: {
        name: 'Self Radar',
        job: 'Live: review semanal Método Ro. 7 ejes, máx. 3 acciones.',
      },
    },
    story: [
      'Entras a vientonorte.io/uxtools — hub de instrumentos, no un CMS.',
      'Map: ves el job (VOC o DX). Aún no codeas.',
      'Sketch: comparas Benchmark, UXFlow y DX. Una sola pista.',
      'Decide: PoliRadar (vínculo) o Self Radar (semana). Una apuesta.',
      'Prototype: juegas o documentas ese camino. Sin Ads.',
      'Test: smoke en este dispositivo. Entras al hub.',
    ],
    checks: [
      'Las sesiones quedan en este navegador (sin cuenta).',
      'No hay Ads ni pixel en este onboarding.',
      'PoliRadar se puede compartir con QR y pantalla completa.',
    ],
    testHint: 'Marca los tres. Eso es el DoD de Test de este ciclo.',
  },
  en: {
    eyebrow: 'UX Tools · Design Sprint VN',
    title: 'Play the sprint. Learn the suite.',
    sub: 'Five GV days in one cycle: Map → Sketch → Decide → Prototype → Test. Each day unlocks a tool from vientonorte.io/uxtools.',
    stamp: 'Stamp this day',
    stamped: 'Day stamped',
    next: 'Next day',
    back: 'Previous day',
    score: 'days stamped',
    days: {
      map: {
        n: 'Day 1',
        name: 'Map',
        question: 'What problem? For whom?',
        do: 'Tap a vocational-map node. That’s the job, not the feature.',
        dont: 'Don’t code the obvious solution.',
        cta: 'Stamp Map',
      },
      sketch: {
        n: 'Day 2',
        name: 'Sketch',
        question: 'What plausible options live in the hub?',
        do: 'Pick ONE of three. Don’t open all three “just in case”.',
        dont: 'Don’t implement all four.',
        cta: 'Stamp Sketch',
      },
      decide: {
        n: 'Day 3',
        name: 'Decide',
        question: 'Which bet do we test?',
        do: 'One only. PoliRadar is relational; Self Radar is individual.',
        dont: 'No dual CTA. Rö is Decider; here you pick your test path.',
        cta: 'Stamp Decide',
      },
      prototype: {
        n: 'Day 4',
        name: 'Prototype',
        question: 'How does the real thing feel?',
        do: 'Open the bet or document the flow in UXFlow. Storyboard only.',
        dont: 'No Ads. No GA. No extra refactor.',
        cta: 'Stamp Prototype',
      },
      test: {
        n: 'Day 5',
        name: 'Test',
        question: 'Does it work on this device?',
        do: 'Three smoke checks. Local data. Then the hub.',
        dont: 'Don’t call it done because it looks nice.',
        cta: 'Stamp Test and enter',
      },
    },
    sketches: {
      benchmark: {
        name: 'UX Benchmark',
        job: 'Live: comparative UX analysis for digital products.',
      },
      uxflow: {
        name: 'UXFLOW',
        job: 'Live: documentation engine — flows, criteria, Figma export.',
      },
      dx: {
        name: 'Operating Model DX',
        job: 'Live: Eisenhower matrix. Prioritise DX friction.',
      },
    },
    decide: {
      poliradar: {
        name: 'PoliRadar',
        job: 'Live: RADAR El Polijuego. Pairs/groups. Fullscreen + QR.',
      },
      selfradar: {
        name: 'Self Radar',
        job: 'Live: weekly Método Ro review. 7 axes, max 3 actions.',
      },
    },
    story: [
      'You enter vientonorte.io/uxtools — an instrument hub, not a CMS.',
      'Map: see the job (VOC or DX). Still no code.',
      'Sketch: compare Benchmark, UXFlow, DX. One track.',
      'Decide: PoliRadar (bond) or Self Radar (week). One bet.',
      'Prototype: play or document that path. No Ads.',
      'Test: smoke on this device. Enter the hub.',
    ],
    checks: [
      'Sessions stay in this browser (no account).',
      'No ads or pixels in this onboarding.',
      'PoliRadar can be shared with QR and fullscreen.',
    ],
    testHint: 'Tick all three. That’s this cycle’s Test DoD.',
  },
  pt: {
    eyebrow: 'UX Tools · Design Sprint VN',
    title: 'Jogue o sprint. Aprenda a suíte.',
    sub: 'Cinco dias GV num ciclo: Map → Sketch → Decide → Prototype → Test. Cada dia destrava uma ferramenta de vientonorte.io/uxtools.',
    stamp: 'Selar este dia',
    stamped: 'Dia selado',
    next: 'Próximo dia',
    back: 'Dia anterior',
    score: 'dias selados',
    days: {
      map: {
        n: 'Dia 1',
        name: 'Map',
        question: 'Qual problema? Para quem?',
        do: 'Toque um nó do mapa vocacional. É o job, não a feature.',
        dont: 'Não codear a solução óbvia.',
        cta: 'Selar Map',
      },
      sketch: {
        n: 'Dia 2',
        name: 'Sketch',
        question: 'Quais opções plausíveis há no hub?',
        do: 'Escolha UMA de três. Não abra as três “por via das dúvidas”.',
        dont: 'Não implementar as 4.',
        cta: 'Selar Sketch',
      },
      decide: {
        n: 'Dia 3',
        name: 'Decide',
        question: 'Qual aposta testamos?',
        do: 'Uma só. PoliRadar é relacional; Self Radar é individual.',
        dont: 'Sem CTA duplo. O Decider é Rö; aqui você escolhe o caminho de teste.',
        cta: 'Selar Decide',
      },
      prototype: {
        n: 'Dia 4',
        name: 'Prototype',
        question: 'Como se sente o real?',
        do: 'Abra a aposta ou documente o fluxo no UXFlow. Só o storyboard.',
        dont: 'Sem Ads. Sem GA. Sem refactor extra.',
        cta: 'Selar Prototype',
      },
      test: {
        n: 'Dia 5',
        name: 'Test',
        question: 'Funciona neste dispositivo?',
        do: 'Smoke de 3 checks. Dados locais. Depois o hub.',
        dont: 'Não declarar done só porque está bonito.',
        cta: 'Selar Test e entrar',
      },
    },
    sketches: {
      benchmark: {
        name: 'UX Benchmark',
        job: 'Live: análise comparativa de UX para produtos digitais.',
      },
      uxflow: {
        name: 'UXFLOW',
        job: 'Live: motor de documentação — fluxos, critérios, export Figma.',
      },
      dx: {
        name: 'Operating Model DX',
        job: 'Live: matriz Eisenhower. Priorizar fricção DX.',
      },
    },
    decide: {
      poliradar: {
        name: 'PoliRadar',
        job: 'Live: RADAR El Polijuego. Casal/grupo. Tela cheia + QR.',
      },
      selfradar: {
        name: 'Self Radar',
        job: 'Live: review semanal Método Ro. 7 eixos, máx. 3 ações.',
      },
    },
    story: [
      'Você entra em vientonorte.io/uxtools — hub de instrumentos, não um CMS.',
      'Map: vê o job (VOC ou DX). Ainda não codeia.',
      'Sketch: compara Benchmark, UXFlow e DX. Uma pista.',
      'Decide: PoliRadar (vínculo) ou Self Radar (semana). Uma aposta.',
      'Prototype: joga ou documenta esse caminho. Sem Ads.',
      'Test: smoke neste dispositivo. Entra no hub.',
    ],
    checks: [
      'As sessões ficam neste navegador (sem conta).',
      'Não há Ads nem pixel neste onboarding.',
      'PoliRadar pode ser compartilhado com QR e tela cheia.',
    ],
    testHint: 'Marque os três. Esse é o DoD de Test deste ciclo.',
  },
};

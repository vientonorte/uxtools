export type OnboardLang = 'es' | 'en' | 'pt';

export const ONBOARD_LANGS: { id: OnboardLang; label: string; native: string }[] = [
  { id: 'es', label: 'Español', native: 'Español' },
  { id: 'en', label: 'English', native: 'English' },
  { id: 'pt', label: 'Português', native: 'Português' },
];

export type ToolId =
  | 'benchmark'
  | 'uxflow'
  | 'poliradar'
  | 'dx'
  | 'voc'
  | 'tlp'
  | 'selfradar'
  | 'brief';

export interface ToolLayout {
  id: ToolId;
  icon: string;
  top: string;
  left: string;
  href: string;
  spa: boolean;
  featured?: boolean;
}

/** Same 8-node radial as voc.html (Martina). Each node = a suite tool. */
export const TOOL_LAYOUT: ToolLayout[] = [
  { id: 'benchmark', icon: '🌅', top: '12%', left: '50%', href: '/benchmark', spa: true },
  { id: 'uxflow', icon: '🎯', top: '23%', left: '77%', href: '/uxflow', spa: true },
  { id: 'poliradar', icon: '🃏', top: '50%', left: '88%', href: '/poliradar', spa: true, featured: true },
  { id: 'dx', icon: '🏠', top: '77%', left: '77%', href: 'eisenhower.html', spa: false },
  { id: 'voc', icon: '🛠️', top: '88%', left: '50%', href: 'voc.html', spa: false },
  { id: 'tlp', icon: '💡', top: '77%', left: '23%', href: '/kit-tlp', spa: true },
  { id: 'selfradar', icon: '📚', top: '50%', left: '12%', href: '/selfradar', spa: true },
  { id: 'brief', icon: '🌙', top: '23%', left: '23%', href: '/brief', spa: true },
];

interface ToolCopy {
  voc: string;
  name: string;
  job: string;
}

interface Copy {
  skip: string;
  start: string;
  open: string;
  eyebrow: string;
  title: string;
  sub: string;
  mapTitle: string;
  mapHint: string;
  centerYou: string;
  centerAge: string;
  privacy: string;
  featured: string;
  poliCta: string;
  tools: Record<ToolId, ToolCopy>;
}

const COPY: Record<OnboardLang, Copy> = {
  es: {
    skip: 'Saltar e ir al hub',
    start: 'Entrar a UX Tools',
    open: 'Abrir herramienta',
    eyebrow: 'UX Tools · Mapa vocacional',
    title: 'Estas son las herramientas',
    sub: 'El mismo mapa VOC: 8 preguntas, 8 caminos. Toca un nodo según afinidad. PoliRadar está marcado.',
    mapTitle: 'El mapa',
    mapHint: 'Toca cada pregunta y entra a la herramienta que resuena ✦',
    centerYou: 'tú',
    centerAge: 'en el trabajo',
    privacy: 'Las sesiones viven en este dispositivo. Sin cuenta, sin tracking.',
    featured: 'Disponible ahora',
    poliCta: 'PoliRadar · pantalla completa + QR',
    tools: {
      benchmark: {
        voc: 'Mi mañana ideal',
        name: 'UX Benchmark',
        job: 'Comparas productos con dimensiones. Empiezas el día midiendo, no opinando.',
      },
      uxflow: {
        voc: 'Pierdo noción del tiempo cuando…',
        name: 'UXFlow',
        job: 'Documentas flujos, criterios y handoff. El trabajo que se come las horas.',
      },
      poliradar: {
        voc: 'Con quién paso el día',
        name: 'PoliRadar',
        job: 'RADAR · El Polijuego. Facilitación de vínculos (pareja / grupo). Pantalla completa y QR para compartir.',
      },
      dx: {
        voc: 'Dónde estoy',
        name: 'Operating Model DX',
        job: 'Matriz Eisenhower: dónde está la prioridad entre Jira, Figma y el ruido.',
      },
      voc: {
        voc: 'Qué tocan mis manos',
        name: 'Mapa Vocacional',
        job: 'El VOC original: 8 preguntas, inferencia local, caminos para Martina.',
      },
      tlp: {
        voc: 'Qué problema resuelvo',
        name: 'Kit TLP',
        job: 'Cuando hay crisis: STOP, coping, ayuda. Sin diagnóstico. 100% local.',
      },
      selfradar: {
        voc: 'Qué aprendo todo el rato',
        name: 'Self Radar',
        job: 'Review semanal Método Ro: 7 ejes, buen vivir, máx. 3 acciones.',
      },
      brief: {
        voc: 'Cómo cierro mi día',
        name: 'Brief de Campaña',
        job: 'Cierras con un brief: alcance, presupuesto, proyección. Para salir del loop.',
      },
    },
  },
  en: {
    skip: 'Skip to hub',
    start: 'Enter UX Tools',
    open: 'Open tool',
    eyebrow: 'UX Tools · Vocational map',
    title: 'These are the tools',
    sub: 'Same VOC map: 8 questions, 8 paths. Tap a node by affinity. PoliRadar is marked.',
    mapTitle: 'The map',
    mapHint: 'Tap each question and open the tool that resonates ✦',
    centerYou: 'you',
    centerAge: 'at work',
    privacy: 'Sessions stay on this device. No account, no tracking.',
    featured: 'Available now',
    poliCta: 'PoliRadar · fullscreen + QR',
    tools: {
      benchmark: {
        voc: 'My ideal morning',
        name: 'UX Benchmark',
        job: 'Compare products on dimensions. Start the day measuring, not guessing.',
      },
      uxflow: {
        voc: 'I lose track of time when…',
        name: 'UXFlow',
        job: 'Document flows, criteria, handoff. The work that eats the hours.',
      },
      poliradar: {
        voc: 'Who I spend the day with',
        name: 'PoliRadar',
        job: 'RADAR · El Polijuego. Facilitation for pairs / groups. Fullscreen and a QR to share.',
      },
      dx: {
        voc: 'Where I am',
        name: 'Operating Model DX',
        job: 'Eisenhower matrix: where priority sits between Jira, Figma, and noise.',
      },
      voc: {
        voc: 'What my hands touch',
        name: 'Vocational map',
        job: 'The original VOC: 8 questions, local inference, paths for Martina.',
      },
      tlp: {
        voc: 'What problem I solve',
        name: 'Kit TLP',
        job: 'In a crisis: STOP, coping, help. No diagnosis. Fully local.',
      },
      selfradar: {
        voc: 'What I keep learning',
        name: 'Self Radar',
        job: 'Weekly Método Ro review: 7 axes, living well, max 3 actions.',
      },
      brief: {
        voc: 'How I close the day',
        name: 'Campaign brief',
        job: 'Close with a brief: scope, budget, projection. Out of the loop.',
      },
    },
  },
  pt: {
    skip: 'Saltar para o hub',
    start: 'Entrar no UX Tools',
    open: 'Abrir ferramenta',
    eyebrow: 'UX Tools · Mapa vocacional',
    title: 'Estas são as ferramentas',
    sub: 'O mesmo mapa VOC: 8 perguntas, 8 caminhos. Toque um nó por afinidade. PoliRadar está marcado.',
    mapTitle: 'O mapa',
    mapHint: 'Toque cada pergunta e entre na ferramenta que ressoa ✦',
    centerYou: 'você',
    centerAge: 'no trabalho',
    privacy: 'As sessões ficam neste dispositivo. Sem conta, sem tracking.',
    featured: 'Disponível agora',
    poliCta: 'PoliRadar · tela cheia + QR',
    tools: {
      benchmark: {
        voc: 'Minha manhã ideal',
        name: 'UX Benchmark',
        job: 'Compare produtos com dimensões. Comece o dia medindo, não opinando.',
      },
      uxflow: {
        voc: 'Perco a noção do tempo quando…',
        name: 'UXFlow',
        job: 'Documente fluxos, critérios e handoff. O trabalho que come as horas.',
      },
      poliradar: {
        voc: 'Com quem passo o dia',
        name: 'PoliRadar',
        job: 'RADAR · El Polijuego. Facilitação de vínculos (casal / grupo). Tela cheia e QR para compartilhar.',
      },
      dx: {
        voc: 'Onde estou',
        name: 'Operating Model DX',
        job: 'Matriz Eisenhower: onde está a prioridade entre Jira, Figma e o ruído.',
      },
      voc: {
        voc: 'O que minhas mãos tocam',
        name: 'Mapa Vocacional',
        job: 'O VOC original: 8 perguntas, inferência local, caminhos para Martina.',
      },
      tlp: {
        voc: 'Qual problema resolvo',
        name: 'Kit TLP',
        job: 'Na crise: STOP, coping, ajuda. Sem diagnóstico. 100% local.',
      },
      selfradar: {
        voc: 'O que aprendo o tempo todo',
        name: 'Self Radar',
        job: 'Review semanal Método Ro: 7 eixos, bom viver, máx. 3 ações.',
      },
      brief: {
        voc: 'Como fecho o meu dia',
        name: 'Brief de Campanha',
        job: 'Feche com um brief: alcance, orçamento, projeção. Sair do loop.',
      },
    },
  },
};

export function onboardCopy(lang: OnboardLang) {
  return COPY[lang];
}

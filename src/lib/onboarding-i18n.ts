export type OnboardLang = 'es' | 'en' | 'pt';

export const ONBOARD_LANGS: { id: OnboardLang; label: string; native: string }[] = [
  { id: 'es', label: 'Español', native: 'Español' },
  { id: 'en', label: 'English', native: 'English' },
  { id: 'pt', label: 'Português', native: 'Português' },
];

const COPY = {
  es: {
    skip: 'Saltar e ir al hub',
    back: 'Atrás',
    next: 'Continuar',
    start: 'Entrar a UX Tools',
    stepLang: 'Idioma',
    stepPrivacy: 'Privacidad',
    stepSecurity: 'Seguridad',
    stepBio: 'Biometría',
    stepSupport: 'Apoyo',
    hLang: 'Elige tu idioma',
    pLang: 'La interfaz de este onboarding está en tres idiomas. Puedes cambiar cuando quieras. El resto de la suite sigue en el idioma de cada módulo.',
    hPrivacy: 'Privacy by design',
    pPrivacy:
      'Tus sesiones viven en este dispositivo (localStorage). No hay cuenta, no hay servidor de perfil, no hay cookies de tracking. Si borras el sitio, se borra tu dato.',
    bulletsPrivacy: [
      'Minimización: solo lo que escribes en Self Radar / Kit TLP.',
      'Sin terceros: no Analytics, no ads, no pixel.',
      'Tú exportas: JSON cifrado opcional. Nadie más lo lee.',
    ],
    hSecurity: 'Security by design',
    pSecurity:
      'Validamos y recortamos lo que se guarda. Sin eval, sin HTML inyectado, enlaces externos en allowlist. Lo sensible no sale del navegador.',
    bulletsSecurity: [
      'Límites de texto y de sesiones (anti-cuota).',
      'Export opcional con AES-GCM.',
      'Passkey / WebAuthn es opt-in. Nunca obligatorio.',
    ],
    hBio: 'Biometría opcional',
    pBio:
      'Puedes proteger este navegador con Face ID, huella o llave del sistema. La llave privada no sale del dispositivo. Si no hay sensor, o usas lector de pantalla, puedes continuar sin biometría.',
    bioCta: 'Activar passkey en este dispositivo',
    bioSkip: 'Continuar sin biometría',
    bioOk: 'Passkey lista en este dispositivo.',
    bioFail: 'No se pudo crear la passkey. Sigue sin ella; el hub funciona igual.',
    bioUnsupported: 'Este navegador no ofrece WebAuthn. El onboarding sigue accesible.',
    hSupport: 'Crowdfunding · código abierto',
    pSupport:
      'Método Ro / UX Tools es CC BY-NC-SA. No hay campaña de cobro en línea todavía. Si quieres fondear el proyecto, escribe: el mail es el canal de crowdfunding hasta que exista Kickstarter o similar.',
    crowdfund: 'Escribir para crowdfunding',
    code: 'Ver código en GitHub',
  },
  en: {
    skip: 'Skip to hub',
    back: 'Back',
    next: 'Continue',
    start: 'Enter UX Tools',
    stepLang: 'Language',
    stepPrivacy: 'Privacy',
    stepSecurity: 'Security',
    stepBio: 'Biometrics',
    stepSupport: 'Support',
    hLang: 'Choose your language',
    pLang: 'This onboarding is in three languages. You can switch anytime. Each module keeps its own language.',
    hPrivacy: 'Privacy by design',
    pPrivacy:
      'Your sessions stay on this device (localStorage). No account, no profile server, no tracking cookies. Clear the site, clear your data.',
    bulletsPrivacy: [
      'Minimisation: only what you type in Self Radar / Kit TLP.',
      'No third parties: no analytics, ads, or pixels.',
      'You export: optional encrypted JSON. Nobody else reads it.',
    ],
    hSecurity: 'Security by design',
    pSecurity:
      'We validate and clamp stored text. No eval, no injected HTML, allowlisted outbound links. Sensitive data never leaves the browser.',
    bulletsSecurity: [
      'Text and session caps (quota safety).',
      'Optional AES-GCM export.',
      'Passkey / WebAuthn is opt-in. Never required.',
    ],
    hBio: 'Optional biometrics',
    pBio:
      'You can lock this browser with Face ID, a fingerprint, or a platform key. The private key never leaves the device. No sensor, or using a screen reader? Continue without biometrics.',
    bioCta: 'Enable a passkey on this device',
    bioSkip: 'Continue without biometrics',
    bioOk: 'Passkey ready on this device.',
    bioFail: 'Could not create a passkey. Continue anyway — the hub still works.',
    bioUnsupported: 'This browser has no WebAuthn. Onboarding stays accessible.',
    hSupport: 'Crowdfunding · open source',
    pSupport:
      'Método Ro / UX Tools is CC BY-NC-SA. There is no live payment campaign yet. To fund the project, write: that mailbox is the crowdfunding channel until Kickstarter or similar exists.',
    crowdfund: 'Write to crowdfund',
    code: 'View code on GitHub',
  },
  pt: {
    skip: 'Saltar para o hub',
    back: 'Voltar',
    next: 'Continuar',
    start: 'Entrar no UX Tools',
    stepLang: 'Idioma',
    stepPrivacy: 'Privacidade',
    stepSecurity: 'Segurança',
    stepBio: 'Biometria',
    stepSupport: 'Apoio',
    hLang: 'Escolha o idioma',
    pLang: 'Este onboarding está em três idiomas. Pode mudar quando quiser. Cada módulo mantém o próprio idioma.',
    hPrivacy: 'Privacy by design',
    pPrivacy:
      'As sessões ficam neste dispositivo (localStorage). Sem conta, sem servidor de perfil, sem cookies de tracking. Apagar o site apaga os dados.',
    bulletsPrivacy: [
      'Minimização: só o que você escreve no Self Radar / Kit TLP.',
      'Sem terceiros: sem analytics, ads ou pixel.',
      'Você exporta: JSON cifrado opcional. Ninguém mais lê.',
    ],
    hSecurity: 'Security by design',
    pSecurity:
      'Validamos e limitamos o que se guarda. Sem eval, sem HTML injetado, links externos em allowlist. O dado sensível não sai do navegador.',
    bulletsSecurity: [
      'Limites de texto e de sessões.',
      'Export opcional com AES-GCM.',
      'Passkey / WebAuthn é opt-in. Nunca obrigatório.',
    ],
    hBio: 'Biometria opcional',
    pBio:
      'Pode proteger este navegador com Face ID, impressão digital ou chave do sistema. A chave privada não sai do dispositivo. Sem sensor, ou com leitor de tela? Siga sem biometria.',
    bioCta: 'Ativar passkey neste dispositivo',
    bioSkip: 'Continuar sem biometria',
    bioOk: 'Passkey pronta neste dispositivo.',
    bioFail: 'Não foi possível criar a passkey. O hub funciona na mesma.',
    bioUnsupported: 'Este navegador não tem WebAuthn. O onboarding continua acessível.',
    hSupport: 'Crowdfunding · código aberto',
    pSupport:
      'Método Ro / UX Tools é CC BY-NC-SA. Ainda não há campanha de pagamento. Para financiar o projeto, escreva: esse e-mail é o canal de crowdfunding até existir Kickstarter ou similar.',
    crowdfund: 'Escrever para crowdfunding',
    code: 'Ver código no GitHub',
  },
} as const;

export function onboardCopy(lang: OnboardLang) {
  return COPY[lang];
}

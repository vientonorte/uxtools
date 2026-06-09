export type FaqUrgency = 'critica' | 'alta' | 'media';
export type FaqColor = 'critical' | 'protection' | 'warning' | 'rights' | 'neutral';

export interface FaqItem {
  id: string;
  scenario: string;
  urgency: FaqUrgency;
  articles: string[];
  color: FaqColor;
  action: string;
  say: string;
  dont: string[];
  legal: string;
}

export const FAQ_AUTODEFENSA: FaqItem[] = [
  {
    id: 'control-policial',
    scenario: 'Control policial / Carabineros me detiene',
    urgency: 'alta',
    articles: ['Art. 4°'],
    color: 'protection',
    action: 'Muestra este carnet',
    say: 'El cannabis que porto es mi dispensación mensual autorizada por receta médica. El Art. 4° Ley 20.000 me exime expresamente de imputación por microtráfico.',
    dont: [
      'Entregar la receta original a Carabineros',
      'Firmar documentos sin asesoría letrada',
      'Declarar sobre el origen de la droga',
    ],
    legal: 'Art. 4° Ley 20.000: «…será castigado con presidio menor… a menos que justifique que están destinadas a la atención de un tratamiento médico o a su uso o consumo personal exclusivo y próximo en el tiempo.»',
  },
  {
    id: 'consumo-publico',
    scenario: 'Me sorprenden consumiendo en lugar público',
    urgency: 'media',
    articles: ['Art. 50°'],
    color: 'warning',
    action: 'Muestra este carnet',
    say: 'Mi consumo está justificado por tratamiento médico. Art. 50° inciso final Ley 20.000. No soy sujeto de las sanciones de este artículo.',
    dont: [
      'Pagar una multa en el momento (no existe esa obligación inmediata)',
      'Creer que genera antecedentes penales (es falta administrativa)',
      'Firmar documentos sin leerlos',
    ],
    legal: 'Art. 50° inc. final Ley 20.000: «Se entenderá justificado el uso, consumo, porte o tenencia de alguna de dichas sustancias para la atención de un tratamiento médico.»',
  },
  {
    id: 'piden-receta',
    scenario: 'Me piden mostrar la receta médica',
    urgency: 'media',
    articles: ['Ley 20.584'],
    color: 'rights',
    action: 'No estás obligado a mostrarla',
    say: 'Mi prescripción es dato sensible según Ley 20.584 Arts. 12°–13°. Solo mi médico tratante, el COMPIN o un tribunal con causa formal pueden solicitarla.',
    dont: [
      'Mostrar la receta a Carabineros',
      'Mostrar la receta a empleadores o terceros',
      'Confundir el carnet de identidad (obligatorio) con la receta médica (protegida)',
    ],
    legal: 'Ley 20.584 Arts. 12°–13°: «Toda la información que surja de la ficha clínica será considerada dato sensible. Los terceros no vinculados a la atención de salud no tendrán acceso a dicha información.»',
  },
  {
    id: 'imputan-microtrafico',
    scenario: 'Me imputan o amenazan con imputar por microtráfico',
    urgency: 'critica',
    articles: ['Art. 4°'],
    color: 'critical',
    action: 'Exige abogado de inmediato',
    say: 'Solicito asistencia letrada de inmediato. No declaro sin mi abogado. Mi tenencia está amparada por la excepción de tratamiento médico del Art. 4° Ley 20.000.',
    dont: [
      'Responder ninguna pregunta sin abogado presente',
      'Firmar actas, declaraciones o autorizaciones',
      'Consentir incautación sin constancia escrita',
      'Declarar voluntariamente sobre cantidades o procedencia',
    ],
    legal: 'Art. 4° Ley 20.000: «…a menos que justifique que están destinadas a la atención de un tratamiento médico…» La excepción es directa — no requiere juicio previo.',
  },
  {
    id: 'cultivo',
    scenario: 'Me encuentran cultivando cannabis',
    urgency: 'alta',
    articles: ['Art. 8°'],
    color: 'neutral',
    action: 'Guarda la receta para el tribunal',
    say: 'Mi cultivo está justificado por receta médica según Art. 8° Ley 20.000. La receta indica diagnóstico, tratamiento, duración y forma de administración.',
    dont: [
      'Mostrar la receta a Carabineros en terreno sin asesoría previa',
      'Destruir plantas antes de consultar a un abogado',
      'Firmar actas de incautación sin asistencia letrada',
    ],
    legal: 'Art. 8° Ley 20.000: «Se entenderá justificado el cultivo de cannabis para la atención de un tratamiento médico, con la presentación de la receta extendida por un médico cirujano tratante, la que deberá indicar el diagnóstico, tratamiento y duración.»',
  },
];

// Plantillas de Campo. Esquema común de cada instrumento:
// { id, version, instrumento, nombre, objetivo, duracion, n_meta,
//   segmentos: [{ id, label, cupo }],
//   bloques: [{ id, titulo, preguntas: [{ id, texto, tipo, opciones? }] }],
//   ficha: [{ campo, tipo }],
//   tags: [], estilo: "vn" }
// tipo de pregunta: abierta | opcion | escala | foto | tag
// La guía de observación y las listas de mystery viven aquí. La app no las duplica.

export const TIPOS = ["abierta", "opcion", "escala", "foto", "tag"];
export const FICHA_TIPOS = ["texto", "opcion", "escala", "foto", "tag", "numero", "fecha"];

// Guía de observación contextual v3 · FRUTA · Maas Chile (entregable 08, aprobada por Rö).
// Participantes anonimizados con códigos P1…P11.
// Texto tomado del entregable 2026-10-26_guia-observacion-v3.docx. No agregar contenido.
export const GUIA = {
  title: "Guía de observación v3 · FRUTA · Maas Chile",
  objetivo: "Conocer el espacio y entender cómo facilita o dificulta que las personas recarguen, paguen y continúen su viaje.",
  antes: [
    "Anotar lugar, día, hora y contexto.",
    "Registrar qué dificulta la tarea y qué ayuda a resolverla.",
    "Fotografiar equipos, carteles y flujos, evitando rostros identificables.",
    "Separar lo observado de lo supuesto: para saber cómo alguien quiere sentirse o ser visto, puede ser necesario preguntarle.",
  ],
  sesiones: [
    { id: "S1", dia: "jue 29-10 (piloto)", hora: "07:00–09:00 punta mañana", recorrido: "Pajaritos (paradero 516 y Metro) → Los Héroes (trasbordo)", bloques: "Bloques 2 y 3" },
    { id: "S2", dia: "vie 06-11", hora: "18:00–20:00 punta tarde", recorrido: "Estación Central + acceso Tren Nos → Unión Latinoamericana (boleterías)", bloques: "Bloques 1, 3 y 4" },
    { id: "S3", dia: "mié 11-11 (si da el tiempo)", hora: "20:00–22:00 noche", recorrido: "Almacenes de Lo Prado y Maipú; paradero en Peñalolén Alto", bloques: "Bloques 1 y 4" },
  ],
  temas: [
    { n: 1, id: "recarga", name: "Recarga",
      items: [
        ["Máquinas y boleterías", "Tipos de equipos para recargar y activar saldo, medios de pago que aceptan y disponibilidad de atención con personal."],
        ["Dificultades al recargar", "Filas, tiempos de espera, equipos fuera de servicio y personas que necesitan ayuda."],
      ],
      vimos: [
        "Video 6 (23-oct): pasajeros esperando en las boleterías de Unión Latinoamericana.",
        "P1 (23 oct): tótems que fallan; P2 (21 oct) prefiere «la segura con la cajera».",
        "P3 (20 oct): en Peñalolén Alto casi no hay puntos de recarga; pasó al QR.",
        "P4 (23 oct) y P5 (23 oct): recarga en el almacén del barrio, también de emergencia.",
      ],
      donde: "Boleterías y tótems de Unión Latinoamericana · almacenes con recarga en Lo Prado y Maipú · Peñalolén Alto (dónde no hay puntos) · tótem de Metro U. de Chile (P6 (22 oct)).",
      cuando: "Punta mañana 07:00–09:00 (filas antes de entrar) y noche 20:00–22:00 (boleterías cerradas o con menos personal: a confirmar antes de usar).",
      pista: "OE1: la recarga como freno. ¿Qué parte del tiempo se va en la fila y en equipos fuera de servicio?" },
    { n: 2, id: "movilidad", name: "Movilidad",
      items: [
        ["Conexiones entre transportes", "Medios para llegar y salir de las estaciones —bicicletas, buses, etc.— y recorridos a pie entre ellos."],
        ["Medios no formales", "Presencia y uso de otras alternativas de transporte."],
        ["Continuidad del viaje", "Esperas, cruces o dificultades para pasar de un medio a otro."],
      ],
      vimos: [
        "P7 (23 oct): congestión y demora en el trasbordo de Los Héroes en hora punta.",
        "Obs. 23-oct: el corte por emergencia en Estación Central pasó carga del Metro a la micro.",
        "Obs. 23-oct: fila larga en el paradero frente a Pajaritos (micro 516 + Metro, P8 (23 oct)).",
        "Medios no formales: sin evidencia propia aún.",
      ],
      donde: "Los Héroes (trasbordo L1–L2) · Pajaritos (paradero + Metro) · Estación Central y acceso a Tren Nos · Estación Tren Nos en San Bernardo (sin voces de campo).",
      cuando: "Punta mañana 07:00–09:00 y punta tarde 18:00–20:00. Si hay un corte de servicio, registrarlo aparte.",
      pista: "OE2: el trasbordo como cuello de botella. OE4: qué pasa con el viaje cuando hay un corte." },
    { n: 3, id: "comportamiento", name: "Comportamiento",
      items: [
        ["Aglomeraciones y flujos", "Formación de filas y cuellos de botella en accesos y torniquetes."],
        ["Preparación", "Si las personas llegan con saldo, tarjeta o aplicación lista, o si se preparan al momento de pagar."],
        ["Uso de la tecnología y validación", "Personas validando con bip!, QR de la app Red, QR de banco o tarjeta del banco sin contacto: cuánto demoran, si deben repetir, si el validador o la señal fallan y qué hacen cuando no pasa."],
        ["Qué necesitan hacer —funcional—", "Con qué pagan, cuánto demoran, si el pago funciona y cómo comprueban que resultó."],
        ["Cómo quieren ser vistas —social—", "Observar cómo reaccionan frente a otros cuando necesitan ayuda, el pago falla o hacen esperar a la fila."],
        ["Cómo quieren sentirse —emocional—", "Observar si revisan varias veces el pago, se apuran o protegen el celular. Estas conductas pueden dar pistas sobre su necesidad de tranquilidad o seguridad."],
        ["Evasión del pago", "Cómo ocurre en buses, por qué puertas y en qué contexto."],
      ],
      vimos: [
        "Trabajadora de control de pago (22 oct): en el control de pago de Av. M. A. Matta, casi todos pagan con bip! (~90 %, un solo testimonio).",
        "P9 (22 oct): QR de la app Red, espera y saldo poco claro.",
        "Axial v2: celular expuesto al pagar (P10 (22 oct)); P11 (23 oct) relató asaltos en Estación Central.",
        "Evasión: sin evidencia propia aún; solo se observa.",
      ],
      donde: "Torniquetes de Los Héroes y Estación Central · validadores de micro en Pajaritos (516) · paradero de Av. M. A. Matta.",
      cuando: "Punta mañana 07:00–09:00 (apuro) y noche 20:00–22:00 (seguridad y celular).",
      pista: "OE1 y OE5: qué medio de pago falla o se demora más. OE3: cómo comprueban que el pago resultó." },
    { n: 4, id: "espacios", name: "Espacios",
      items: [
        ["Distribución y acceso", "Ubicación de máquinas, boleterías y torniquetes; facilidad para encontrarlos y acercarse."],
        ["Información disponible", "Carteles sobre recargas, medios de pago y equipos fuera de servicio."],
        ["Comercios relacionados con el viaje", "Si ofrecen recargas y si las personas los utilizan."],
      ],
      vimos: [
        "P11 (23 oct) supo del corte por el WhatsApp de Metro, no por un cartel.",
        "P4 (23 oct): el tótem queda lejos; recarga en el local.",
        "Censo 2024 (fuente secundaria): Estación Central, la comuna con mayor uso de TP (68,7 %); falta contrastar con INE.",
      ],
      donde: "Accesos de Estación Central y Unión Latinoamericana · almacenes de Lo Prado y Maipú · entorno de paraderos en Peñalolén Alto.",
      cuando: "Valle 10:00–12:00 (se ve el espacio sin multitud) y noche 20:00–22:00 (qué sigue abierto).",
      pista: "OE3: dónde está la información y si se ve. OE5: dónde podría estar un punto de recarga o aviso." },
  ],
  etica: [
    "Consentimiento oral antes de cualquier pregunta; si dice que no, no se insiste.",
    "Sin rostros ni datos personales en fotos y notas; solo códigos.",
    "Evasión: se observa sin identificar a nadie, sin fotografiar a la persona y sin intervenir.",
    "Seguridad del equipo: no exponer el celular en andenes con riesgo de robo (P11 (23 oct)); trabajar en pareja de noche.",
    "Permisos para fotografiar dentro de Metro, EFE o buses: a confirmar antes de usar.",
  ],
  puntos: [
    "Pajaritos (paradero 516 y Metro)",
    "Los Héroes (trasbordo L1–L2)",
    "Estación Central y acceso a Tren Nos",
    "Unión Latinoamericana (boleterías y tótems)",
    "Metro U. de Chile (tótem)",
    "Av. M. A. Matta (paradero y control de pago)",
    "Almacenes de Lo Prado y Maipú",
    "Peñalolén Alto (paraderos)",
    "Estación Tren Nos en San Bernardo",
  ],
};

const MS_TEXTO = ["punto", "puntoOtro", "obs", "when", "escenario", "medio", "afluencia", "clima", "intentos", "mensaje", "ayuda", "medir", "sentir", "pista", "studyId", "salida", "foto"];
const MS_NUM = { espera: "min", uso: "min", saldoIni: "clp", saldoFin: "clp" };

// Mystery shopper (Guía 05 · FRUTA · Maas Chile). Una ficha por escenario.
export const MS = {
  regla: "Regla de oro: viajas como usuario real, pagas siempre el pasaje y no engañas ni perjudicas a nadie.",
  etica: [
    "No grabes ni fotografíes a personas. No registres nombres de trabajadores ni de pasajeros.",
    "No evadas nunca. Pagas siempre el pasaje.",
    "No hagas reclamos ni evalúes al personal: evaluamos el sistema.",
    "Si algo se vuelve incómodo o inseguro, lo abandonas y lo anotas.",
  ],
  escenarios: [
    ["1", "Recargar en tótem", "Tiempo de espera y de uso · intentos · mensajes de error · si el tótem funcionaba"],
    ["2", "Recargar en boletería", "Largo de la fila (personas) · tiempo total · medios de pago aceptados"],
    ["3", "Recargar en almacén del barrio", "¿Había cartel? · ¿había sistema? · monto mínimo · comisión (si la hay) · tiempo"],
    ["4", "Pagar con bip!, QR o tarjeta bancaria", "Tiempo en el validador · intentos · qué muestra la pantalla · si el conductor interviene"],
    ["5", "Transbordo", "Tiempo de caminata · ¿cobró de nuevo? · señalética"],
    ["6", "Saldo bajo o negativo", "Mensaje en el validador · qué pasa después · cómo recargas desde ahí"],
    ["7", "Pedir información al personal", "Tiempo hasta la respuesta · si la respuesta fue clara · si te derivaron a otro lugar"],
    ["8", "Corte de servicio", "Cómo te enteraste · señalética · tiempo extra · costo extra"],
  ],
  medios: [["bip", "bip!"], ["qr", "QR"], ["tarjeta", "Tarjeta bancaria"], ["efectivo", "Efectivo"]],
  texto: MS_TEXTO,
  numeros: MS_NUM,
  campos: [...MS_TEXTO, ...Object.keys(MS_NUM)],
  puntos: [
    ["GEN", "General (sin punto)"], ["LLE", "Los Leones (L1/L6)"], ["UCA", "Universidad Católica (L1)"],
    ["UCH", "Universidad de Chile (L1/L3)"], ["LHE", "Los Héroes (L1/L2)"], ["ECE", "Estación Central (L1 + Tren Nos)"],
    ["BAQ", "Baquedano (L1/L5)"], ["ULA", "Unión Latinoamericana (L1)"], ["LRE", "Las Rejas (L1)"],
    ["PAJ", "Pajaritos (L1 + paradero)"], ["SPA", "San Pablo (L1/L5)"], ["PMA", "Plaza de Maipú (L5)"],
    ["MAT", "Av. Matta, control de pago (L3)"], ["PEN", "Peñalolén Alto, paraderos"], ["NOS", "Estación Tren Nos, San Bernardo"],
    ["CMO", "Compañía de Jesús con Morandé"], ["PZA", "Plaza de Armas"], ["PBU", "Parque Bustamante"],
    ["BEA", "Bellas Artes"], ["SIS", "Santa Isabel"], ["IRZ", "Irarrázaval"],
  ],
  salidas: [["MS-1", "MS-1 · Jue 30-oct · escenarios 1, 2, 7"], ["MS-2", "MS-2 · Mar 4-nov · escenarios 4, 5, 6"], ["MS-3", "MS-3 · Jue 6-nov · escenarios 3, 6"], ["MS-4", "MS-4 · Si hay corte anunciado · escenario 8"]],
};

function fichaTipo(campo) {
  if (campo === "when") return "fecha";
  if (campo === "foto") return "foto";
  if (["punto", "escenario", "medio", "afluencia", "salida"].includes(campo)) return "opcion";
  if (["espera", "uso", "saldoIni", "saldoFin", "intentos"].includes(campo)) return "numero";
  return "texto";
}

function plantillaObservacion() {
  return {
    id: "observacion-v3",
    version: 3,
    instrumento: "observacion",
    nombre: "Observación contextual",
    objetivo: GUIA.objetivo,
    duracion: "1 salida",
    n_meta: GUIA.sesiones.length,
    segmentos: GUIA.temas.map((t) => ({ id: t.id, label: `${t.n} · ${t.name}`, cupo: 1 })),
    bloques: GUIA.temas.map((t) => ({
      id: t.id,
      titulo: t.name,
      preguntas: t.items.map(([titulo, texto], i) => ({
        id: `${t.id}-${i + 1}`,
        texto: `${titulo}. ${texto}`,
        tipo: "abierta",
      })),
    })),
    ficha: [
      { campo: "lugar", tipo: "texto" },
      { campo: "when", tipo: "fecha" },
      { campo: "franja", tipo: "opcion" },
      { campo: "clima", tipo: "texto" },
      { campo: "corte", tipo: "opcion" },
      { campo: "tema", tipo: "opcion" },
      { campo: "vi", tipo: "texto" },
      { campo: "supongo", tipo: "texto" },
      { campo: "traba", tipo: "texto" },
      { campo: "ayuda", tipo: "texto" },
      { campo: "foto", tipo: "foto" },
      { campo: "pistas", tipo: "tag" },
    ],
    tags: ["#recarga", "#transbordo", "#pago", "#informacion"],
    estilo: "vn",
  };
}

function plantillaMystery() {
  return {
    id: "mystery-shopper",
    version: 1,
    instrumento: "mystery",
    nombre: "Mystery shopper",
    objetivo: "Recorrer el servicio como usuaria real y anotar una ficha por escenario.",
    duracion: "1 salida",
    n_meta: MS.escenarios.length,
    segmentos: MS.escenarios.map(([id, nombre]) => ({ id, label: `${id} · ${nombre}`, cupo: 1 })),
    bloques: MS.escenarios.map(([id, nombre, medir]) => ({
      id: `esc-${id}`,
      titulo: `${id} · ${nombre}`,
      preguntas: [{ id: `ms-p-${id}`, texto: medir, tipo: "abierta" }],
    })),
    ficha: MS.campos.map((campo) => ({ campo, tipo: fichaTipo(campo) })),
    tags: ["#espera", "#saldo", "#mensaje"],
    estilo: "vn",
  };
}

const GUION = {
  id: "guion-v3",
  version: 3,
  instrumento: "guion",
  nombre: "Guion v3",
  objetivo: "Abrir la entrevista, ubicar el perfil, seguir el tipo de viaje y cerrar. Sin datos personales.",
  duracion: "15–20 min",
  n_meta: 10,
  segmentos: [
    { id: "jovenes", label: "Jóvenes · Estudio", cupo: 3 },
    { id: "familias", label: "Familias · Alguien a cargo", cupo: 3 },
    { id: "rutinarios", label: "Rutinarios · Horario fijo", cupo: 2 },
    { id: "distribuida", label: "Distribuida · Varios destinos", cupo: 2 },
  ],
  bloques: [
    {
      id: "apertura",
      titulo: "Apertura",
      preguntas: [
        { id: "g1", texto: "¿Cómo llegaste hoy hasta aquí?", tipo: "abierta" },
        { id: "g2", texto: "¿Recargas tu tarjeta? ¿Dónde?", tipo: "abierta" },
        { id: "g3", texto: "¿Por qué ahí?", tipo: "abierta" },
      ],
    },
    {
      id: "clasificador",
      titulo: "Clasificador",
      preguntas: [{ id: "g4", texto: "¿Con qué frecuencia viajas?", tipo: "abierta" }],
    },
    {
      id: "segmento",
      titulo: "Segmento",
      preguntas: [{ id: "g5", texto: "¿Qué cambia cuando viajas con alguien a cargo?", tipo: "abierta" }],
    },
    {
      id: "cierre",
      titulo: "Cierre",
      preguntas: [{ id: "g6", texto: "Agradecer y explicar el límite de uso de datos.", tipo: "abierta" }],
    },
  ],
  ficha: [
    { campo: "codigo", tipo: "texto" },
    { campo: "segmento", tipo: "opcion" },
    { campo: "notas", tipo: "texto" },
  ],
  tags: ["#recarga", "#espera", "#cuidado", "#transbordo"],
  estilo: "vn",
};

const GUERRILLA = {
  id: "entrevista-guerrilla",
  version: 1,
  instrumento: "entrevista-guerrilla",
  nombre: "Entrevista de guerrilla",
  objetivo: "Hablar poco rato con una persona en el lugar. Anota el lugar. Mira el tiempo: entre 5 y 10 minutos.",
  duracion: "5–10 min",
  n_meta: 6,
  segmentos: [
    { id: "de-paso", label: "De paso", cupo: 4 },
    { id: "habitual", label: "Habitual del lugar", cupo: 2 },
  ],
  bloques: [
    {
      id: "charla",
      titulo: "Preguntas",
      preguntas: [
        { id: "eg-1", texto: "¿Qué viniste a hacer hoy aquí?", tipo: "abierta" },
        { id: "eg-2", texto: "¿Qué te costó más?", tipo: "abierta" },
        { id: "eg-3", texto: "¿Qué harías distinto la próxima vez?", tipo: "abierta" },
        { id: "eg-4", texto: "¿Quieres agregar algo antes de cerrar?", tipo: "abierta" },
      ],
    },
  ],
  ficha: [
    { campo: "lugar", tipo: "texto" },
    { campo: "inicio", tipo: "fecha" },
    { campo: "duracion", tipo: "numero" },
  ],
  tags: ["#lugar", "#tiempo", "#tarea"],
  estilo: "vn",
};

const EXPERTO = {
  id: "entrevista-experto",
  version: 1,
  instrumento: "entrevista-experto",
  nombre: "Entrevista a experto",
  objetivo: "Conocer cómo trabaja una persona que sabe del tema. Primero el perfil. Luego los temas.",
  duracion: "40–60 min",
  n_meta: 4,
  segmentos: [{ id: "experto", label: "Persona experta", cupo: 4 }],
  bloques: [
    {
      id: "perfil",
      titulo: "Perfil",
      preguntas: [
        { id: "ex-1", texto: "¿Cuál es tu rol hoy?", tipo: "abierta" },
        { id: "ex-2", texto: "¿Hace cuánto trabajas en este tema?", tipo: "abierta" },
        { id: "ex-3", texto: "¿Con quién trabajas de cerca?", tipo: "abierta" },
      ],
    },
    {
      id: "practica",
      titulo: "Práctica",
      preguntas: [
        { id: "ex-4", texto: "Cuéntame cómo haces esta tarea, de principio a fin.", tipo: "abierta" },
        { id: "ex-5", texto: "¿Dónde se traba el trabajo?", tipo: "abierta" },
      ],
    },
    {
      id: "criterio",
      titulo: "Criterio",
      preguntas: [
        { id: "ex-6", texto: "¿Qué miras para saber si salió bien?", tipo: "abierta" },
        { id: "ex-7", texto: "¿Qué cambiarías si pudieras?", tipo: "abierta" },
      ],
    },
  ],
  ficha: [
    { campo: "rol", tipo: "texto" },
    { campo: "anios", tipo: "numero" },
    { campo: "organizacion", tipo: "texto" },
  ],
  tags: ["#rol", "#practica", "#criterio"],
  estilo: "vn",
};

const PERFIL = {
  id: "encuesta-perfil",
  version: 1,
  instrumento: "encuesta-perfil",
  nombre: "Encuesta de perfilamiento",
  objetivo: "Haz preguntas cerradas. La primera respuesta indica el segmento.",
  duracion: "3–5 min",
  n_meta: 20,
  segmentos: [
    { id: "nuevo", label: "Primera vez", cupo: 8 },
    { id: "ocasional", label: "De vez en cuando", cupo: 6 },
    { id: "frecuente", label: "Casi todos los días", cupo: 6 },
  ],
  bloques: [
    {
      id: "perfil",
      titulo: "Perfil",
      preguntas: [
        { id: "ep-1", texto: "¿Con qué frecuencia vienes?", tipo: "opcion", opciones: ["Primera vez", "De vez en cuando", "Casi todos los días"] },
        { id: "ep-2", texto: "¿Vienes solo o con alguien?", tipo: "opcion", opciones: ["Solo", "Con otra persona", "Con un grupo"] },
        { id: "ep-3", texto: "¿Cuánto tiempo sueles estar?", tipo: "opcion", opciones: ["Menos de 10 minutos", "Entre 10 y 30 minutos", "Más de 30 minutos"] },
        { id: "ep-4", texto: "¿Qué tan fácil fue hoy?", tipo: "escala", opciones: ["1", "2", "3", "4", "5"] },
      ],
    },
  ],
  ficha: [
    { campo: "segmento", tipo: "opcion" },
    { campo: "frecuencia", tipo: "opcion" },
  ],
  tags: ["#frecuencia", "#compania", "#facilidad"],
  estilo: "vn",
};

const DIARIO = {
  id: "diario-uso",
  version: 1,
  instrumento: "diario-uso",
  nombre: "Diario de uso",
  objetivo: "Durante 7 días, anota qué pasó, saca una foto y elige una etiqueta.",
  duracion: "7 días",
  n_meta: 7,
  segmentos: [{ id: "dia", label: "Día de uso", cupo: 7 }],
  bloques: [
    {
      id: "dia",
      titulo: "Registro del día",
      preguntas: [
        { id: "du-1", texto: "¿Qué día del diario es?", tipo: "opcion", opciones: ["Día 1", "Día 2", "Día 3", "Día 4", "Día 5", "Día 6", "Día 7"] },
        { id: "du-2", texto: "¿Qué hiciste hoy?", tipo: "abierta" },
        { id: "du-3", texto: "Saca una foto del momento, sin rostros.", tipo: "foto" },
        { id: "du-4", texto: "Elige una etiqueta para este día.", tipo: "tag", opciones: ["#facil", "#traba", "#duda", "#logro"] },
      ],
    },
  ],
  ficha: [
    { campo: "dia", tipo: "numero" },
    { campo: "nota", tipo: "texto" },
    { campo: "foto", tipo: "foto" },
    { campo: "etiqueta", tipo: "tag" },
  ],
  tags: ["#facil", "#traba", "#duda", "#logro"],
  estilo: "vn",
};

const TRIADA = {
  id: "triada-pares",
  version: 1,
  instrumento: "triada-pares",
  nombre: "Tríada de pares",
  objetivo: "Conversar con tres personas a la vez. Una hace, otra mira y otra comenta.",
  duracion: "45–60 min",
  n_meta: 3,
  segmentos: [
    { id: "hace", label: "Quien hace", cupo: 1 },
    { id: "mira", label: "Quien mira", cupo: 1 },
    { id: "comenta", label: "Quien comenta", cupo: 1 },
  ],
  bloques: [
    {
      id: "participantes",
      titulo: "Participantes",
      preguntas: [
        { id: "tp-1", texto: "¿Quién hace la tarea ahora?", tipo: "abierta" },
        { id: "tp-2", texto: "¿Quién mira sin intervenir?", tipo: "abierta" },
        { id: "tp-3", texto: "¿Quién comenta al final?", tipo: "abierta" },
      ],
    },
    {
      id: "dinamica",
      titulo: "Dinámica",
      preguntas: [
        { id: "tp-4", texto: "Quien hace cuenta qué está haciendo, en voz alta.", tipo: "abierta" },
        { id: "tp-5", texto: "Quien mira dice qué vio, sin juzgar.", tipo: "abierta" },
        { id: "tp-6", texto: "Quien comenta dice qué cambiaría.", tipo: "abierta" },
        { id: "tp-7", texto: "Cambien de rol y repitan una vez.", tipo: "abierta" },
      ],
    },
  ],
  ficha: [
    { campo: "p1", tipo: "texto" },
    { campo: "p2", tipo: "texto" },
    { campo: "p3", tipo: "texto" },
    { campo: "rol", tipo: "opcion" },
  ],
  tags: ["#hace", "#mira", "#comenta"],
  estilo: "vn",
};

export const TEMPLATES = [
  GUION,
  plantillaObservacion(),
  plantillaMystery(),
  GUERRILLA,
  EXPERTO,
  PERFIL,
  DIARIO,
  TRIADA,
];

export function templateById(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}

export function flattenPreguntas(tpl) {
  const out = [];
  for (const bloque of tpl?.bloques || []) {
    for (const p of bloque.preguntas || []) {
      const row = { templateQuestionId: p.id, block: bloque.titulo, text: p.texto, tipo: p.tipo };
      if (Array.isArray(p.opciones)) row.opciones = p.opciones.slice();
      out.push(row);
    }
  }
  return out;
}

export function validateTemplate(tpl) {
  const errors = [];
  if (!tpl || typeof tpl !== "object") return ["no es un objeto"];
  for (const key of ["id", "instrumento", "nombre", "objetivo", "duracion"]) {
    if (typeof tpl[key] !== "string" || !tpl[key].trim()) errors.push(`falta ${key}`);
  }
  if (typeof tpl.version !== "number") errors.push("falta version");
  if (typeof tpl.n_meta !== "number" || tpl.n_meta < 1) errors.push("falta n_meta");
  if (tpl.estilo !== "vn") errors.push("estilo");
  if (!Array.isArray(tpl.segmentos) || !tpl.segmentos.length) errors.push("segmentos");
  else {
    tpl.segmentos.forEach((s, i) => {
      if (!s || typeof s.id !== "string" || !s.id || typeof s.label !== "string" || !s.label || typeof s.cupo !== "number") errors.push(`segmento ${i}`);
    });
  }
  let n = 0;
  if (!Array.isArray(tpl.bloques) || !tpl.bloques.length) errors.push("bloques");
  else {
    tpl.bloques.forEach((b, i) => {
      if (!b || typeof b.id !== "string" || !b.id || typeof b.titulo !== "string" || !b.titulo || !Array.isArray(b.preguntas)) {
        errors.push(`bloque ${i}`);
        return;
      }
      b.preguntas.forEach((p, j) => {
        n += 1;
        if (!p || typeof p.id !== "string" || !p.id || typeof p.texto !== "string" || !p.texto.trim() || !TIPOS.includes(p.tipo)) errors.push(`pregunta ${b.id}:${j}`);
        if (p && (p.tipo === "opcion" || p.tipo === "escala") && (!Array.isArray(p.opciones) || p.opciones.length < 2)) errors.push(`opciones ${p.id}`);
      });
    });
  }
  if (!n) errors.push("sin preguntas");
  if (!Array.isArray(tpl.ficha)) errors.push("ficha");
  else {
    tpl.ficha.forEach((f, i) => {
      if (!f || typeof f.campo !== "string" || !f.campo || !FICHA_TIPOS.includes(f.tipo)) errors.push(`ficha ${i}`);
    });
  }
  if (!Array.isArray(tpl.tags) || tpl.tags.some((t) => typeof t !== "string")) errors.push("tags");
  return errors;
}

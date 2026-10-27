# Campo: auditoría del journey UX y de las interacciones (27-10-2026)

Fuente: código en vivo de https://vientonorte.io/uxtools/campo/ (main a92874f). Leí `index.html` (52 líneas), `app.js` (1288) y `app.css` (277) con curl. `guia-data.js` responde 200. `sw.js` y `manifest.webmanifest` responden 404.
Fue solo lectura: no hice push, ni PR, ni cambios. Las referencias de línea apuntan a `public/campo/<archivo>`.
Contexto: el investigador la usa mañana con un iPhone 15 en Safari, en el metro de Santiago, a una mano, con sol, con interrupciones y con señal intermitente.

## Lo que ya funciona bien (no hay que rehacerlo)
- Los botones miden 48 px de alto y ocupan todo el ancho. Chips y botones de texto miden 44 px, y los tabs 48 px (app.css 120–122, 137, 164–165, 210).
- El CTA naranja con texto azul noche tiene contraste 7.6:1 (app.css 32). Los bordes de los inputs superan 3:1 (app.css 190).
- Todo se guarda cifrado y nunca en claro: `persist()` sale sin guardar si no hay clave (app.js 289–294).
- El borrador de la entrevista (`state.draft`) se guarda con cada nota, tag y adjunto (app.js 686, 693, 709, 731, 739). Las notas ya escritas sobreviven al bloqueo.
- Los errores son claros en el lock, el export y la ficha (app.js 1236, 1266, 869, 1101). La ficha enfoca el campo que falta (1102).
- La app bloquea al salir con `lockOnLeave` (app.js 67, 1270–1281).

## Journey paso a paso

### 1. Primera visita
- F1.1 **No hay service worker ni manifest** (sw.js y manifest dan 404). Con señal intermitente, una recarga de Safari o abrir la app desde un QR deja la página en blanco. Tampoco se puede «Agregar a inicio» con ícono propio.
- F1.2 **La app arranca con datos demo mezclados con los reales.** `seed()` carga los estudios «Demo A» y «Demo B», la entrevista E-0417 y 3 lotes (app.js 61–114). Desde ese momento se guardan cifrados junto con lo real (1212, 1240).
- F1.3 Guardar en localStorage desde una pestaña de Safari se expone a la limpieza de ITP a los 7 días sin uso, y en ningún lugar se avisa. El aviso de la portada solo dice «Respaldo: exportación manual» (app.js 378).

### 2. Crear la passkey
- F2.1 La ayuda de setup habla solo de «clave… 8 caracteres… anótala» (app.js 257), aunque el botón principal es «Crear passkey» (282). Una persona neurodivergente lee dos instrucciones que compiten entre sí.
- F2.2 En el setup se ven el botón de passkey y el formulario de clave a la vez (280–283). Los dos son CTA naranja (la clase es la misma) y no queda claro cuál conviene.
- F2.3 Un estudio creado con passkey no tiene clave de respaldo: solo la passkey lo abre (279–280). Si la passkey falla o se borra del llavero, se pierde todo. Nada lo advierte antes de crearla.

### 3. Desbloquear
- F3.1 Al volver a la app, el mensaje dice «Vuelve a escribir la clave del investigador» (app.js 1277) y el de carga dice «Escribe tu clave para abrirlo» (266). Las dos frases aparecen incluso cuando solo hay botón de passkey.
- F3.2 Sin un estudio con passkey, el botón de passkey queda oculto en el desbloqueo (281). Está bien, pero no se explica.
- F3.3 El error de passkey «cancelada o no corresponde a este estudio» (1227) no dice qué hacer después.

### 4. Registrar en campo (lotes → consentimiento → entrevista → registro)
- F4.1 **P0: en un estudio nuevo no se puede iniciar una entrevista.** `screenLotes` muestra el botón «Iniciar» solo si el estudio tiene lotes (app.js 530–539). Los lotes existen solo en el seed demo (108–110) y la app no tiene ninguna forma de crearlos. El texto dice «Este estudio no tiene lotes todavía. El demo A sí.» (531). Hoy el trabajo real solo funciona dentro del «Estudio Demo A».
- F4.2 El subtítulo de lotes está fijo: «Jueves 22-10 · demo» (528). Los lotes demo de A también están fijos, y el L1 y el L2 ya aparecen casi llenos.
- F4.3 **El código anónimo viene precargado como «E-0418» en todas las entrevistas** (574). Eso no coincide con la convención P1, P2… y si no se edita genera códigos duplicados.
- F4.4 Hay dos botones submit para empezar, y el secundario «Continuar sin consentimiento de audio» (577) apaga el audio aunque esté marcado (585). Quedan dos decisiones en una pantalla y el riesgo de tocar el botón equivocado.
- F4.5 **Si cambias a Notas de voz, la app se bloquea y borra la pantalla** (1270–1279), y eso pasa justo en el flujo que el texto recomienda (636: «Graba con Notas de voz y luego adjúntalo»). Se pierde el texto de la nota que estaba escrito y todavía no guardado (647). Al volver hay que desbloquear y navegar otra vez hasta la entrevista. Volver a la entrevista sí funciona porque el hash se conserva.
- F4.6 La nota solo se guarda tocando el chip «Nota» (644, 681–689). Enter no hace nada, porque el input no está dentro de un form. El chip va arriba del input (644 antes de 647), así que el orden visual queda al revés.
- F4.7 **No hay confirmación visible después de guardar.** «Nota guardada…» se anuncia solo en `#live`, que es visualmente oculto (app.css 230; app.js 688, 733, 740, 806, 1125). Con sol y a una mano, la única señal es que la nota aparece en la lista. Fotos y tags no dan ninguna señal visible.
- F4.8 **La foto no se guarda.** Solo se guardan su nombre y su tamaño (738), pero el texto dice «Foto adjuntada sin coordenadas» (740). Pasa lo mismo con el audio (730) y con «Grabar en la app (beta)», que graba 4 segundos y descarta el audio (708, 714–715). El microcopy hace creer que la evidencia quedó guardada.
- F4.9 Hay un botón «Registrar» dentro de un `<p class="notice">` (628). Como ocupa todo el ancho, el aviso parece un CTA.
- F4.10 El orden de la pantalla de entrevista es audio, beta, foto/nota, input, notas, tags, pregunta y segmento (635–664). Lo más frecuente, la nota y los tags, queda al medio, y «Terminar» queda al final de un scroll largo. Ningún elemento es sticky para el pulgar.
- F4.11 La pregunta actual es un input de texto libre (655). No hay «siguiente pregunta», aunque existe `questionIndex` (603).
- F4.12 Registro: el campo «Fecha» se puede editar, pero se ignora al guardar (770–774, 798). «Contacto (opcional)» invita a escribir datos personales (763) aunque el canon es «sin nombres».
- F4.13 Después de «Guardar registro» la app salta a lotes (807) y no hay confirmación visible (ver F4.7).

### 5. Codificar
- F5.1 Los tags son 4 fijos (app.js 34). No se pueden agregar códigos propios ni etiquetar una nota puntual, solo la entrevista completa (690–695).
- F5.2 No hay una vista para revisar ni editar una entrevista guardada: Registro dice «ya está en este teléfono» (789) y no permite editar.
- F5.3 El tab «Registro» sin id abre `currentInterview(null)`. Ese caso cae al draft o a la entrevista demo E-0417 (752–755), así que puede mostrar el registro de otra persona.

### 6. Exportar
- F6.1 Los títulos dicen «Paso 2 de 3» y «Paso 3 de 3» (841, 850), pero no hay un «Paso 1».
- F6.2 Se ofrecen iCloud y Google Drive como opciones (847–853), pero luego se avisa que no funcionan (854). Son opciones falsas.
- F6.3 `URL.revokeObjectURL` se ejecuta justo después de `a.click()` (895–896). En iOS Safari la descarga puede fallar o abrir una vista vacía. El único feedback es el aria-live oculto (898).
- F6.4 Las fotos y el audio exportados son solo nombres (877, 887). El archivo `.campo.json` no se puede abrir con nada de la app, porque no hay importación.
- F6.5 La clave del archivo es distinta a la passkey, y el texto no dice que hay que guardarla en Contraseñas.

### 7. Bloquear y salir
- F7.1 No existe un botón «Bloquear ahora». `#lock-open` existe pero nunca se usa (index 31; app.js 1194).
- F7.2 **«Borrar estudio y evidencias» borra con un solo toque, sin confirmar** (923, 945–954). Está en la misma pantalla y justo debajo de «Guardar privacidad». A una mano, un toque de más lo borra todo.
- F7.3 «Nueva clave (opcional)» en Privacidad (911, 938) convierte en silencio un estudio con passkey en uno con clave, porque `makeKey` sobrescribe el `meta` de passkey.
- F7.4 Las fichas de observación a medio escribir se pierden con el bloqueo, porque la ficha no tiene borrador (1058–1129).

### 8. Volver
- F8.1 Después de desbloquear, el hash se conserva (1203). Eso está bien.
- F8.2 El texto de retención promete un aviso 72 h antes y la opción de posponer (380, 918), pero `applyRetention` borra sin aviso (958–963). La promesa no está implementada.

## Lista priorizada

### P0: bloquea el trabajo de campo de mañana (6)
| # | Cambio en una línea | Archivo:línea | Esfuerzo |
|---|---|---|---|
| P0-1 | Que «Iniciar entrevista» funcione sin lotes: si `rows` está vacío, ir directo a `#/consentimiento?study=…`, o crear el lote «Hoy» automáticamente | app.js 530–539 | S (30 min) |
| P0-2 | No bloquear mientras haya un borrador de entrevista u observación abierto, o guardar el texto de la nota en el draft con `input` antes del lock. Plan B para mañana: desmarcar «Bloquear al salir» en Privacidad | app.js 1270–1279, 647 | S–M (1 h) |
| P0-3 | Pedir confirmación antes de borrar el estudio («Escribe BORRAR» o un segundo toque) y separar el botón del de guardar | app.js 923, 945 | S (20 min) |
| P0-4 | Dar feedback visible al guardar: un toast «Guardado ✓» visible por 2 s que reutilice `say()` | app.js 302–304; app.css 230 | S (30 min) |
| P0-5 | Corregir el microcopy de foto y audio: «Se anotó el nombre de la foto. La foto queda en tu Galería», y ocultar «Grabar en la app (beta)» | app.js 639, 708–715, 740, 733 | XS (15 min) |
| P0-6 | Código anónimo autoincremental `P{n}` en lugar de «E-0418» fijo | app.js 574 | XS (10 min) |

Mitigación sin código para mañana: el investigador crea su estudio real o usa el Demo A, apaga «Bloquear al salir» mientras graba y edita el código a mano. Así reduce P0-1, P0-2 y P0-6, pero no P0-3.

### P1: esta semana
| # | Cambio en una línea | Archivo:línea | Esfuerzo |
|---|---|---|---|
| P1-1 | Service worker y manifest con cache-first de los 4 archivos, para que abra offline y desde el ícono de inicio | nuevo sw.js e index.html | M (2 h) |
| P1-2 | Primer uso sin seed demo, o con un botón «Quitar demo» | app.js 61–114, 1212, 1240 | S |
| P1-3 | Unificar el copy del lock según el modo de passkey: «Toca para abrir con Face ID» | app.js 257, 266, 1277 | XS |
| P1-4 | En el setup, una sola acción principal (passkey) y la clave como enlace secundario, con aviso de que sin passkey no hay recuperación | app.js 280–283; index 17–29 | S |
| P1-5 | Nota rápida: envolver el input en un form (Enter guarda), poner el botón a la derecha y la barra «Nota / Tags / Terminar» sticky abajo | app.js 642–664 | M |
| P1-6 | Export: revocar la URL con `setTimeout` (o usar `navigator.share` con el archivo), quitar iCloud y Drive y renumerar los pasos | app.js 841–854, 894–896 | S |
| P1-7 | Botón «Bloquear ahora» en el header | index 33–39 | XS |
| P1-8 | Borrador para la ficha de observación (guardar en `state.obsDraft` con `input`) | app.js 1058–1129 | S |
| P1-9 | Aviso de ITP/respaldo: «Exporta al final de cada día» después de guardar un registro | app.js 378, 806 | XS |
| P1-10 | Bloquear el cambio de clave en estudios con passkey, o explicar qué pasa | app.js 911, 938 | XS |

### P2: después
- Lotes que se pueden crear y editar, con la fecha real en el subtítulo (app.js 528). Esfuerzo M.
- Tags propios y tags por nota (34, 690). M.
- Pregunta actual con un botón «Siguiente» que use `questionIndex` (603, 655). S.
- Editar registros guardados y una lista de entrevistas (789). M.
- Que «Fecha» se guarde o pase a ser de solo lectura. Quitar «Contacto» o ponerle un aviso (763, 770). XS.
- Tab Registro sin id → lista, no el demo (752–755). S.
- Implementar o quitar la promesa del aviso de 72 h (380, 918, 958). S.
- Importar `.campo.json` para respaldo y restauración (no existe). M.
- Sacar el «Registrar» del notice (628) como enlace o botón chico. XS.
- Un solo CTA de inicio en el consentimiento (576–577). XS.

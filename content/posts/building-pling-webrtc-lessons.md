---
id: "building-pling-webrtc-lessons"
title: "Lo que estoy aprendiendo construyendo Pling con WebRTC"
seoTitle: "Construir una Alternativa a Google Meet y Zoom con WebRTC: Lecciones de Pling"
summary: "Mi cuaderno de campo construyendo Pling: videollamadas P2P, decisiones que parecían buenas hasta probarlas, audio rebelde y el reto todavía abierto de traducir en vivo con WebGPU."
createdAt: "2026-07-20 16:25:00"
imageUrl: "images/pling-webrtc-es.jpg"
tags: "WebRTC, Pling, Videollamadas, Peer-to-Peer, Google Meet, Zoom, Screen Sharing, Audio, IA en el Navegador"
keywords: "construir alternativa a Zoom, alternativa a Google Meet WebRTC, WebRTC videollamadas P2P, arquitectura WebRTC mesh, crear app de videollamadas, Pling"
language: "es"
translationGroup: "building-pling-webrtc-lessons"
---

# Lo que estoy aprendiendo construyendo Pling con WebRTC

**[👉 Prueba Pling](https://pling.banegasn.dev/)** — Crea una sala desde el navegador, sin cuenta, descarga ni límite de tiempo.

La primera videollamada que construyes con WebRTC es una pequeña trampa. Abres dos pestañas, aceptas cámara y micrófono, intercambias una oferta y una respuesta y, de pronto, tu cara aparece al otro lado. Durante unos minutos piensas: “Bueno, quizá Zoom no era tan complicado”.

Entonces invitas a una persona real.

El navegador elige el micrófono equivocado. Una pestaña en segundo plano congela el vídeo. El audio que parecía perfecto en una gráfica suena como si un robot hubiera metido la cabeza en una lata. Y esa feature “gratis” empieza a cobrar en CPU, batería o ancho de banda.

Ahí empieza de verdad **Pling**: una aplicación de reuniones pequeñas, gratuita y peer-to-peer que estoy construyendo para entrar con un enlace, hablar y marcharse sin cuentas ni cronómetros mirándote desde una esquina.

Esto no es una guía definitiva de WebRTC. Es más bien un cuaderno de campo: decisiones que funcionaron, ideas que tuve que borrar y problemas que todavía me miran desde el backlog con bastante tranquilidad.

---

## WebRTC conecta medios. La reunión te toca a ti

La primera lección fue separar dos cosas que al principio parecen iguales: **hacer llegar audio y vídeo** y **hacer que una reunión funcione**.

WebRTC resuelve una parte extraordinariamente difícil: captura medios, los cifra y los transporta con baja latencia entre navegadores. Pero no crea salas, no decide quién inicia una oferta, no sincroniza si alguien ha silenciado su micrófono y no resuelve por sí solo los mensajes, las reacciones o una reconexión que no parezca un pequeño desastre.

En Pling, NestJS y Socket.IO coordinan presencia y señalización. Por ahí viajan las ofertas SDP, respuestas e ICE candidates, además del pequeño estado efímero de la sala. El audio, la cámara y la pantalla compartida sí viajan entre participantes mediante WebRTC.

Esto desmontó una idea muy cómoda: **peer-to-peer no significa “sin servidor”**. Sigue haciendo falta señalización. STUN ayuda a descubrir una ruta y TURN entra cuando una red corporativa, un CGNAT o una conexión móvil decide que hoy no habrá camino directo. P2P reduce la infraestructura multimedia; no elimina Internet ni sus opiniones.

## Una fórmula decide cuándo tu portátil empieza a despegar

Pling usa por ahora una topología mesh: cada participante mantiene una conexión con todos los demás. El número de pares crece así:

`n × (n - 1) / 2`

Con dos personas hay una conexión. Con ocho hay 28 pares, cada navegador mantiene siete peers y existen 56 flujos de vídeo dirigidos contando ambos sentidos. El servidor no paga por mezclar el vídeo, pero cada dispositivo paga con subida, CPU, batería y temperatura.

Esa fórmula terminó definiendo una decisión de producto: Pling limita las salas a ocho personas y adapta el vídeo a su tamaño. Una sala pequeña puede priorizar alta definición; cuando llegan más participantes, reduce bitrate, framerate y resolución de las cámaras.

Construí un smoke test que abre ocho Chrome headless y comprueba la malla completa. En una ejecución mantuvo activos los 56 flujos de entrada y los 56 de salida, sin pérdida de paquetes, frames descartados ni congelaciones. El portátil no despegó, pero el ventilador consideró seriamente la propuesta.

Fue una validación útil del código y de mi ordenador, no de Internet. Una latencia local de menos de un milisegundo no representa ocho dispositivos reales en redes reales. **Internet no vive en localhost**, por mucho que a nuestros tests les encante fingirlo.

Si Pling necesita crecer más allá de conversaciones pequeñas, el siguiente salto no será otro ajuste de CSS o bitrate. Será probablemente un **SFU**, donde cada persona publica una vez y el servidor reenvía una capa adecuada a cada receptor.

## La primera llamada real encuentra las mentiras del prototipo

En una llamada con un compañero descubrí que el navegador había elegido el micrófono y los altavoces equivocados. Mi implementación funcionaba; la conversación, no. Es una forma bastante eficiente de recuperar la humildad.

Desde entonces Pling enumera cámaras, micrófonos y salidas, recuerda la elección y permite cambiar de dispositivo durante la llamada sustituyendo el track enviado. Incluso eso tiene matices: seleccionar la salida de audio depende de `setSinkId`, que no está disponible igual en todos los navegadores.

El patrón se ha repetido con otras funciones. El navegador no es una tubería neutra: es el sistema operativo real de una aplicación WebRTC. Sus permisos, codecs, políticas de autoplay, APIs disponibles y decisiones de ahorro de energía forman parte de la arquitectura, aunque no aparezcan en el diagrama bonito.

Lo aprendí de una manera especialmente visible al añadir filtros de vídeo. El modo “Studio” procesaba la cámara a través de un canvas y se veía muy bien… hasta que el usuario cambiaba de pestaña. Chrome limitaba el canvas en segundo plano y los demás recibían un frame congelado: una foto de perfil involuntaria en mitad de la reunión.

La solución fue volver a usar la cámara sin procesar por defecto, desactivar el filtro al ocultar la pestaña y reanudar explícitamente el vídeo al regresar. Una mejora visual no es una mejora si puede detener la conversación.

## Compartir pantalla no debería hacer desaparecer a la persona

Mi primera implementación sustituía el track de la cámara con `replaceTrack`. Era simple, habitual en una demo y bastante mala para una reunión: en cuanto alguien compartía pantalla, su cara desaparecía.

Pling ahora publica la pantalla mediante un segundo `RTCRtpSender` y la muestra como un tile independiente. Eso obligó a resolver renegociación, llegadas tardías, grabación de ambos vídeos y el final manual o automático de la captura. También cambió el diseño de la sala: una presentación nueva recibe el foco una vez, pero después la interfaz respeta si alguien decide minimizarla.

La calidad necesita intención. Durante una presentación, el texto legible importa más que una cámara a 24 fps. En salas pequeñas, Pling puede dar a la pantalla hasta 2,5 Mbps y 20 fps mientras reduce temporalmente las cámaras a 300–500 Kbps y 12–15 fps. Al terminar, restaura sus perfiles normales.

La idea era buena; la primera versión no. Un límite accidental de cinco miniaturas escondía algunas cámaras y una reducción demasiado agresiva hacía parecer que otra había desaparecido. Priorizar una pantalla no puede significar borrar a las personas de la reunión. Parece obvio después de escribirlo; antes no lo fue tanto.

## El audio: tres booleanos y una falsa sensación de seguridad

Pling empezó solicitando `echoCancellation`, `noiseSuppression` y `autoGainControl`. Son una base razonable, pero una llamada con ruido me recordó que “activado” no significa “resuelto”.

Añadí una cadena de Web Audio para nivelar la voz, ecualizar y limitar picos, además de una opción avanzada con RNNoise y WebAssembly. Entonces apareció el problema inverso: el procesamiento podía comerse el comienzo o el final de algunas palabras.

Probé una mezcla paralela muy baja de la señal original, retrasada unos 13 ms para conservar consonantes suaves. Las pruebas automáticas pasaban. La gráfica estaba preciosa. Al escucharlo apareció un pitido intenso y mis oídos presentaron una queja formal. Revertí el cambio.

Es una de las lecciones más valiosas del proyecto: **un grafo de audio puede ser técnicamente correcto y sonar fatal**. Este producto necesita tests, métricas y oídos humanos. La calidad percibida no cabe por completo en una suite de unit tests.

## “Gratis” para el servidor no significa gratis para nadie

Quería ofrecer grabación sin pagar almacenamiento ni procesamiento de vídeo. La solución fue no subir la grabación.

El navegador de quien graba compone los vídeos en un canvas, mezcla las pistas de audio y genera un WebM con `MediaRecorder`. Cuando la API está disponible, escribe los chunks directamente en un archivo elegido por el usuario; en otros navegadores los conserva temporalmente y descarga el resultado al terminar. Pling nunca almacena ese vídeo.

La parte difícil no fue `MediaRecorder`. Fue el significado de grabar. Aunque el archivo sea local, contiene a otras personas. Por eso la sala comparte el estado de grabación, muestra un indicador visible y pide una confirmación clara. **Local no elimina la necesidad de consentimiento.**

Estoy aplicando la misma idea a los subtítulos. Un modelo Whisper se ejecuta en el navegador y usa WebGPU cuando el dispositivo lo permite. Cada participante que los activa procesa su propio micrófono y envía a la sala únicamente texto etiquetado con su nombre. Así no necesito mandar audio a un servicio de transcripción.

Y aquí llego a la parte en la que todavía no tengo una respuesta bonita: **transcripción y traducción en vivo con WebGPU**.

En un ordenador antiguo, el modelo tarda más en cargar y la GPU, la memoria y la batería del usuario se convierten en parte del coste. Mi primer modo automático de idioma llegó a traducir una frase española al inglés cuando solo debía transcribirla. El sistema decidió ser útil de una forma que nadie le había pedido.

Forzar `task: transcribe` y detectar el idioma de cada fragmento mediante los logits de Whisper mejora el comportamiento, pero no lo convierte mágicamente en traducción simultánea fiable. Traducir en directo implica lidiar con latencia, frases incompletas, cambios de idioma a mitad de oración, correcciones cuando aparece más contexto y dispositivos con capacidades muy diferentes.

También tengo que decidir dónde debe ocurrir ese trabajo: en cada dispositivo, repartido entre participantes o en un servicio externo como fallback. Cada opción cambia el coste, la privacidad y la experiencia. Por ahora, los subtítulos locales son una beta útil. La traducción en vivo sigue siendo un problema abierto que necesita más diseño, más pruebas y, probablemente, alguna idea que todavía no he tenido.

## La arquitectura que borré también cuenta

En un momento intenté que un único dispositivo transcribiera toda la reunión. El servidor elegía un transcriptor y podía promocionar un reemplazo si este se marchaba. Técnicamente funcionaba, que es una de las frases más peligrosas del desarrollo de software.

Concentraba la carga de GPU, añadía colas si dos personas hablaban a la vez, complicaba la recuperación y hacía que un participante procesara las voces de todos. No encajaba con la promesa de Pling, así que retiré los cambios.

Ese paso atrás fue tan importante como cualquier feature. Diseñar una alternativa a Meet o Zoom no consiste en copiar una lista de funciones. Consiste en decidir qué responsabilidades encajan con el producto y cuáles lo contradicen.

Pling promete una sala pequeña, inmediata y respetuosa con los datos. Por eso el chat es efímero, la grabación es local y los subtítulos nacen en el dispositivo. Los resúmenes opcionales sí usan un modelo externo, pero pasan por autorizaciones de corta duración, cuotas estrictas y un backend que nunca entrega su clave al navegador. “Privado” no significa fingir que no existen compromisos; significa hacerlos visibles y reducirlos.

## No estoy construyendo un Zoom de bolsillo

Pling no pretende reemplazar un webinar de cientos de personas, la administración empresarial ni una biblioteca de grabaciones en la nube. Es una alternativa para otra situación: hasta ocho personas que quieren abrir un enlace, hablar y marcharse sin crear una cuenta ni vigilar un temporizador.

Esa limitación no es una disculpa. Es parte del diseño.

Ahora toca salir mucho más del laboratorio: móviles que bloquean la pantalla, conexiones que saltan entre Wi-Fi y datos, redes que obligan a usar TURN y dispositivos modestos que no pueden ejecutar Whisper cómodamente. También quiero usar `getStats()` para adaptar la calidad con evidencia real sin convertir la observabilidad en vigilancia.

Lo que más me engancha de construir Pling es que WebRTC obliga a pensar en todo el sistema a la vez. Red, interfaz, privacidad, accesibilidad y coste dejan de ser capas separadas. Cada decisión que mejora una puede fastidiar otra con una eficacia admirable.

La alternativa que quiero diseñar no será la que tenga más botones. Será la que consiga que toda esa complejidad desaparezca durante una buena conversación.

Si estás construyendo algo parecido —o has sobrevivido a una batalla especialmente absurda con WebRTC— los comentarios están abiertos. Me interesa mucho más una historia real que otra lista de “best practices”.

## Enlaces

- **[Abrir Pling](https://pling.banegasn.dev/)** — Crea o únete a una sala
- **[Por qué estoy construyendo Pling](/blog/pling)** — La idea y la motivación del proyecto
- **[Acerca de Pling](https://pling.banegasn.dev/about)** — Privacidad, funcionamiento y propósito

---
id: "clip-history"
title: "ClipHistory: Gestor de Portapapeles Open Source para macOS con Historial Persistente"
summary: "ClipHistory es un gestor de historial de portapapeles open source para macOS. Pulsa Shift+Cmd+V para acceder al historial de texto, imagenes y archivos. SQLite persistente, sin conexion a red, MIT."
createdAt: "2026-07-10 13:00:00"
imageUrl: "images/clip-history.jpg"
tags: "macOS, Clipboard Manager, Portapapeles, Open Source, Swift, SwiftUI, Menu Bar App, Historial de Portapapeles, Productividad, MIT"
keywords: "macOS clipboard manager, clipboard history macOS, open source clipboard app, free clipboard manager Mac, Shift Cmd V clipboard, clipboard history tool, Swift clipboard app, menu bar clipboard"
language: "es"
translationGroup: "clip-history"
---

# ClipHistory: Gestor de Portapapeles Open Source para macOS con Historial Persistente

**ClipHistory** es un **gestor de historial de portapapeles open source para macOS**. Pulsa Shift+Cmd+V desde cualquier app y accede a un historial buscable de texto, imágenes y archivos. Persistente con SQLite, sin conexiones de red, bajo licencia MIT.

**[👉 Ver ClipHistory](https://banegasn.github.io/clip-history/)** — Descubre todas las características, descarga el .dmg o revisa el código fuente en GitHub.

---

## El problema del portapapeles en macOS

macOS solo recuerda **una sola cosa** a la vez en el portapapeles. Copias algo nuevo y lo anterior desaparece para siempre. Si trabajas copiando y pegando fragmentos de texto, enlaces, imágenes o código, esto significa perder tiempo yendo y viniendo entre aplicaciones.

**ClipHistory** soluciona esto de forma elegante: pulsa **Shift+Cmd+V** desde cualquier aplicación y aparece un panel buscable con todo lo que has copiado recientemente. Selecciona, pulsa Enter y se pega directamente donde estabas.

---

## Características principales

**Atajo global** — **Shift+Cmd+V** abre un panel centrado y buscable desde cualquier aplicación. No necesitas cambiar de ventana ni buscar un icono en la barra de menú.

**Texto, imágenes y archivos** — Captura texto plano y rich text, capturas de pantalla e imágenes, y archivos copiados desde Finder.

**Persistente con SQLite** — El historial se guarda en una base de datos SQLite en Application Support. Sobrevive a reinicios. Limitado a los **200 elementos más recientes** para mantenerse ligero.

**Pega en el sitio** — Selecciona un clip con **Enter** y ClipHistory reactiva la aplicación anterior y pega con un **Cmd+V** sintético. No necesitas pegar manualmente.

**Fija tus favoritos** — Marca clips con **Cmd+P** y se quedan fijos arriba. Los clips fijados **nunca se eliminan** por el límite de 200 elementos. **Cmd+Backspace** elimina, **flecha derecha** expande el contenido completo.

**Privado por diseño** — ClipHistory **no realiza ninguna conexión de red**. Todo se queda en local. Además, **detecta y omite automáticamente** los clips de gestores de contraseñas para que tus credenciales nunca se guarden en el historial.

<div style="text-align: center; margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px;">
  <h2 style="margin-bottom: 1rem; color: #f8fafc; font-size: 1.4rem;">Pulsa Shift+Cmd+V y pega lo que quieras</h2>
  <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
    <a href="https://banegasn.github.io/clip-history/" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 1.2rem 2.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s;">
      🚀 Ver ClipHistory
    </a>
    <a href="https://github.com/banegasn/clip-history/releases/latest" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1f2937; color: #f8fafc; padding: 1.2rem 2.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; border: 1px solid #374151;">
      ⬇️ Descargar .dmg
    </a>
    <a href="https://github.com/banegasn/clip-history" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: transparent; color: #7dd3fc; padding: 1.2rem 2rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; border: 1px solid #374151;">
      ★ Ver código en GitHub
    </a>
  </div>
  <p style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">Free & MIT-licensed · macOS 14+ · ~380 KB</p>
</div>

---

## Construido para tus manos

| Atajo | Acción |
|-------|--------|
| **Shift+Cmd+V** | Abrir / enfocar el panel de historial |
| **↑ ↓** | Mover la selección |
| **→** | Expandir el contenido completo de un clip |
| **← / Esc** | Volver desde detalle · cerrar el panel |
| **Enter** | Pegar la selección en la app anterior |
| **Option+↑ / Option+↓** | Saltar 5 filas a la vez |
| **Cmd+P** | Fijar / soltar — los favoritos flotan arriba |
| **Cmd+Backspace** | Eliminar la entrada del historial |
| **Escribir** | Filtrar el historial |

---

## Instalación en un minuto

**1. Descarga y arrastra a Aplicaciones** — Descarga el [último .dmg](https://github.com/banegasn/clip-history/releases/latest), ábrelo y arrastra **ClipHistory** a Aplicaciones.

**2. Ábrelo la primera vez** — No está notarizado por Apple, así que abre **Ajustes del Sistema ▸ Privacidad y Seguridad** y haz clic en **Abrir de todos modos** (o ejecuta `xattr -dr com.apple.quarantine /Applications/ClipHistory.app` en el terminal).

**3. Concede Accesibilidad** — **Ajustes del Sistema ▸ Privacidad y Seguridad ▸ Accesibilidad** → activa ClipHistory. Es necesario para que pueda pegar con Cmd+V.

---

## Cómo funciona por dentro

- **Detección de copias** — Sondea `NSPasteboard.changeCount` (macOS no tiene un evento de cambio de portapapeles)
- **Atajo global** — Carbon `RegisterEventHotKey` (a nivel de sistema, sin permisos especiales)
- **Pegado** — Reactiva la app anterior y envía un Cmd+V sintético vía `CGEvent`
- **Almacenamiento** — SQLite en Application Support; imágenes como blobs PNG, miniaturas en memoria

---

## Por qué elegir ClipHistory

- **Gratis y de código abierto** (licencia MIT)
- **~380 KB** — una app diminuta que no pesa en tu sistema
- **Sin conexiones de red** — tu portapapeles nunca sale de tu Mac
- **SQLite persistente** — el historial sobrevive a reinicios
- **Construido con Swift y SwiftUI** — nativo de macOS

---

## Preguntas frecuentes

**¿Es ClipHistory gratis?**
Sí, es completamente gratuito y de código abierto bajo licencia MIT. Puedes usarlo, modificarlo y distribuirlo libremente.

**¿ClipHistory envía datos a internet?**
No. ClipHistory **no realiza ninguna conexión de red**. Todo el historial se almacena localmente en tu Mac.

**¿Funciona con gestores de contraseñas?**
Sí, ClipHistory detecta y omite automáticamente los clips provenientes de gestores de contraseñas como 1Password, Bitwarden o el llavero de macOS.

**¿Qué versión de macOS necesito?**
ClipHistory requiere **macOS 14 (Sonoma)** o superior.

**¿Está notarizado por Apple?**
No, por lo que deberás hacer clic en "Abrir de todos modos" en Privacidad y Seguridad la primera vez, o ejecutar el comando `xattr` indicado arriba.

**¿Puedo compilarlo desde el código fuente?**
Sí, ejecuta `./setup-signing.sh && ./build-app.sh`. Consulta el [README en GitHub](https://github.com/banegasn/clip-history#readme) para más detalles.

---

## Enlaces

- **[Sitio web de ClipHistory](https://banegasn.github.io/clip-history/)** — Descubre todas las características
- **[Descargar .dmg](https://github.com/banegasn/clip-history/releases/latest)** — Última release
- **[Código fuente en GitHub](https://github.com/banegasn/clip-history)** — Star, contribuye e inspecciona
- **[Reportar issues](https://github.com/banegasn/clip-history/issues)** — Ayuda a mejorar la app

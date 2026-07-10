---
id: "s3-studio"
title: "S3 Studio: Gestor de Amazon S3 y CloudFront de Escritorio Sin Backend"
summary: "S3 Studio es un cliente de escritorio source-available para gestionar buckets de Amazon S3, editar objetos, revisar permisos e invalidar CloudFront desde un solo workspace. Sin backend hospedado, usa tus perfiles de AWS CLI."
createdAt: "2026-07-10 12:00:00"
imageUrl: "images/s3-studio.png"
tags: "Amazon S3, AWS, CloudFront, S3 Browser, Gestor S3, Desktop App, Tauri, DevOps, AWS CLI, Object Storage"
keywords: "S3 file manager, S3 browser desktop app, CloudFront invalidation tool, AWS S3 GUI client, manage S3 buckets desktop, S3 object editor, Tauri S3 client, source-available S3 tool"
language: "es"
translationGroup: "s3-studio"
---

# S3 Studio: Gestor de Amazon S3 y CloudFront de Escritorio Sin Backend

**S3 Studio** es un cliente de escritorio **source-available** para gestionar buckets de Amazon S3, editar objetos, revisar permisos e invalidar CloudFront desde un solo workspace. Sin backend hospedado, usando tus perfiles de AWS CLI existentes.

**[👉 Ver S3 Studio](https://banegasn.github.io/s3-studio/)** — Explora las características, descarga la última release o revisa el código fuente en GitHub.

---

## El problema de la consola de AWS

Trabajar con **Amazon S3** desde la consola de AWS significa cambiar de pestañas constantemente: una para navegar buckets, otra para editar objetos, otra para revisar permisos, otra para invalidar **CloudFront**. Cada operación abre un nuevo contexto y rompe tu flujo de trabajo.

**S3 Studio** resuelve esto ofreciendo un único workspace de escritorio donde la navegación, el contenido, el contexto y las operaciones de edge permanecen juntos. Es un **cliente S3 de escritorio** construido con Tauri, React y TypeScript que habla directamente con las APIs de AWS sin ningún servicio intermediario.

---

## Qué hace diferente a S3 Studio

**Navega como S3 realmente funciona** — Explora visualmente cuando estés descubriendo, haz clic en cualquier segmento del breadcrumb para saltar hacia atrás, o pega un prefijo exacto cuando ya sabes el destino.

**Transfiere sin perder contexto** — Sube archivos o carpetas, arrastra desde Finder o Explorer, descarga selecciones y elimina prefijos con progreso visible.

**Previsualiza y edita en el sitio** — Inspecciona imágenes y PDFs, abre texto y JSON en el editor Monaco y guarda directamente al objeto S3 seleccionado. Sin descargar-reeditar-subir.

**Entiende el acceso sin ruido de ACLs** — Los controles de ownership y bucket policy toman el protagonismo. Las concesiones ACL legacy permanecen disponibles cuando realmente importan.

**Actualiza la caché del edge** — Encuentra las distribuciones de CloudFront vinculadas y crea invalidaciones de objeto, carpeta con wildcard o selección múltiple al lado del contenido.

<div style="text-align: center; margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px;">
  <h2 style="margin-bottom: 1rem; color: #f8fafc; font-size: 1.4rem;">Pruébalo en tu escritorio</h2>
  <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
    <a href="https://banegasn.github.io/s3-studio/" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #3b82f6; color: white; padding: 1.2rem 2.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s;">
      🚀 Ver S3 Studio
    </a>
    <a href="https://github.com/Banegasn/s3-studio/releases/latest" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1f2937; color: #f8fafc; padding: 1.2rem 2.5rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; border: 1px solid #374151;">
      ⬇️ Descargar última release
    </a>
    <a href="https://github.com/Banegasn/s3-studio" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: transparent; color: #93c5fd; padding: 1.2rem 2rem; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 1.1rem; border: 1px solid #374151;">
      ★ Ver código en GitHub
    </a>
  </div>
  <p style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">macOS Apple Silicon · macOS Intel · Windows x64 · Linux x64 · Linux ARM64</p>
</div>

---

## Sin backend hospedado: tus credenciales se quedan contigo

S3 Studio lee la misma configuración de perfil que usa el **AWS CLI** y se comunica directamente con AWS. No hay migración de cuentas ni capa de sincronización hospedada.

```
# tu configuración local existente
~/.aws/config
~/.aws/credentials
AWS_PROFILE
        │
        ▼
S3 Studio desktop app
        │
        ├── S3
        └── CloudFront
```

> Las operaciones se ejecutan desde la app de escritorio directamente contra las APIs de AWS. El perfil seleccionado solo puede ejecutar las acciones que sus permisos de IAM permitan. Revisa el código fuente en Rust, React y TypeScript o compila la aplicación tú mismo.

---

## Plataformas disponibles

S3 Studio ofrece builds nativos para:

- **macOS Apple Silicon** (M1/M2/M3/M4)
- **macOS Intel**
- **Windows x64**
- **Linux x64**
- **Linux ARM64**

Todas las releases están disponibles en el [GitHub de S3 Studio](https://github.com/Banegasn/s3-studio/releases/latest).

---

## Casos de uso ideales

- **DevOps** — Gestión diaria de buckets S3 e invalidación de CloudFront sin abrir la consola
- **Desarrolladores** — Edición de archivos JSON/TXT directamente en S3
- **Seguridad** — Revisión de permisos de buckets y policies
- **Contenido estático** — Gestión de S3 + CloudFront en un solo flujo
- **Migración** — Transferencia de archivos entre buckets y carpetas locales

---

## Preguntas frecuentes

**¿Cómo se autentica S3 Studio?**
Descubre los perfiles del AWS CLI desde los archivos estándar de configuración y credenciales, además de las variables de entorno de AWS. No te pide subir credenciales a ningún servicio.

**¿S3 realmente tiene carpetas?**
No. Las filas de carpetas son prefijos de S3. S3 Studio las representa como carpetas para navegación manteniendo el comportamiento de prefijos explícito en el inspector y operaciones masivas.

**¿Para qué plataformas está disponible?**
Las releases están construidas para macOS Apple Silicon e Intel, Windows x64, y Linux x64 y ARM64. Consulta la última release para los assets exactos.

**¿Cómo se encuentran los enlaces de CloudFront?**
La app compara los orígenes de CloudFront con el bucket S3 seleccionado, tiene en cuenta los origin paths y sugiere invalidaciones de viewer-path para el contenido seleccionado.

**¿Es gratis?**
Sí, S3 Studio es **source-available** y gratuito. Puedes descargar los binarios o compilar desde el código fuente en GitHub.

---

## Enlaces

- **[Sitio web de S3 Studio](https://banegasn.github.io/s3-studio/)** — Descubre todas las características
- **[Descargar última release](https://github.com/Banegasn/s3-studio/releases/latest)** — Builds para macOS, Windows y Linux
- **[Código fuente en GitHub](https://github.com/Banegasn/s3-studio)** — Star, contribuye e inspecciona
- **[Reportar issues](https://github.com/Banegasn/s3-studio/issues)** — Ayuda a mejorar la herramienta

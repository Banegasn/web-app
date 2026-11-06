export interface MetadataField {
    name: string;
    required: boolean;
    description: string;
}

export const metadataFields: MetadataField[] = [
    {
        name: 'id',
        required: true,
        description:
            'Slug único: letras minúsculas, números y guiones; entre 1 y 100 caracteres. Conserva el de un post existente.',
    },
    {
        name: 'title',
        required: true,
        description: 'Título del artículo, hasta 300 caracteres.',
    },
    {
        name: 'summary',
        required: true,
        description:
            'Resumen del post, hasta 2.000 caracteres. Obligatorio para publicar.',
    },
    {
        name: 'createdAt',
        required: true,
        description:
            'Fecha en ISO 8601. En Studio se completa en «Fecha de publicación»; una fecha futura no programa la publicación.',
    },
    {
        name: 'language',
        required: false,
        description: 'es, en o vacío si no se especifica un idioma.',
    },
    {
        name: 'author',
        required: false,
        description: 'Nombre del autor. Usa el indicado en el encargo.',
    },
    {
        name: 'tags',
        required: true,
        description:
            'Lista de etiquetas; puede ser []. Máximo 30, de hasta 100 caracteres cada una. En el editor, sepáralas con comas.',
    },
    {
        name: 'seoTitle',
        required: false,
        description:
            'Título para buscadores y enlaces compartidos. Si se omite, se utiliza el título del artículo.',
    },
    {
        name: 'keywords',
        required: false,
        description:
            'Palabras clave en una cadena de texto, separadas por comas.',
    },
    {
        name: 'imageUrl',
        required: false,
        description:
            'URL devuelta al subir la portada a Studio, o una URL HTTPS. No uses una ruta local de tu equipo.',
    },
    {
        name: 'translationGroup',
        required: false,
        description:
            'Mismo identificador en las versiones española e inglesa. Cada versión conserva su propio slug e idioma.',
    },
];

export function examplePostPackage(createdAt: string): string {
    return JSON.stringify(
        {
            metadata: {
                id: 'mi-nuevo-post',
                title: 'Un título claro para mi próximo post',
                summary:
                    'Un resumen breve que explica qué aprenderá el lector.',
                createdAt,
                author: 'Nicolás Banegas',
                language: 'es',
                tags: ['Desarrollo', 'Angular'],
                seoTitle: 'Un título claro para mi próximo post',
                keywords: 'desarrollo, Angular',
                imageUrl: '',
                translationGroup: '',
            },
            content:
                'Una introducción al tema.\n\n## Primera sección\n\nEl contenido completo del artículo en Markdown.',
        },
        null,
        2,
    );
}

export function buildAgentInstructions(
    brief: string,
    packageExample: string,
): string {
    return `Prepara un post para el blog banegasn.dev y, si tienes acceso autorizado a Studio, móntalo desde https://banegasn.dev/admin.

ENCARGO
${brief.trim() || '[Describe aquí el tema, la audiencia, el idioma, el objetivo y las fuentes que debe usar el agente.]'}

ENTREGA
Devuelve un único bloque JSON válido, sin explicaciones adicionales, con dos propiedades: metadata (objeto de metadatos) y content (cadena con el artículo completo en Markdown).
Este paquete se importa directamente en Studio → Importar post. Usa esta estructura y sustituye todos los valores por los del artículo:
\`\`\`json
${packageExample}
\`\`\`
Escapa los saltos de línea dentro de content como \\n para que el JSON sea válido. No pongas front matter YAML dentro de content. El contenido no debe superar 500.000 caracteres y el paquete completo no debe superar 1 MB. No incluyas imágenes en base64; se suben por separado.

CONTENIDO
- Escribe en el idioma del encargo y respeta la voz y los datos que te hayan proporcionado.
- Organiza el cuerpo con una introducción clara, encabezados ## y ###, párrafos legibles, listas y bloques de código con su lenguaje cuando corresponda.
- El título se introduce en su campo de Studio; no es necesario duplicarlo como H1 en el cuerpo.
- Verifica los datos y enlaza las fuentes utilizadas. No inventes experiencias del autor, resultados, citas ni URLs de imágenes.
- Usa texto alternativo descriptivo para las imágenes incluidas en Markdown: ![Descripción](URL).

METADATOS
${metadataFields.map((field) => `- ${field.name}${field.required ? ' (requerido)' : ' (opcional)'}: ${field.description}`).join('\n')}
- Sustituye la fecha del ejemplo por la correspondiente al encargo; para un post nuevo sin otra fecha indicada, usa la fecha actual. No cambies la fecha original al editar salvo que se solicite.
- title, summary y content son cadenas de texto. Para publicar, los tres deben tener contenido. Las etiquetas son un array, y keywords es una cadena, no un array.
- No confundas el idioma con el grupo de traducción: crea un post por idioma, con slugs distintos y el mismo translationGroup cuando sean traducciones.

MONTAJE EN STUDIO
1. Inicia sesión únicamente con el acceso que el administrador te haya autorizado. No solicites ni incluyas contraseñas o cookies en el artículo, el JSON, archivos del repositorio o instrucciones compartidas.
2. Abre Studio → Importar post y pega el paquete completo, o sube el archivo .json. También se aceptan entregas anteriores con un bloque json de metadatos y un bloque markdown de contenido.
3. Pulsa «Revisar importación». Si los datos son válidos, abre el borrador en el editor: título, resumen, Markdown y metadatos se completan automáticamente.
4. Si el slug ya existe, elige «Preparar actualización en el editor» solo si estás editando ese artículo. Se conservan la URL, la revisión y el estado de publicación. La importación por sí sola no guarda ni publica; revisa la vista WYSIWYG y los metadatos antes de guardar.
5. Sube las imágenes desde el editor, la portada o Biblioteca. Se aceptan PNG, JPEG, WebP y GIF, hasta 8 MB por archivo. Usa las URLs reales que devuelve Studio; para imágenes del cuerpo, insértalas o pégalas en el editor. Los archivos subidos son accesibles por URL aunque el post esté en borrador.
6. Guarda primero como borrador si es un post nuevo. Revisa el Markdown y su vista visual, portada, enlaces, metadatos, idioma y etiquetas. No retires a borrador un post ya publicado salvo que el encargo lo indique.
7. Publica o actualiza si el encargo lo solicita. Si solo pide preparar contenido, deja un borrador. La fecha es un metadato: «Publicar post» publica ahora.
8. Después de publicar, abre «Ver post publicado» y comprueba el artículo y su portada. Entrega la URL y el estado final al administrador.

PERSISTENCIA Y EDICIONES
Los posts e imágenes se guardan desde Studio y no requieren commits ni despliegues de código. No crees archivos en content/posts para publicar un artículo nuevo. No cambies la estructura del sitio para incorporar contenido.
Si aparece un conflicto de edición, conserva tu texto, vuelve a cargar la versión actual y concilia los cambios; no fuerces una sobrescritura. Si usas una integración autorizada con la API, obtén la revisión actual antes de guardar: no inventes revision ni updatedAt.
`;
}

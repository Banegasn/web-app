import { Parser } from 'htmlparser2';
import { englishFinding, englishError } from './seo-findings.en';

export type SeoLanguage = 'es' | 'en';

export const MAX_HTML_BYTES = 500 * 1024;
export interface Finding {
    status: 'urgent' | 'review' | 'pending' | 'info' | 'ok';
    id: string; title: string; detail: string; why: string; action: string; example?: string; needsUrl?: boolean;
}
export interface SeoReport {
    title: string; description: string; canonical: string; headings: string[];
    words: number; images: number; missingAlt: number; internalLinks: number | null;
    linkExamples: { text: string; href: string }[];
    schemaTypes: string[]; findings: Finding[]; query: string; matchedTerms: string[]; terms: string[];
    facts: {
        titleCount: number; descriptionCount: number; blocked: boolean; robots: string[];
        canonicalCount: number; differentCanonical: boolean; language: string; viewport: boolean;
        jsonLdCount: number; invalidJsonLd: number; candidateLinks: number; descriptiveLinks: number;
        queryCoverage: { title: number; heading: number; body: number } | null;
    };
}
export const SAMPLE_HTML = `<!doctype html>
<html lang="es"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Transfer de Hotel Ejemplo al aeropuerto | TrustRide</title>
<meta name="description" content="Reserva un transfer privado desde Hotel Ejemplo al aeropuerto. Consulta el punto de recogida, equipaje y disponibilidad antes de confirmar tu viaje.">
<link rel="canonical" href="https://example.com/destinos/hotel-ejemplo-aeropuerto">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":"Transfer de Hotel Ejemplo al aeropuerto","provider":{"@type":"Organization","name":"TrustRide"}}</script>
</head><body><main>
<h1>Transfer de Hotel Ejemplo al aeropuerto</h1>
<p>Un traslado privado desde tu hotel al aeropuerto, con reserva anticipada.</p>
<h2>¿Dónde me recoge el conductor?</h2><p>Confirma el punto de recogida con el equipo al reservar.</p>
<h2>¿Puedo llevar equipaje especial?</h2><p>Indica cuántas maletas llevas para confirmar el vehículo adecuado.</p>
<a href="/reservar">Consultar disponibilidad y reservar</a>
<a href="/destinos">Ver otros destinos</a>
</main></body></html>`;

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function httpUrl(value: string, base?: string): URL | undefined {
    try {
        const url = new URL(value, base);
        return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url : undefined;
    } catch { return undefined; }
}

/** Text-only parsing: never mounts HTML, executes scripts, or loads external resources. */
function analyzeSeoRaw(html: string, pageUrl = '', query = ''): SeoReport {
    if (!html.trim()) throw new Error('Pega el código fuente HTML de una página.');
    if (html.length > MAX_HTML_BYTES || new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
        throw new Error('El HTML supera el límite de 500 KiB. Analiza una sola página más pequeña.');
    }
    if (pageUrl.length > 2048 || query.length > 200) throw new Error('La URL o la búsqueda supera el límite permitido.');
    const baseUrl = pageUrl.trim() ? httpUrl(pageUrl.trim()) : undefined;
    if (pageUrl.trim() && !baseUrl) throw new Error('Usa una URL completa http:// o https:// sin credenciales.');
    const titles: string[] = [], descriptions: string[] = [], canonicals: string[] = [], robots: string[] = [];
    const headings: string[] = [], jsonLd: string[] = [], body: string[] = [];
    const links: { text: string; href: string }[] = [];
    const stack: { tag: string; excluded: boolean; hidden: boolean; text: string; href?: string; fallback?: string }[] = [];
    let nodes = 0, elements = 0, images = 0, missingAlt = 0, language = '', htmlBase = '', viewport = false;
    const parser = new Parser({
        onopentag(tag, attrs) {
            if (++nodes > 20000 || stack.length >= 128) throw new Error('HTML demasiado complejo: máximo 20.000 nodos y 128 niveles.');
            elements++;
            const hidden = !!stack.at(-1)?.hidden || ['head', 'script', 'style', 'template', 'noscript'].includes(tag)
                || 'hidden' in attrs || attrs['aria-hidden'] === 'true';
            const excluded = hidden || !!stack.at(-1)?.excluded || ['nav', 'footer'].includes(tag);
            stack.push({ tag, excluded, hidden, text: '', href: tag === 'a' ? attrs['href']?.trim() : undefined, fallback: attrs['aria-label'] || attrs['title'] });
            if (tag === 'html') language = attrs['lang'] || '';
            if (tag === 'base' && !htmlBase) htmlBase = attrs['href'] || '';
            if (tag === 'meta') {
                const name = (attrs['name'] || '').toLowerCase();
                if (name === 'description') descriptions.push(clean(attrs['content'] || ''));
                if (name === 'viewport' && /(?:^|[,\s])width\s*=\s*device-width(?:$|[,\s])/i.test(attrs['content'] || '')) viewport = true;
                if (['robots', 'googlebot'].includes(name)) robots.push((attrs['content'] || '').toLowerCase());
            }
            if (tag === 'link' && (attrs['rel'] || '').toLowerCase().split(/\s+/).includes('canonical')) canonicals.push(attrs['href'] || '');
            if (tag === 'img' && !hidden) {
                images++; if (!('alt' in attrs)) missingAlt++;
                for (const item of stack) if (item.tag === 'a') item.text += ` ${attrs['alt'] || ''}`;
            }
            if (tag === 'script' && (attrs['type'] || '').toLowerCase().trim() === 'application/ld+json') {
                if (jsonLd.length >= 30) throw new Error('Máximo 30 bloques JSON-LD por análisis.');
                jsonLd.push('');
                stack[stack.length - 1].text = `json:${jsonLd.length - 1}`;
            }
            if (/^(p|div|section|article|main|h[1-6]|li|br)$/.test(tag) && !excluded) body.push(' ');
        },
        ontext(text) {
            if (++nodes > 20000) throw new Error('HTML demasiado complejo: máximo 20.000 nodos.');
            const current = stack.at(-1);
            if (current?.tag === 'script' && current.text.startsWith('json:')) {
                const index = Number(current.text.slice(5));
                jsonLd[index] += text;
            }
            for (const item of stack) if (item.tag === 'title' || (!current?.hidden && (item.tag === 'a' || /^h[1-6]$/.test(item.tag)))) item.text += text;
            if (current && !current.excluded) body.push(text);
        },
        onclosetag() {
            const item = stack.pop();
            if (item?.tag === 'title') titles.push(clean(item.text));
            if (item?.tag === 'a' && !item.hidden && item.href) links.push({ href: item.href, text: clean(item.text) || clean(item.fallback || '') });
            if (item?.tag === 'h1' && !item.excluded) headings.push(clean(item.text));
            if (item && !item.excluded) body.push(' ');
        },
    }, { decodeEntities: true });
    parser.end(html);
    if (!elements) throw new Error('No se han detectado etiquetas HTML. Copia el código fuente, no solo el texto.');
    const findings: Finding[] = [];
    const add = (status: Finding['status'], title: string, detail: string, why: string, action: string, extra: Partial<Pick<Finding, 'example' | 'needsUrl'>> = {}) => {
        const ids: Record<string, string> = {
            'Título de la página': 'title', 'Descripción para el resultado': 'description', 'Encabezado principal': 'heading',
            'Directivas de indexación en HTML': 'indexing', 'Fragmentos restringidos': 'snippets', 'URL canónica': 'canonical',
            'Idioma del documento': 'language', 'Contenido en el HTML aportado': 'content', 'Alternativas de las imágenes': 'images',
            'Enlaces a otras páginas de tu web': 'links', 'Sintaxis JSON-LD': 'schema', 'Cobertura literal de la búsqueda': 'query',
        };
        findings.push({ id: ids[title], status, title, detail, why, action, ...extra });
    };
    const title = titles[0] || '', description = descriptions[0] || '';
    add(!title ? 'urgent' : titles.length > 1 ? 'review' : 'ok', 'Título de la página',
        `${titles.length} etiquetas <title>. ${title ? `La primera dice: «${title}» (${title.length} caracteres).` : 'No hay un título con texto.'}`,
        'El título ayuda a reconocer qué ofrece esta página en la pestaña del navegador y en los resultados de búsqueda.',
        !title ? 'Añade un título específico en el <head>: el servicio y el destino son un buen punto de partida.'
            : titles.length > 1 ? 'Deja una sola etiqueta <title>. Revisa si tu plantilla y tu sistema de SEO están añadiendo el título a la vez.'
                : 'No hay un problema técnico con el título. Comprueba que describe esta página concreta y la distingue de las demás.',
        !title ? { example: '<title>Transfer de Hotel Ejemplo al aeropuerto | Tu marca</title>' } : {});
    add(description && descriptions.length === 1 ? 'ok' : 'review', 'Descripción para el resultado',
        `${descriptions.length} descripciones encontradas. ${description ? `La primera dice: «${description}».` : 'No hay una descripción con texto.'}`,
        'Puede servir como resumen del resultado. Google puede elegir otro fragmento según la búsqueda.',
        descriptions.length > 1 ? 'Deja una sola meta description que resuma la propuesta de esta página.'
            : !description ? 'Añade una meta description en el <head> explicando qué ofreces y qué puede hacer el cliente.'
                : 'No se detectaron problemas de presencia o duplicación. Revisa que el resumen sea fiel al contenido.',
        !description ? { example: '<meta name="description" content="Consulta recogida, equipaje y disponibilidad para tu transfer desde Hotel Ejemplo al aeropuerto.">' } : {});
    add(headings.length === 1 && !!headings[0] ? 'ok' : 'review', 'Encabezado principal',
        `${headings.length} encabezados <h1>. ${headings.length ? `Texto: ${headings.map(h => `«${h}»`).join('; ')}.` : ''}`,
        'Un encabezado principal claro ayuda al visitante a confirmar que ha llegado a la página adecuada. Varios H1 no implican una penalización automática.',
        !headings.length || !headings[0] ? 'Incluye un H1 visible que explique el servicio o tema principal.'
            : headings.length > 1 ? 'Comprueba si todos son encabezados principales. Usa H2 para apartados como recogida, equipaje y reservas.'
                : 'No hace falta cambiar su estructura. Revisa que el encabezado coincida con la necesidad que resuelve la página.',
        !headings.length ? { example: '<h1>Transfer de Hotel Ejemplo al aeropuerto</h1>' } : {});
    const blocked = robots.some(value => /(?:^|[\s,])(noindex|none)(?=$|[\s,])/.test(value));
    const noSnippet = robots.some(value => /(?:^|[\s,])nosnippet(?=$|[\s,])|max-snippet\s*:\s*0(?:$|[\s,])/.test(value));
    add(blocked ? 'urgent' : 'ok', 'Directivas de indexación en HTML',
        blocked ? `Se encontró una instrucción que pide no indexar: ${robots.join('; ')}.` : 'No se encontró noindex ni none en las etiquetas meta robots/Googlebot.',
        'noindex pide a Google excluir la página de sus resultados. Es correcto en páginas privadas, de pruebas o que no quieres posicionar.',
        blocked ? 'Si esta página debe aparecer en Google, elimina noindex o none de su meta robots/Googlebot. Vuelve a analizar el HTML y revisa la URL en Search Console. Si la exclusión es intencionada, mantenla.'
            : 'No necesitas cambiar estas etiquetas por este resultado. Para confirmar si Google ha indexado la página, usa Inspección de URLs en Search Console; aquí no se comprueban cabeceras HTTP ni robots.txt.');
    if (noSnippet) add('review', 'Fragmentos restringidos',
        `Se encontró nosnippet o max-snippet:0 en: ${robots.join('; ')}.`,
        'Estas instrucciones restringen el texto que puede mostrarse como fragmento en los resultados.',
        'Si quieres permitir un resumen de esta página, revisa y elimina la restricción correspondiente. Consérvala si responde a una decisión editorial.');
    const resolvedBase = httpUrl(htmlBase, baseUrl?.href)?.href || baseUrl?.href;
    const canonicalUrl = canonicals[0] ? httpUrl(canonicals[0], resolvedBase) : undefined;
    const differentCanonical = !!(canonicalUrl && baseUrl && canonicalUrl.href.split('#')[0] !== baseUrl.href.split('#')[0]);
    const needsCanonicalUrl = canonicals.length === 1 && !!canonicals[0] && !resolvedBase
        && !httpUrl(canonicals[0]) && !/^[a-z][a-z0-9+.-]*:/i.test(canonicals[0]);
    add(!canonicals.length ? 'info' : needsCanonicalUrl ? 'pending'
        : canonicals.length === 1 && canonicalUrl && !differentCanonical ? 'ok' : 'review', 'URL canónica',
        !canonicals.length ? 'No se encontró una etiqueta rel="canonical".'
            : `Se encontraron ${canonicals.length} etiquetas. Valor de la primera: «${canonicals[0]}».`,
        'La canonical indica qué dirección prefieres cuando varias URLs muestran el mismo contenido. Su ausencia no demuestra por sí sola un problema.',
        needsCanonicalUrl ? 'Añade arriba la URL completa de la página que has copiado y pulsa «Analizar mi HTML» para resolver esta dirección relativa. No necesitas cambiar tu web para completar esta comprobación.'
            : !canonicals.length ? 'Comprueba si la página tiene variantes duplicadas. Si las tiene, elige la URL preferida y declara una única canonical hacia ella.'
                : canonicals.length > 1 ? 'Deja una sola canonical. Revisa si hay dos plugins o plantillas generándola.'
                    : !canonicalUrl ? 'Corrige la canonical para que apunte a una dirección HTTP(S) válida.'
                        : differentCanonical ? `Confirma si quieres que Google agrupe esta página con ${canonicalUrl.href}. Si no, cambia la canonical a la URL preferida de esta página.`
                            : 'La dirección se puede resolver. Si existen duplicados, comprueba que todos señalan a la versión que realmente quieres mostrar.',
        needsCanonicalUrl ? { needsUrl: true } : {});
    add(language.trim() ? 'ok' : 'review', 'Idioma del documento',
        language.trim() ? `El documento declara lang="${language}".` : 'El elemento <html> no declara un idioma.',
        'El atributo lang ayuda a los lectores de pantalla a pronunciar el contenido en el idioma correcto.',
        language.trim() ? 'No necesitas añadir este atributo. Comprueba que el idioma declarado coincide con el texto.'
            : 'Añade lang al elemento <html>. Usa es para español o el código correspondiente al idioma real.',
        !language.trim() ? { example: '<html lang="es">' } : {});
    const text = clean(body.join(''));
    const words = text.split(/\s+/).filter(Boolean).length;
    add(words ? 'ok' : 'review', 'Contenido en el HTML aportado',
        `${words} palabras fuera de cabecera técnica, scripts, navegación, pie y elementos explícitamente ocultos.`,
        'Permite comprobar si este HTML ya contiene texto útil. No hay un mínimo universal de palabras y no se ejecuta JavaScript ni se interpreta CSS.',
        words ? 'No añadas texto solo para aumentar esta cifra. Comprueba que se explican el servicio, las condiciones y cómo reservar.'
            : 'Si has pegado el código fuente original, comprueba dónde se genera el contenido. Verifica el HTML renderizado con Inspección de URLs de Search Console y revisa SSR o prerender con quien desarrolla la web.');
    add(missingAlt ? 'review' : 'ok', 'Alternativas de las imágenes',
        `${images} imágenes detectadas; ${missingAlt} sin atributo alt. Se incluyen navegación y pie; no se interpreta CSS.`,
        'El texto alternativo permite entender una imagen cuando no puede verse o se utiliza un lector de pantalla.',
        missingAlt ? 'Revisa las etiquetas <img> sin alt. Describe las imágenes informativas; usa alt="" en las que solo decoran.'
            : 'No se detectaron imágenes sin alt. Si hay imágenes informativas, revisa que sus descripciones sean útiles; un alt vacío es válido para decoración.',
        missingAlt ? { example: '<img src="vehiculo.jpg" alt="Vehículo de transfer con espacio para equipaje">' } : {});
    const candidateLinks = links.filter(link => !link.href.startsWith('#') && !/^(?:mailto|tel|javascript|data):/i.test(link.href));
    const classifiedLinks = resolvedBase ? candidateLinks.filter(link => {
        const resolved = httpUrl(link.href, resolvedBase);
        return resolved && resolved.origin === (baseUrl?.origin || new URL(resolvedBase).origin);
    }) : [];
    const internalLinks = resolvedBase ? classifiedLinks.length : null;
    const linkExamples = (resolvedBase ? classifiedLinks : candidateLinks).slice(0, 5)
        .map(link => ({ text: link.text.slice(0, 160), href: link.href.slice(0, 2048) }));
    add(internalLinks === null ? 'pending' : internalLinks ? 'ok' : 'review', 'Enlaces a otras páginas de tu web',
        internalLinks === null ? `Falta la dirección de la página. Hay ${candidateLinks.length} enlaces candidatos, pero no sabemos cuáles llevan a tu propia web.`
            : `${internalLinks} enlaces hacia otras URLs del mismo sitio. Referencia: ${baseUrl?.href || resolvedBase}. Incluye navegación y pie.`,
        'Son enlaces desde esta página a otras páginas de tu propia web, como «Reservar» u «Otros destinos». Ayudan al visitante a continuar y a descubrir contenido relacionado.',
        internalLinks === null ? 'En «URL de la página», pega la dirección completa de la página cuyo HTML has copiado. Después pulsa «Analizar mi HTML». Este estado no es un error de tu web.'
            : !internalLinks ? 'Comprueba si al visitante le falta un siguiente paso. Si tienes una página de reservas o destinos relacionados, añade un enlace con texto que explique adónde lleva.'
                : 'No necesitas añadir enlaces por alcanzar una cifra. Revisa los ejemplos y confirma que llevan a páginas útiles. Abre los destinos en tu web para comprobar que funcionan.',
        internalLinks === null ? { needsUrl: true, example: 'Si copiaste el HTML de https://tuweb.com/destinos/hotel-ejemplo, esa es la dirección que debes indicar.' }
            : !internalLinks ? { example: '<a href="/reservar">Consultar disponibilidad y reservar</a>' } : {});
    const schemaTypes = new Set<string>();
    let invalid = 0;
    for (const block of jsonLd) {
        if (block.length > 50000) throw new Error('Un bloque JSON-LD supera el límite de 50.000 caracteres.');
        try {
            const pending: unknown[] = [JSON.parse(block)];
            const blockTypes = new Set<string>();
            let visited = 0;
            while (pending.length) {
                if (++visited > 2000) throw new Error('JSON-LD demasiado complejo.');
                const value = pending.pop();
                if (Array.isArray(value)) pending.push(...value);
                else if (value && typeof value === 'object') {
                    const record = value as Record<string, unknown>;
                    const types = Array.isArray(record['@type']) ? record['@type'] : [record['@type']];
                    types.forEach(type => { if (typeof type === 'string') blockTypes.add(type); });
                    pending.push(...Object.values(record).filter(v => v !== null && typeof v === 'object'));
                }
            }
            blockTypes.forEach(type => schemaTypes.add(type));
        } catch { invalid++; }
    }
    add(invalid ? 'review' : !jsonLd.length ? 'info' : 'ok', 'Sintaxis JSON-LD',
        `${jsonLd.length} bloques de datos estructurados; ${invalid} inválidos o demasiado complejos. Tipos legibles: ${[...schemaTypes].join(', ') || 'ninguno'}.`,
        'JSON-LD describe entidades, como un servicio o una organización. Leer su sintaxis no confirma que cumpla los requisitos de resultados enriquecidos.',
        invalid ? 'Busca los scripts de tipo application/ld+json y valida su JSON: comillas, comas y llaves. Si son muy grandes, simplifícalos. Después revisa la página con Rich Results Test.'
            : !jsonLd.length ? 'No añadas marcado solo para completar un checklist. Decide si hay entidades que describir y un tipo adecuado para el contenido real.'
                : 'No se detectaron errores de sintaxis dentro de los límites del análisis. Usa Rich Results Test para comprobar los tipos admitidos y sus requisitos.');
    const stopWords = new Set(['de', 'del', 'el', 'la', 'los', 'las', 'un', 'una', 'a', 'al', 'en', 'y', 'o', 'para', 'por', 'con', 'como', 'que', 'the', 'to', 'from', 'in', 'and', 'of', 'for']);
    const terms = [...new Set(normalize(query).match(/[\p{L}\p{N}]+/gu) || [])].filter(term => !stopWords.has(term) && term.length > 1);
    const contentWords = new Set(normalize(`${title} ${headings.join(' ')} ${text}`).match(/[\p{L}\p{N}]+/gu) || []);
    const matchedTerms = terms.filter(term => contentWords.has(term));
    const coverage = (value: string) => {
        const tokens = new Set(normalize(value).match(/[\p{L}\p{N}]+/gu) || []);
        return terms.filter(term => tokens.has(term)).length / terms.length;
    };
    const genericAnchors = new Set(['aqui', 'clic aqui', 'haz clic aqui', 'ver mas', 'leer mas', 'mas', 'mas informacion', 'click here', 'here', 'read more', 'learn more', 'more', 'more info']);
    const descriptiveLinks = candidateLinks.filter(link => {
        const label = normalize(clean(link.text));
        return label && !genericAnchors.has(label);
    }).length;
    if (terms.length) add('info', 'Cobertura literal de la búsqueda',
        `${matchedTerms.length}/${terms.length} términos de tu búsqueda aparecen en el título, H1 o texto. Ausentes: ${terms.filter(term => !matchedTerms.includes(term)).join(', ') || 'ninguno'}.`,
        'Solo se comparan palabras, normalizando acentos y mayúsculas. Una palabra ausente puede estar expresada con un sinónimo; esto no mide calidad, intención ni posiciones.',
        'Lee la página pensando en esa búsqueda. Si falta una respuesta relevante, añádela con información real. No repitas términos solo para que esta comprobación coincida.');
    const order: Finding['status'][] = ['urgent', 'review', 'pending', 'info', 'ok'];
    return { title, description, canonical: canonicalUrl?.href || '', headings, words, images, missingAlt, internalLinks, linkExamples, schemaTypes: [...schemaTypes],
        findings: findings.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status)), query, matchedTerms, terms,
        facts: {
            titleCount: titles.length, descriptionCount: descriptions.length, blocked, robots,
            canonicalCount: canonicals.length, differentCanonical, language, viewport,
            jsonLdCount: jsonLd.length, invalidJsonLd: invalid, candidateLinks: candidateLinks.length, descriptiveLinks,
            queryCoverage: terms.length ? { title: coverage(title), heading: coverage(headings.join(' ')), body: coverage(text) } : null,
        },
    };
}

export function analyzeSeo(html: string, pageUrl = '', query = '', language: SeoLanguage = 'es'): SeoReport {
    try {
        const report = analyzeSeoRaw(html, pageUrl, query);
        if (language === 'en') report.findings = report.findings.map(finding => englishFinding(finding, report));
        return report;
    } catch (error) {
        if (language === 'en') throw new Error(englishError(error instanceof Error ? error.message : ''));
        throw error;
    }
}

import type { SeoLanguage, SeoReport } from './seo-analyzer';

export interface ScoreCriterion {
    id: string; label: string; weight: number; ratio: number | null;
    evidence: string; action: string;
}
export interface ScoreArea { id: string; label: string; score: number | null; coverage: number; criteria: ScoreCriterion[] }
export interface SeoScore { overall: number | null; coverage: number; earned: number; measured: number; blocked: boolean; areas: ScoreArea[] }

/** Editorial HTML checks, not a model of Google's ranking weights. Version 1. */
export function scoreSeo(report: SeoReport, language: SeoLanguage = 'es'): SeoScore {
    const t = (es: string, en: string) => language === 'es' ? es : en;
    const f = report.facts;
    const areas: ScoreArea[] = [];
    const criterion = (id: string, label: string, weight: number, ratio: number | null, evidence: string, action: string): ScoreCriterion => ({ id, label, weight, ratio, evidence, action });
    const addArea = (id: string, label: string, criteria: ScoreCriterion[]) => {
        const applicable = criteria.filter(c => !(c.id === 'alt' && report.images === 0) && !(c.id === 'link-text' && report.facts.candidateLinks === 0));
        const measured = criteria.reduce((n, c) => n + (c.ratio === null ? 0 : c.weight), 0);
        const earned = criteria.reduce((n, c) => n + (c.ratio ?? 0) * c.weight, 0);
        const available = applicable.reduce((n, c) => n + c.weight, 0);
        areas.push({ id, label, criteria, score: measured ? Math.round(earned / measured * 100) : null, coverage: available ? Math.round(measured / available * 100) : 100 });
    };
    addArea('access', t('Acceso y texto inicial', 'Access & initial text'), [
        criterion('indexable', t('Sin bloqueo noindex en HTML', 'No HTML noindex block'), 10, f.blocked ? 0 : 1,
            f.blocked ? t('Detectado noindex / none.', 'noindex / none detected.') : t('Sin noindex en meta robots/Googlebot.', 'No noindex in robots/Googlebot meta tags.'),
            t('Si debe ser pública, retira noindex. Confirma indexación en Search Console.', 'If this page should be public, remove noindex. Confirm indexing in Search Console.')),
        criterion('initial-text', t('Texto disponible sin ejecutar JavaScript', 'Text available without running JavaScript'), 10, report.words > 0 ? 1 : 0,
            t(`${report.words} palabras en el HTML. No se aplica un mínimo de palabras.`, `${report.words} words in the HTML. No minimum word count is applied.`),
            t('Si falta texto, revisa el código fuente y el renderizado con tu desarrollador.', 'If text is missing, review the source and rendering with your developer.')),
    ]);
    addArea('structure', t('Presentación y estructura', 'Presentation & structure'), [
        criterion('title', t('Un título no vacío', 'One non-empty title'), 8, f.titleCount === 1 && report.title ? 1 : 0,
            t(`${f.titleCount} etiquetas title.`, `${f.titleCount} title elements.`), t('Usa un único título que describa esta página.', 'Use one title describing this page.')),
        criterion('description', t('Una descripción no vacía', 'One non-empty description'), 6, f.descriptionCount === 1 && report.description ? 1 : 0,
            t(`${f.descriptionCount} meta descriptions.`, `${f.descriptionCount} meta descriptions.`), t('Añade un resumen específico en una sola meta description.', 'Add a specific summary in one meta description.')),
        criterion('heading', t('Un encabezado principal no vacío', 'One non-empty main heading'), 6, report.headings.length === 1 && report.headings[0] ? 1 : 0,
            t(`${report.headings.length} H1. Es un criterio editorial, no una regla de penalización de Google.`, `${report.headings.length} H1s. This is an editorial check, not a Google penalty rule.`),
            t('Aclara el título principal y la jerarquía de apartados.', 'Clarify the main heading and section hierarchy.')),
    ]);
    addArea('navigation', t('Navegación y enlaces', 'Navigation & links'), [
        criterion('internal-links', t('Enlaces a tu propia web', 'Links to your own website'), 10, report.internalLinks === null ? null : report.internalLinks > 0 ? 1 : 0,
            report.internalLinks === null ? t('Falta la URL: no se ha medido.', 'Page URL missing: not measured.') : t(`${report.internalLinks} enlaces internos. No hay una cantidad ideal.`, `${report.internalLinks} internal links. There is no ideal number.`),
            t('Indica la URL y comprueba que haya un siguiente paso útil.', 'Provide the page URL and check for a useful next step.')),
        criterion('link-text', t('Textos de enlace identificables', 'Identifiable link text'), 10, f.candidateLinks ? f.descriptiveLinks / f.candidateLinks : null,
            t(`${f.descriptiveLinks}/${f.candidateLinks} enlaces con texto no vacío y no genérico. Es una heurística.`, `${f.descriptiveLinks}/${f.candidateLinks} links with non-empty, non-generic text. This is a heuristic.`),
            t('Sustituye enlaces vacíos o «clic aquí» por una descripción del destino.', 'Replace empty links or “click here” with a description of the destination.')),
    ]);
    addArea('accessibility', t('Accesibilidad básica', 'Basic accessibility'), [
        criterion('alt', t('Imágenes con atributo alt', 'Images with an alt attribute'), 12, report.images ? (report.images - report.missingAlt) / report.images : null,
            report.images ? t(`${report.images - report.missingAlt}/${report.images} imágenes con alt; los vacíos no se penalizan.`, `${report.images - report.missingAlt}/${report.images} images have alt; empty values are not penalized.`) : t('Sin imágenes: criterio no aplicable.', 'No images: this criterion does not apply.'),
            t('Describe imágenes informativas y deja alt="" para las decorativas.', 'Describe informative images and use alt="" for decoration.')),
        criterion('language', t('Idioma declarado', 'Declared language'), 4, f.language.trim() ? 1 : 0,
            f.language || t('No hay lang en html.', 'No lang attribute on html.'), t('Declara el idioma real en <html lang="…">.', 'Declare the actual language in <html lang="…">.')),
        criterion('viewport', t('Viewport adaptable declarado', 'Responsive viewport declared'), 4, f.viewport ? 1 : 0,
            t(f.viewport ? 'Encontrado width=device-width. No prueba usabilidad móvil.' : 'No se encontró width=device-width en meta viewport.', f.viewport ? 'Found width=device-width. This does not prove mobile usability.' : 'No width=device-width in a viewport meta tag.'),
            t('Añade meta viewport y verifica visualmente la página en móvil.', 'Add a viewport meta tag and visually check the page on mobile.')),
    ]);
    const q = f.queryCoverage;
    addArea('focus', t('Foco de la búsqueda', 'Query focus'), [
        criterion('query-title', t('Términos de la búsqueda en el título', 'Query terms in the title'), 8, q?.title ?? null,
            q ? t(`${Math.round(q.title * 100)}% de los términos.`, `${Math.round(q.title * 100)}% of query terms.`) : t('Añade una búsqueda objetivo para medirlo.', 'Add a target query to measure this.'),
            t('Comprueba si el título representa la búsqueda. Los sinónimos pueden ser mejores que una coincidencia literal.', 'Check whether the title represents the search. Synonyms can be better than a literal match.')),
        criterion('query-heading', t('Términos de la búsqueda en el H1', 'Query terms in the H1'), 6, q?.heading ?? null,
            q ? t(`${Math.round(q.heading * 100)}% de los términos.`, `${Math.round(q.heading * 100)}% of query terms.`) : t('Búsqueda objetivo pendiente.', 'Target query not provided.'),
            t('Haz que el encabezado explique la necesidad que resuelve la página.', 'Make the heading explain the need the page addresses.')),
        criterion('query-body', t('Términos de la búsqueda en el texto', 'Query terms in the text'), 6, q?.body ?? null,
            q ? t(`${Math.round(q.body * 100)}% de los términos.`, `${Math.round(q.body * 100)}% of query terms.`) : t('Búsqueda objetivo pendiente.', 'Target query not provided.'),
            t('Añade respuestas que falten, sin repetir palabras para subir la nota. No se evalúa significado ni intención.', 'Add missing answers without repeating words for a higher score. Meaning and intent are not evaluated.')),
    ]);
    const all = areas.flatMap(area => area.criteria);
    const applicable = all.filter(c => !(c.id === 'alt' && report.images === 0) && !(c.id === 'link-text' && f.candidateLinks === 0));
    const measured = applicable.reduce((n, c) => n + (c.ratio === null ? 0 : c.weight), 0);
    const total = applicable.reduce((n, c) => n + c.weight, 0);
    const earned = applicable.reduce((n, c) => n + (c.ratio ?? 0) * c.weight, 0);
    return { overall: measured ? Math.round(earned / measured * 100) : null, coverage: Math.round(measured / total * 100), earned, measured, blocked: f.blocked, areas };
}

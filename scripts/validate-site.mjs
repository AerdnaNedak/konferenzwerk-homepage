import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteOrigin = "https://konferenzwerk.com";
const translations = [
  ["index.html", "en/index.html"],
  ["konferenzentwicklung/index.html", "en/conference-design/index.html"],
  ["assistenztage/index.html", "en/assistant-days/index.html"],
  ["rechtliches/index.html", "en/legal/index.html"]
];
const indexablePages = new Set(translations.flat());
const pages = [...indexablePages, "impressum/index.html", "datenschutz/index.html", "404.html"];
const failures = [];
const titles = new Map();
const entityFacts = new Map();
const pageDocuments = new Map();

const sitemapXml = readFileSync(resolve(root, "sitemap.xml"), "utf8");
const sitemapEntries = new Map(
  [...sitemapXml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g)]
    .map((match) => [match[1], match[2]])
);

const fail = (file, message) => failures.push(`${file}: ${message}`);

const decodeEntities = (value) => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&nbsp;/g, " ")
  .replace(/&ndash;/g, "–")
  .replace(/&mdash;/g, "—")
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&#x([\da-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)));

const normalize = (value) => decodeEntities(value)
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Markup-Beispiele in Skripten, Styles und Kommentaren sind keine HTML-Elemente.
const elementMarkup = (html) => html
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");

const attributeValues = (markup, attribute) => [...markup.matchAll(/<[a-z][^>]*>/gi)]
  .flatMap(([tag]) => [...tag.matchAll(new RegExp(`\\s${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "gi"))]
    .map((match) => decodeEntities(match[1] ?? match[2] ?? match[3])));

const documentOf = (file) => {
  if (!pageDocuments.has(file)) {
    const html = readFileSync(file, "utf8");
    const markup = elementMarkup(html);
    const idValues = attributeValues(markup, "id");
    const anchorNames = attributeValues((markup.match(/<a\b[^>]*>/gi) || []).join(""), "name");
    pageDocuments.set(file, { html, markup, idValues, ids: new Set(idValues), anchors: new Set([...idValues, ...anchorNames]) });
  }
  return pageDocuments.get(file);
};

const checkFragment = (page, reference) => {
  let url;
  try {
    url = new URL(reference, `${siteOrigin}/${page.replace(/index\.html$/, "")}`);
  } catch {
    return; // Lokale Dateipfade prüft weiterhin die vorhandene Dateiverweis-Prüfung.
  }
  if (url.origin !== siteOrigin || !url.hash) return;

  // Textfragmente brauchen keine Element-ID, ein davor stehendes Sprungziel schon.
  const encodedFragment = url.hash.slice(1).split(":~:text=", 1)[0];
  if (!encodedFragment) return;
  let fragment;
  let file;
  try {
    fragment = decodeURIComponent(encodedFragment);
    file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
  } catch {
    fail(page, `interner Sprunglink enthält eine ungültige URL-Kodierung: ${reference}`);
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, "index.html");
  if (!existsSync(file)) {
    fail(page, `Zielseite des internen Sprunglinks fehlt: ${reference}`);
  } else if (/\.html?$/i.test(file)) {
    const target = documentOf(file);
    if (!target.anchors.has(fragment) && fragment.toLowerCase() !== "top") {
      fail(page, `internes Sprungziel fehlt: ${reference} (#${fragment})`);
    }
  }
};

// Diese JSON-LD-Listen beschreiben Fakten ohne festgelegte Reihenfolge.
const orderedFacts = (value) => {
  if (Array.isArray(value)) return value.map(orderedFacts).sort((a, b) => String(JSON.stringify(a)).localeCompare(String(JSON.stringify(b))));
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, orderedFacts(value[key])]));
  return value;
};

const asArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value];

const compareEntityFacts = (page, entity, fields, group) => {
  if (!entity) return;
  for (const field of fields) {
    const value = field === "languageCodes"
      ? asArray(entity.knowsLanguage).map((language) => language?.alternateName ?? language)
      : entity[field];
    const key = `${entity["@id"]}|${group}|${field}`;
    const fact = JSON.stringify(orderedFacts(value));
    if (!entityFacts.has(key)) entityFacts.set(key, { page, fact });
    else if (entityFacts.get(key).fact !== fact) {
      fail(page, `Entitätsangabe ${entity["@id"]} ${field} weicht von ${entityFacts.get(key).page} ab (${group})`);
    }
  }
};

const localPath = (page, reference) => {
  const clean = reference.split(/[?#]/, 1)[0];
  if (!clean || clean === "/" || /^(?:https?:|mailto:|tel:|data:)/.test(clean)) return null;
  return clean.startsWith("/") ? resolve(root, clean.slice(1)) : resolve(root, dirname(page), clean);
};

const jpegSize = (file) => {
  const data = readFileSync(file);
  if (data.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    const length = data.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += length + 2;
  }
  return null;
};

for (const page of pages) {
  const { html, markup, idValues, ids } = documentOf(resolve(root, page));
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) fail(page, `erwartet genau eine H1, gefunden: ${h1Count}`);

  const repeatedIds = new Set(idValues.filter((id, index) => idValues.indexOf(id) !== index));
  for (const id of repeatedIds) fail(page, `ID ist mehrfach vorhanden: #${id}`);
  for (const reference of attributeValues(markup, "href")) checkFragment(page, reference);
  for (const match of html.matchAll(/<section\b([^>]*)>/g)) {
    const label = match[1].match(/aria-labelledby="([^"]+)"/)?.[1];
    if (!label) fail(page, "ein <section>-Bereich hat kein aria-labelledby");
    else if (!ids.has(label)) fail(page, `aria-labelledby verweist auf fehlende ID #${label}`);
  }

  const references = [];
  for (const match of html.matchAll(/\b(?:src|href|poster)="([^"]+)"/g)) references.push(match[1]);
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(",")) references.push(candidate.trim().split(/\s+/, 1)[0]);
  }
  for (const reference of references) {
    const file = localPath(page, reference);
    if (file && !existsSync(file)) fail(page, `Dateiverweis fehlt: ${reference}`);
  }

  const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const nodes = [];
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1]);
      nodes.push(...(data["@graph"] || [data]));
    } catch (error) {
      fail(page, `JSON-LD ist ungültig: ${error.message}`);
    }
  }

  if (indexablePages.has(page)) {
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || "";
    const pageTitles = [...elementMarkup(head).matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
    const title = normalize(pageTitles[0]?.[1] || "");
    if (pageTitles.length !== 1 || !title) fail(page, "indexierbare Seite benötigt genau einen nichtleeren Seitentitel");
    if (title) {
      const key = title.toLocaleLowerCase("de");
      if (titles.has(key)) fail(page, `Seitentitel ist identisch mit ${titles.get(key)}: ${title}`);
      else titles.set(key, page);
    }

    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    const webPage = nodes.find((node) => node["@type"] === "WebPage" && node.url === canonical);
    const graphIds = new Set(nodes.map((node) => node["@id"]).filter(Boolean));

    if (!canonical) fail(page, "indexierbare Seite hat keine Canonical-URL");
    if (/meta name="robots" content="[^"]*noindex/i.test(html)) fail(page, "indexierbare Seite enthält noindex");
    if (!webPage?.dateModified) fail(page, "WebPage-JSON-LD enthält kein dateModified");
    if (canonical && !sitemapEntries.has(canonical)) fail(page, `Canonical-URL fehlt in sitemap.xml: ${canonical}`);
    if (canonical && webPage?.dateModified && sitemapEntries.get(canonical) !== webPage.dateModified) {
      fail(page, `sitemap.xml lastmod (${sitemapEntries.get(canonical) || "fehlt"}) stimmt nicht mit dateModified (${webPage.dateModified}) überein`);
    }

    for (const id of ["https://konferenzwerk.com/#website", "https://konferenzwerk.com/#organization", "https://konferenzwerk.com/#andrea"]) {
      if (!graphIds.has(id)) fail(page, `Entitätsgraph definiert ${id} nicht selbst`);
    }

    const person = nodes.find((node) => node["@id"] === `${siteOrigin}/#andrea`);
    const organization = nodes.find((node) => node["@id"] === `${siteOrigin}/#organization`);
    const language = html.match(/<html\b[^>]*\blang="([^"]+)"/i)?.[1];
    compareEntityFacts(page, person, ["@type", "name", "url", "image", "worksFor", "sameAs", "languageCodes"], "sprachneutral");
    compareEntityFacts(page, organization, ["@type", "name", "legalName", "url", "logo", "image", "email", "telephone", "founder", "employee", "identifier", "vatID", "address", "sameAs"], "sprachneutral");
    if (language) {
      compareEntityFacts(page, person, ["jobTitle", "description", "knowsAbout", "knowsLanguage"], language);
      compareEntityFacts(page, organization, ["description", "knowsAbout", "areaServed"], language);
    }
    const personProfiles = new Set(asArray(person?.sameAs));
    for (const profile of asArray(organization?.sameAs)) {
      if (personProfiles.has(profile)) fail(page, `sameAs ordnet dieselbe Identität Person und Organisation zu: ${profile}`);
    }
  }

  const visibleText = normalize(html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " "));

  for (const faq of nodes.filter((node) => node["@type"] === "FAQPage")) {
    for (const question of faq.mainEntity || []) {
      const name = normalize(question.name || "");
      const answer = normalize(question.acceptedAnswer?.text || "");
      if (!name || !visibleText.includes(name)) fail(page, `FAQ-Frage ist nicht sichtbar: ${name || "(leer)"}`);
      if (!answer || !visibleText.includes(answer)) fail(page, `FAQ-Antwort ist nicht sichtbar: ${name || "(unbekannt)"}`);
    }
  }

  for (const video of nodes.filter((node) => node["@type"] === "VideoObject")) {
    const uploadDate = video.uploadDate || "";
    const dateTimeWithTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    if (!dateTimeWithTimezone.test(uploadDate) || Number.isNaN(Date.parse(uploadDate))) {
      fail(page, `VideoObject uploadDate ist kein gültiger ISO-Zeitstempel mit Zeitzone: ${uploadDate || "(fehlt)"}`);
    }
  }

  const imageUrl = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  const declaredWidth = Number(html.match(/<meta property="og:image:width" content="(\d+)"/)?.[1]);
  const declaredHeight = Number(html.match(/<meta property="og:image:height" content="(\d+)"/)?.[1]);
  if (imageUrl && declaredWidth && declaredHeight) {
    const imageFile = resolve(root, new URL(imageUrl).pathname.slice(1));
    const actual = existsSync(imageFile) ? jpegSize(imageFile) : null;
    if (!actual) fail(page, `Social-Bild fehlt oder ist kein lesbares JPEG: ${imageUrl}`);
    else if (actual.width !== declaredWidth || actual.height !== declaredHeight) {
      fail(page, `Social-Bild ist ${actual.width}×${actual.height}, deklariert sind ${declaredWidth}×${declaredHeight}`);
    }
  }
}

const canonicalOf = (page) => readFileSync(resolve(root, page), "utf8").match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const alternatesOf = (page) => new Map(
  [...readFileSync(resolve(root, page), "utf8").matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
    .map((match) => [match[1], match[2]])
);

for (const [german, english] of translations) {
  const expected = { de: canonicalOf(german), en: canonicalOf(english), "x-default": canonicalOf(german) };
  for (const page of [german, english]) {
    const alternates = alternatesOf(page);
    for (const [language, url] of Object.entries(expected)) {
      if (alternates.get(language) !== url) fail(page, `hreflang="${language}" sollte auf ${url} zeigen, gefunden: ${alternates.get(language) || "(fehlt)"}`);
    }
  }
}

if (failures.length) {
  console.error(`Website-Prüfung fehlgeschlagen:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Website-Prüfung erfolgreich: ${pages.length} Seiten, eindeutige Seitentitel und IDs, Dateiverweise und Sprungziele, H1-Struktur, ARIA-Bezüge, JSON-LD, gemeinsame Entitätsangaben, Sitemap-Daten, Sprachversionen, sichtbare FAQ-Inhalte und Social-Bilder sind konsistent.`);

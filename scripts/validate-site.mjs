import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = ["index.html", "konferenzentwicklung/index.html", "assistenztage/index.html", "rechtliches/index.html", "impressum/index.html", "datenschutz/index.html", "404.html"];
const failures = [];

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
  const html = readFileSync(resolve(root, page), "utf8");
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) fail(page, `erwartet genau eine H1, gefunden: ${h1Count}`);

  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
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

if (failures.length) {
  console.error(`Website-Prüfung fehlgeschlagen:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Website-Prüfung erfolgreich: ${pages.length} Seiten, Dateiverweise, H1-Struktur, ARIA-Bezüge, JSON-LD, sichtbare FAQ-Inhalte und Social-Bilder sind konsistent.`);

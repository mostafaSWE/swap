/**
 * i18n parity check — every translation key must exist in BOTH locales, on BOTH surfaces.
 *
 *   node scripts/check-i18n-parity.mjs
 *
 * Checks apps/web/messages/{en,ar}.json and apps/mobile/src/i18n/{en,ar}.json for:
 *   • keys present in one locale and missing from the other (either direction)
 *   • arrays whose lengths differ between locales (a legal page with 11 English
 *     sections and 10 Arabic ones renders a short page in Arabic — silently)
 *   • values that are empty strings
 *   • values left identical to the other locale where that is almost certainly an
 *     untranslated copy-paste (reported as a warning, not a failure — brand names,
 *     URLs and emails legitimately match)
 *
 * Exits non-zero if any hard failure is found, so it can gate a release.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SURFACES = [
  { name: "web", en: "apps/web/messages/en.json", ar: "apps/web/messages/ar.json" },
  { name: "mobile", en: "apps/mobile/src/i18n/en.json", ar: "apps/mobile/src/i18n/ar.json" },
];

/** Flatten to `a.b.c` / `a.b[0]` leaf paths → value. */
function flatten(node, prefix = "", out = new Map()) {
  if (Array.isArray(node)) {
    out.set(`${prefix}#len`, node.length);
    node.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix, node);
  }
  return out;
}

// Values that may legitimately be identical across locales.
const ALLOWED_IDENTICAL =
  /^(JustSwap|Just Swap|https?:\/\/|\S+@\S+\.\S+|[\d\s.,:+\-()/]*|[A-Z]{2,5})$/;

let hardFailures = 0;
let warnings = 0;

for (const surface of SURFACES) {
  const en = JSON.parse(readFileSync(resolve(ROOT, surface.en), "utf8"));
  const ar = JSON.parse(readFileSync(resolve(ROOT, surface.ar), "utf8"));
  const fen = flatten(en);
  const far = flatten(ar);

  const missingInAr = [...fen.keys()].filter((k) => !far.has(k));
  const missingInEn = [...far.keys()].filter((k) => !fen.has(k));

  const lengthMismatch = [...fen.keys()]
    .filter((k) => k.endsWith("#len") && far.has(k) && far.get(k) !== fen.get(k))
    .map((k) => `${k.replace("#len", "")}: en=${fen.get(k)} ar=${far.get(k)}`);

  const empties = [];
  for (const [k, v] of fen) if (typeof v === "string" && v.trim() === "") empties.push(`en ${k}`);
  for (const [k, v] of far) if (typeof v === "string" && v.trim() === "") empties.push(`ar ${k}`);

  const untranslated = [];
  for (const [k, v] of fen) {
    if (typeof v !== "string" || k.endsWith("#len")) continue;
    const a = far.get(k);
    if (typeof a === "string" && a === v && v.trim() && !ALLOWED_IDENTICAL.test(v.trim())) {
      untranslated.push(`${k} = ${JSON.stringify(v.slice(0, 60))}`);
    }
  }

  const keyCount = [...fen.keys()].filter((k) => !k.endsWith("#len")).length;
  const bad = missingInAr.length + missingInEn.length + lengthMismatch.length + empties.length;
  hardFailures += bad;
  warnings += untranslated.length;

  console.log(`\n${surface.name}: ${keyCount} keys`);
  const report = (label, list) => {
    if (!list.length) return;
    console.log(`  ${label} (${list.length}):`);
    list.slice(0, 25).forEach((x) => console.log(`      ${x}`));
    if (list.length > 25) console.log(`      … +${list.length - 25} more`);
  };
  report("MISSING IN ar", missingInAr);
  report("MISSING IN en", missingInEn);
  report("ARRAY LENGTH MISMATCH", lengthMismatch);
  report("EMPTY VALUES", empties);
  report("WARN: identical in both locales (likely untranslated)", untranslated);
  if (bad === 0) console.log("  PASS — locales are in parity");
}

console.log(
  `\n${hardFailures === 0 ? "PARITY OK" : `PARITY FAILED — ${hardFailures} problem(s)`}` +
    (warnings ? ` (${warnings} warning(s))` : ""),
);
process.exit(hardFailures === 0 ? 0 : 1);

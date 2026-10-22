import en from "@/locales/en/common.json";
import fa from "@/locales/fa/common.json";
import ps from "@/locales/ps/common.json";
import { normalizeLocale } from "./config";

// I18N-01: dictionary lookup shared by the screens (LanguageContext) and the
// print helpers (utils/printBill.js, utils/printReport.js).
// translate("fa", "orders.title")            → Dari text (English if missing)
// translate("en", "common.tableNo", { no })  → "Table 5"

const DICTIONARIES = { en, fa, ps };

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

// Plain numbers inside a sentence (order 87, table 3) use Dari/Pashto digits.
// Mixed values such as "A-21" or names are left as they are.
function localizeDigits(value, loc) {
  if (loc === "en" || !/^\d+$/.test(value)) return value;
  return value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

export function translate(locale, key, vars) {
  const loc = normalizeLocale(locale);
  let text = lookup(DICTIONARIES[loc], key);
  if (typeof text !== "string") text = lookup(DICTIONARIES.en, key);
  if (typeof text !== "string") return key;
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (match, name) =>
      vars[name] === undefined ? match : localizeDigits(String(vars[name]), loc)
    );
  }
  return text;
}

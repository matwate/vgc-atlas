// Mirror of store.normalize() so client-side slug rendering matches the API's
// canonical tokens. Used to: (1) wrap combobox selections as the right slug,
// (2) display pretty slugs consistently, (3) keep catalog in sync.
export function normalize(text) {
  if (text == null) return "";
  let t = String(text)
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return t;
}

// Pretty-print a slug: "iron-hands" -> "Iron Hands". Used for non-stored display
// labels; the backend keeps original casing in pokemon_name etc, so we only
// call this on raw slugs we don't have a human name for.
export function prettifySlug(slug) {
  if (!slug) return "";
  return slug
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
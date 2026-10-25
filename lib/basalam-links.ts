/** Public purchase actions go through a validated Basalam redirect. */
export function basalamHref(slug?: string) {
  return "/go/basalam" + (slug ? "?product=" + encodeURIComponent(slug) : "");
}

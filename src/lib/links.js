// Stand-in name while a link is fetched. It stays visible if the fetch fails,
// so name the site rather than saying "Fetching…" forever.
export function linkPlaceholderName(url) {
  try {
    return `Plant from ${new URL(url.trim()).hostname.replace(/^www\./, "")}`;
  } catch {
    return "Plant from a link";
  }
}

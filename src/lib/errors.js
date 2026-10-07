// Turns a stored fetch error ("API 401: {...json...}") into a sentence a person can act on.
export function friendlyFetchError(message) {
  const status = Number(/^API (\d{3})/.exec(message || "")?.[1]);
  if (status === 401 || status === 403) return "The AI service turned the request down. Try again; if it keeps happening, the server key needs checking.";
  if (status === 429) return "Too many requests at once. Wait a minute, then try again.";
  if (status >= 500) return "The AI service had a problem. Try again in a few minutes.";
  return "We couldn't read enough about this plant. Try again, or add it by name instead.";
}

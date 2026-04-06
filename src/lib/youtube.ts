/** Extract YouTube video ID from any common URL format */
export function parseYouTubeId(url: string): string | null {
  const clean = url.trim();
  // youtu.be/ID
  const short = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  // youtube.com/watch?v=ID or /embed/ID or /v/ID
  const long = clean.match(/[?&/]v[=/]([a-zA-Z0-9_-]{11})/);
  if (long) return long[1];
  // plain 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  return null;
}

export function youTubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

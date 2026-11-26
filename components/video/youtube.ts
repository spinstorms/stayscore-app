/** YouTube video id from any YouTube link (watch?v=, youtu.be/, /shorts/, /embed/), or null. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/\/(?:shorts|embed|live)\/([\w-]{11})/);
  return m ? m[1] : null;
}

export function embedUrl(id: string, start = 0) {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1${start ? `&start=${start}` : ''}`;
}

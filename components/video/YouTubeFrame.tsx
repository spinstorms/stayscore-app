import React from 'react';
import { embedUrl } from './youtube';

/** Web: a plain YouTube iframe, the same as on stayodds.com. */
export function YouTubeFrame({ id, start }: { id: string; start?: number }) {
  return React.createElement('iframe', {
    src: embedUrl(id, start),
    style: { width: '100%', height: '100%', border: 0 },
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    allowFullScreen: true,
    title: 'YouTube video',
  });
}

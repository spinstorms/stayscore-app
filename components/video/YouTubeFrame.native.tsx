import React from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { embedUrl } from './youtube';

/**
 * Phones: the YouTube player inside the app. Loaded from a small page with stayodds.com as its
 * address, because YouTube refuses to play embeds that arrive with no website attached.
 */
export function YouTubeFrame({ id, start }: { id: string; start?: number }) {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${embedUrl(
    id,
    start
  )}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
  return (
    <WebView
      style={StyleSheet.absoluteFill}
      source={{ html, baseUrl: 'https://stayodds.com' }}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      originWhitelist={['*']}
      setSupportMultipleWindows={false}
    />
  );
}

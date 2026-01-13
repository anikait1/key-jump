export interface SiteConfig {
  name: string;
  urlPattern: string;
  commonSelectors: string[];
  allSelectors: string[];
  popupSelector?: string;
}

export const DEFAULT_CONFIG: SiteConfig = {
  name: "Default",
  urlPattern: "*",
  commonSelectors: [
    "a[href]",
    "button",
    '[role="button"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="tab"]',
    '[role="link"]',
  ],
  allSelectors: [
    "a[href]",
    "button",
    '[role="button"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="tab"]',
    '[role="link"]',
    "input[type='button']",
    "input[type='submit']",
    "[onclick]",
  ],
};

export const SITE_CONFIGS: SiteConfig[] = [
  {
    name: "YouTube Music",
    urlPattern: "music.youtube.com",
    commonSelectors: [
      "ytmusic-responsive-list-item-renderer",
      "ytmusic-playlist-panel-video-renderer",
      "ytmusic-two-row-item-renderer",
      "ytmusic-menu-service-item-renderer",
      "ytmusic-toggle-menu-service-item-renderer",
      "ytmusic-player-bar yt-icon-button",
      "ytmusic-player-bar button",
      "ytmusic-like-button-renderer button",
      "ytmusic-menu-renderer button",
    ],
    allSelectors: [
      "ytmusic-responsive-list-item-renderer",
      "ytmusic-playlist-panel-video-renderer",
      "ytmusic-two-row-item-renderer",
      "ytmusic-menu-service-item-renderer",
      "ytmusic-toggle-menu-service-item-renderer",
      "ytmusic-player-bar yt-icon-button",
      "ytmusic-player-bar button",
      "ytmusic-like-button-renderer button",
      "ytmusic-menu-renderer button",
      "a[href]",
      "button",
      '[role="button"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]',
      '[role="link"]',
      "yt-icon-button",
      "yt-button-shape button",
      "tp-yt-paper-icon-button",
    ],
    popupSelector: "ytmusic-menu-popup-renderer",
  },
  // Add more site configs here
];

export function getConfigForUrl(url: string): SiteConfig {
  const hostname = new URL(url).hostname;

  for (const config of SITE_CONFIGS) {
    if (hostname.includes(config.urlPattern)) {
      return config;
    }
  }

  return DEFAULT_CONFIG;
}

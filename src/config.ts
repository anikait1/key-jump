export interface SiteConfig {
  name: string;
  urlPattern: string;
  selectors: string[];
  popupSelector?: string;
}

export type StoredSiteConfig =
  | { enabled: true; selectors?: string[]; popupSelector?: string }
  | { enabled: false };

const StorageKeys = {
  siteConfigs: "siteConfigs",
} as const;

export const DefaultConfig: SiteConfig = {
  name: "Default",
  urlPattern: "*",
  selectors: [
    "a[href]",
    "button",
    '[role="button"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="tab"]',
    '[role="link"]',
    "input[type='button']",
    "input[type='submit']",
  ],
};

export const BuiltInSiteConfigs: SiteConfig[] = [
  {
    name: "YouTube Music",
    urlPattern: "music.youtube.com",
    selectors: [
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
];

async function getStoredConfigs(): Promise<Record<string, StoredSiteConfig>> {
  const result = await browser.storage.sync.get({ [StorageKeys.siteConfigs]: {} });
  return result[StorageKeys.siteConfigs];
}

async function saveStoredConfigs(configs: Record<string, StoredSiteConfig>): Promise<void> {
  await browser.storage.sync.set({ [StorageKeys.siteConfigs]: configs });
}

export async function getStoredConfig(hostname: string): Promise<StoredSiteConfig | null> {
  const configs = await getStoredConfigs();
  return configs[hostname] ?? null;
}

export async function setStoredConfig(hostname: string, config: StoredSiteConfig | null): Promise<void> {
  const configs = await getStoredConfigs();
  if (config === null) {
    delete configs[hostname];
  } else {
    configs[hostname] = config;
  }
  await saveStoredConfigs(configs);
}

export function getBuiltInConfig(url: string): SiteConfig {
  const hostname = new URL(url).hostname;
  return BuiltInSiteConfigs.find(config => hostname.includes(config.urlPattern)) ?? DefaultConfig;
}

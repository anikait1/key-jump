const browserAPI = typeof browser !== "undefined" ? browser : chrome;

export type EnabledSiteConfig = {
  enabled: true;
  name: string;
  urlPattern: string;
  selectors: string[];
  popupSelector?: string;
};

export type SiteConfig = EnabledSiteConfig | { enabled: false };

const StorageKeys = {
  siteConfigs: "siteConfigs",
} as const;

export const DefaultConfig: EnabledSiteConfig = {
  enabled: true,
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

export const BuiltInSiteConfigs: EnabledSiteConfig[] = [
  {
    enabled: true,
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

async function getStoredConfigs(): Promise<Record<string, SiteConfig>> {
  const result = await browserAPI.storage.sync.get({ [StorageKeys.siteConfigs]: {} });
  return result[StorageKeys.siteConfigs];
}

async function saveStoredConfigs(configs: Record<string, SiteConfig>): Promise<void> {
  await browserAPI.storage.sync.set({ [StorageKeys.siteConfigs]: configs });
}

export async function getStoredConfig(hostname: string): Promise<SiteConfig | null> {
  const configs = await getStoredConfigs();
  return configs[hostname] ?? null;
}

export async function setStoredConfig(hostname: string, config: SiteConfig | null): Promise<void> {
  const configs = await getStoredConfigs();
  if (config === null) {
    delete configs[hostname];
  } else {
    configs[hostname] = config;
  }
  await saveStoredConfigs(configs);
}

export async function getConfig(url: string): Promise<SiteConfig | null> {
  const hostname = new URL(url).hostname;
  const stored = await getStoredConfig(hostname);

  if (!stored) {
    return BuiltInSiteConfigs.find(config => hostname.includes(config.urlPattern)) ?? DefaultConfig;
  }

  return stored;
}

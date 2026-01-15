import { getStoredConfig, setStoredConfig } from "./config";

const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const hostnameEl = document.querySelector<HTMLElement>("#current-hostname")!;
const toggleEl = document.querySelector<HTMLInputElement>("#site-toggle")!;
const statusEl = document.querySelector<HTMLElement>("#status-text")!;

function updateStatus(enabled: boolean): void {
  if (enabled) {
    statusEl.textContent = "Extension is enabled";
    statusEl.className = "status enabled";
  } else {
    statusEl.textContent = "Extension is disabled (blacklisted)";
    statusEl.className = "status disabled";
  }
}

async function init(): Promise<void> {
  const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url) {
    hostnameEl.textContent = "Unable to detect site";
    toggleEl.disabled = true;
    return;
  }

  try {
    const hostname = new URL(tab.url).hostname;
    hostnameEl.textContent = hostname;

    const storedConfig = await getStoredConfig(hostname);
    const isEnabled = !storedConfig || storedConfig.enabled;
    toggleEl.checked = isEnabled;
    updateStatus(isEnabled);

    toggleEl.addEventListener("change", async () => {
      const enabled = toggleEl.checked;
      await setStoredConfig(hostname, enabled ? null : { enabled: false });
      updateStatus(enabled);
    });
  } catch {
    hostnameEl.textContent = "Invalid URL";
    toggleEl.disabled = true;
  }
}

init();

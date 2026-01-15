import { getStoredConfig, setStoredConfig } from "./config";

const hostnameEl = document.getElementById("current-hostname") as HTMLElement;
const toggleEl = document.getElementById("site-toggle") as HTMLInputElement;
const statusEl = document.getElementById("status-text") as HTMLElement;

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
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

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

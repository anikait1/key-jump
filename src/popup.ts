import { getStoredConfig, setStoredConfig, getConfig, DefaultConfig, BuiltInSiteConfigs, type EnabledSiteConfig } from "./config";

const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const hostnameEl = document.querySelector<HTMLElement>("#current-hostname")!;
const toggleEl = document.querySelector<HTMLInputElement>("#site-toggle")!;
const statusEl = document.querySelector<HTMLElement>("#status-text")!;
const selectorList = document.querySelector<HTMLElement>("#selector-list")!;
const addSelectorBtn = document.querySelector<HTMLButtonElement>("#add-selector-btn")!;
const popupSelectorInput = document.querySelector<HTMLInputElement>("#popup-selector-input")!;
const saveBtn = document.querySelector<HTMLButtonElement>("#save-btn")!;
const resetBtn = document.querySelector<HTMLButtonElement>("#reset-btn")!;
const selectorsSection = document.querySelector<HTMLElement>("#selectors-section")!;
const helpToggle = document.querySelector<HTMLElement>("#help-toggle")!;
const helpContent = document.querySelector<HTMLElement>("#help-content")!;

function updateStatus(enabled: boolean): void {
  if (enabled) {
    statusEl.textContent = "Extension is enabled";
    statusEl.className = "status enabled";
  } else {
    statusEl.textContent = "Extension is disabled (blacklisted)";
    statusEl.className = "status disabled";
  }
}

function getDefaultConfig(hostname: string): EnabledSiteConfig {
  return BuiltInSiteConfigs.find(config => hostname.includes(config.urlPattern)) ?? DefaultConfig;
}

function createSelectorItem(value: string): HTMLElement {
  const item = document.createElement("div");
  item.className = "selector-item";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "CSS selector";

  const removeBtn = document.createElement("button");
  removeBtn.className = "btn-icon btn-remove";
  removeBtn.textContent = "x";
  removeBtn.addEventListener("click", () => item.remove());

  item.appendChild(input);
  item.appendChild(removeBtn);
  return item;
}

function populateSelectors(config: EnabledSiteConfig): void {
  selectorList.innerHTML = "";
  for (const selector of config.selectors) {
    selectorList.appendChild(createSelectorItem(selector));
  }
  popupSelectorInput.value = config.popupSelector ?? "";
}

function getSelectors(): string[] {
  const inputs = selectorList.querySelectorAll<HTMLInputElement>("input");
  return Array.from(inputs).map(input => input.value.trim()).filter(Boolean);
}

function setupCollapsibles(): void {
  helpToggle.addEventListener("click", () => {
    helpToggle.classList.toggle("open");
    helpContent.classList.toggle("open");
  });

  document.querySelectorAll<HTMLElement>(".collapsible").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const targetId = toggle.dataset.target;
      if (!targetId) return;
      const content = document.getElementById(targetId);
      if (!content) return;
      toggle.classList.toggle("open");
      content.classList.toggle("open");
    });
  });
}

async function init(): Promise<void> {
  setupCollapsibles();

  const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url) {
    hostnameEl.textContent = "Unable to detect site";
    toggleEl.disabled = true;
    selectorsSection.style.display = "none";
    return;
  }

  try {
    const hostname = new URL(tab.url).hostname;
    hostnameEl.textContent = hostname;

    const storedConfig = await getStoredConfig(hostname);
    const isEnabled = !storedConfig || storedConfig.enabled;
    toggleEl.checked = isEnabled;
    updateStatus(isEnabled);

    const effectiveConfig = await getConfig(tab.url);
    if (effectiveConfig && effectiveConfig.enabled) {
      populateSelectors(effectiveConfig);
    } else {
      populateSelectors(getDefaultConfig(hostname));
    }

    addSelectorBtn.addEventListener("click", () => {
      selectorList.appendChild(createSelectorItem(""));
      const newInput = selectorList.lastElementChild?.querySelector("input");
      newInput?.focus();
    });

    toggleEl.addEventListener("change", async () => {
      const enabled = toggleEl.checked;
      if (enabled) {
        const currentSelectors = getSelectors();
        const currentPopupSelector = popupSelectorInput.value.trim();
        const defaultConfig = getDefaultConfig(hostname);
        const selectorsMatch = JSON.stringify(currentSelectors) === JSON.stringify(defaultConfig.selectors);
        const popupMatch = currentPopupSelector === (defaultConfig.popupSelector ?? "");

        if (selectorsMatch && popupMatch) {
          await setStoredConfig(hostname, null);
        } else {
          const config: EnabledSiteConfig = {
            enabled: true,
            name: hostname,
            urlPattern: hostname,
            selectors: currentSelectors,
            ...(currentPopupSelector && { popupSelector: currentPopupSelector }),
          };
          await setStoredConfig(hostname, config);
        }
      } else {
        await setStoredConfig(hostname, { enabled: false });
      }
      updateStatus(enabled);
    });

    saveBtn.addEventListener("click", async () => {
      const selectors = getSelectors();
      const popupSelector = popupSelectorInput.value.trim();

      const config: EnabledSiteConfig = {
        enabled: true,
        name: hostname,
        urlPattern: hostname,
        selectors,
        ...(popupSelector && { popupSelector }),
      };

      await setStoredConfig(hostname, config);
      toggleEl.checked = true;
      updateStatus(true);
    });

    resetBtn.addEventListener("click", async () => {
      await setStoredConfig(hostname, null);
      const defaultConfig = getDefaultConfig(hostname);
      populateSelectors(defaultConfig);
      toggleEl.checked = true;
      updateStatus(true);
    });
  } catch {
    hostnameEl.textContent = "Invalid URL";
    toggleEl.disabled = true;
    selectorsSection.style.display = "none";
  }
}

init();

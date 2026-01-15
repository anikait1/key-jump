import { type EnabledSiteConfig, getConfig, DefaultConfig } from "./config";

const HintStatus = {
  active: "active",
  inactive: "inactive",
} as const

const ClickMode = {
  left: "left",
  right: "right",
} as const

type ClickModeType = typeof ClickMode[keyof typeof ClickMode];

type ActiveHintState = {
  status: "active";
  clickMode: ClickModeType;
  config: EnabledSiteConfig;
  hints: Map<string, HTMLElement>;
  overlays: HTMLElement[];
  typed: string;
};

type InactiveHintState = { status: "inactive"; config: EnabledSiteConfig };
type HintStateType = ActiveHintState | InactiveHintState;

const ActivationKeys: Record<string, ClickModeType> = {
  "Semicolon": "left",
  "shift+Semicolon": "right",
};

const HintCharacters = ["a", "s", "d", "f", "g", "h", "j", "k", "l", "q", "w", "e", "r", "u", "i", "o", "p"];

const HintContainerId = "keyboard-hints-container";
const MenuSelectors = [
  '[role="menuitem"]',
  '[role="option"]',
  "a[href]",
  "button",
];

let HintState: HintStateType = {
  status: HintStatus.inactive,
  config: DefaultConfig,
};

function generateHintLabels(count: number): string[] {
  if (count === 0) return [];

  const base = HintCharacters.length;
  let length = 1;
  while (Math.pow(base, length) < count) {
    length++;
  }

  const labels: string[] = [];
  for (let i = 0; labels.length < count; i++) {
    let label = "";
    let n = i;
    for (let j = 0; j < length; j++) {
      label = HintCharacters[n % base] + label;
      n = Math.floor(n / base);
    }
    labels.push(label);
  }

  return labels;
}

function getClickableElements(config: EnabledSiteConfig): HTMLElement[] {
  let popup: HTMLElement | null = null;
  if (config.popupSelector) {
    const potentialPopup = document.querySelector<HTMLElement>(config.popupSelector);
    if (potentialPopup && potentialPopup.offsetParent !== null) {
      popup = potentialPopup;
    }
  }

  const elements: HTMLElement[] = []
  if (popup) {
    elements.push(
      ...Array.from(popup.querySelectorAll<HTMLElement>(MenuSelectors.join(", ")))
    )
  } else {
    elements.push(
      ...Array.from(document.querySelectorAll<HTMLElement>(config.selectors.join(", ")))
    )
  }

  return elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      rect.top >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.left >= 0 &&
      rect.right <= window.innerWidth
    );
  });
}

function createHintOverlay(label: string, element: HTMLElement): HTMLElement {
  const rect = element.getBoundingClientRect();
  const overlay = document.createElement("div");

  overlay.textContent = label.toUpperCase();
  overlay.dataset.hint = label;

  Object.assign(overlay.style, {
    position: "fixed",
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.left + rect.width / 2}px`,
    transform: "translate(-50%, -50%)",
    zIndex: "2147483647",
    pointerEvents: "none",

    background: "#1f2933",
    color: "#e6fffa",
    fontSize: "11px",
    fontWeight: "700",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",

    padding: "3px 6px",
    borderRadius: "4px",
    border: "1px solid #2dd4bf",
    whiteSpace: "nowrap",
    userSelect: "none",
    boxShadow:
      "0 4px 8px rgba(0,0,0,0.45), 0 0 0 1px rgba(45,212,191,0.15)",
  });

  return overlay;
}

function showHints(state: ActiveHintState): void {
  const elements = getClickableElements(state.config);
  if (elements.length === 0) return;

  const labels = generateHintLabels(elements.length);
  let container = document.getElementById(HintContainerId);
  if (!container) {
    container = document.createElement("div");
    container.id = HintContainerId;
    document.body.appendChild(container);
  }

  for (const [index, element] of elements.entries()) {
    const label = labels[index];
    if (!label) {
      console.warn("[Keyboard Hints] Not enough hint labels generated for the number of elements.");
      continue;
    }

    const overlay = createHintOverlay(label, element);
    state.hints.set(label, element);
    state.overlays.push(overlay);
    container.appendChild(overlay);
  }

  console.debug(`[Keyboard Hints] Showing ${elements.length} hints (${state.clickMode}-click mode)`);
}

function hideHints(state: ActiveHintState): void {
  const container = document.getElementById(HintContainerId);
  if (container) {
    container.innerHTML = "";
  }

  HintState = { status: HintStatus.inactive, config: state.config };
}

function updateHintVisibility(state: ActiveHintState): void {
  for (const overlay of state.overlays) {
    const hint = overlay.dataset.hint ?? "";
    if (hint.startsWith(state.typed)) {
      overlay.style.display = "block";
      const matched = hint.slice(0, state.typed.length);
      const remaining = hint.slice(state.typed.length);
      overlay.innerHTML = `<span style="opacity: 0.5">${matched.toUpperCase()}</span>${remaining.toUpperCase()}`;
    } else {
      overlay.style.display = "none";
    }
  }
}

function executeClick(element: HTMLElement, state: ActiveHintState): void {
  if (state.clickMode === ClickMode.right) {
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 2,
      clientX: element.getBoundingClientRect().left + element.offsetWidth / 2,
      clientY: element.getBoundingClientRect().top + element.offsetHeight / 2,
    });
    element.dispatchEvent(event);
  } else {
    element.click();
  }
}

function preventEventDefaults(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function handleActiveState(event: KeyboardEvent, key: string, state: ActiveHintState): void {
  if (key !== "escape" && key !== "backspace" && !HintCharacters.includes(key)) return;

  preventEventDefaults(event);
  switch (key) {
    case "escape":
      hideHints(state);
      break;

    case "backspace":
      state.typed = state.typed.slice(0, -1);
      updateHintVisibility(state);
      break;

    default: {
      const candidateTyped = state.typed + key;
      const matchingHints = Array.from(state.hints.keys()).filter(h => h.startsWith(candidateTyped));

      if (matchingHints.length === 0) break;

      state.typed = candidateTyped;

      if (matchingHints.length === 1) {
        const element = state.hints.get(matchingHints[0]!);
        if (element) executeClick(element, state);
        hideHints(state);
        break;
      }

      updateHintVisibility(state);
      break;
    }
  }
}

function handleInactiveState(event: KeyboardEvent, state: InactiveHintState): void {
  const modifierPrefix = [
    event.shiftKey && "shift",
  ].filter(Boolean).join("+");

  const code = event.code;
  const lookupKey = modifierPrefix ? `${modifierPrefix}+${code}` : code;
  const clickMode = ActivationKeys[lookupKey];

  if (!clickMode) return;

  preventEventDefaults(event);

  HintState = {
    status: HintStatus.active,
    clickMode,
    config: state.config,
    hints: new Map(),
    overlays: [],
    typed: "",
  };

  showHints(HintState);
}

function handleKeydown(event: KeyboardEvent): void {
  const activeElement = document.activeElement;
  if (activeElement) {
    const tagName = activeElement.tagName.toLowerCase();
    const isContentEditable = activeElement instanceof HTMLElement && activeElement.isContentEditable;

    if (tagName === "input" || tagName === "textarea" || isContentEditable) {
      return;
    }
  }

  const key = event.key.toLowerCase();

  switch (HintState.status) {
    case HintStatus.active:
      handleActiveState(event, key, HintState);
      break;
    case HintStatus.inactive:
      handleInactiveState(event, HintState);
      break;
  }
}

async function init(): Promise<void> {
  const config = await getConfig(window.location.href);

  if (!config || config.enabled === false) {
    const hostname = new URL(window.location.href).hostname;
    console.log(`[Keyboard Hints] Disabled on ${hostname} (blacklisted)`);
    return;
  }

  HintState.config = config;

  document.addEventListener("keydown", handleKeydown, true);
  console.log(`[Keyboard Hints] Loaded config: ${config.name}`);
  console.log("[Keyboard Hints] Shortcuts: ;, Shift+;, Esc");
}

init();

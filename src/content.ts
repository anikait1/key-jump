import { type SiteConfig, getConfigForUrl } from "./config";

/**
 * TODO: Make 'configured' scope configurable per website
 * 
 * Showing all clickable elements on the page with keyboard hints can clutter the screen a lot.
 * Therefore, we define two scopes for hints. Eventually the goal is to allow users to customize
 * the selectors used for 'configured' scope and make it a per site configurable option.
 * - configured: A curated set of commonly used clickable elements defined per site in the config.
 * - all: All clickable elements found on the page using generic selectors.
 */
const HintScope = {
  configured: "configured",
  all: "all",
} as const

const HintStatus = {
  active: "active",
  inactive: "inactive",
} as const

const ClickMode = {
  left: "left",
  right: "right",
} as const


type HintScopeType = typeof HintScope[keyof typeof HintScope];
type ClickModeType = typeof ClickMode[keyof typeof ClickMode];

type ActiveHintState = {
  status: "active";
  clickMode: ClickModeType;
  scope: HintScopeType;
  hints: Map<string, HTMLElement>;
  overlays: HTMLElement[];
  typed: string;
};

type InactiveHintState = { status: "inactive" };
type HintStateType = ActiveHintState | InactiveHintState;
type ActivationConfig = { clickMode: ClickModeType; scope: HintScopeType };

const ActivationKeys: Record<string, ActivationConfig> = {
  "Semicolon": { clickMode: "left", scope: "configured" },
  "shift+Semicolon": { clickMode: "right", scope: "configured" },
  "ctrl+Semicolon": { clickMode: "left", scope: "all" },
  "ctrl+shift+Semicolon": { clickMode: "right", scope: "all" },
};

const HintCharacters = ["a", "s", "d", "f", "g", "h", "j", "k", "l", "q", "w", "e", "r", "u", "i", "o", "p"];

const HintContainerId = "keyboard-hints-container";
const MenuSelectors = [
  '[role="menuitem"]',
  '[role="option"]',
  "a[href]",
  "button",
];

const CurrentSiteConfig: SiteConfig = getConfigForUrl(window.location.href);
let HintState: HintStateType = { status: HintStatus.inactive };

/**
 * Generate uniqu keyboard hint labels using base-N encoding over the HintCharacters.
 * Labels are generated in increasing order of length (a, s, d, ..., aa, as, ...)
 */
function generateHintLabels(count: number): string[] {
  const labels: string[] = [];
  const base = HintCharacters.length;

  for (let i = 0; labels.length < count; i++) {
    let label = "";
    let n = i;

    do {
      label = HintCharacters[n % base] + label;
      n = Math.floor(n / base) - 1;
    } while (n >= 0);

    labels.push(label);
  }

  return labels;
}

function getClickableElements(state: ActiveHintState): HTMLElement[] {
  /**
   * In case the config has a popup selector and the selector is visible prioritize
   * rendering hints within the popup only.
   */
  let popup: HTMLElement | null = null;
  if (CurrentSiteConfig.popupSelector) {
    const potentialPopup = document.querySelector<HTMLElement>(CurrentSiteConfig.popupSelector);
    /**
     * It is possible the popup exists in the DOM but is not currently visible.
     * We only want to consider it if it is visible (offsetParent is not null).
     *
     * Ref: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
     */
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
    const selectors = state.scope === "configured" ? CurrentSiteConfig.configuredSelectors : CurrentSiteConfig.allSelectors;
    elements.push(
      ...Array.from(document.querySelectorAll<HTMLElement>(selectors.join(", ")))
    )
  }

  /**
   * Filter out non visible elements, however the issue here is if the screen changes
   * due to some other interaction (scroll etc.) the hints will not update their visibility.
   *
   * TODO: Implement a MutationObserver or IntersectionObserver to handle dynamic visibility changes?
   */
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
  const elements = getClickableElements(state);
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

function hideHints(): void {
  const container = document.getElementById(HintContainerId);
  if (container) {
    container.innerHTML = "";
  }

  HintState = { status: HintStatus.inactive };
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
      hideHints();
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
        hideHints();
        break;
      }

      updateHintVisibility(state);
      break;
    }
  }
}

function handleInactiveState(event: KeyboardEvent): void {
  const modifierPrefix = [
    event.ctrlKey && "ctrl",
    event.shiftKey && "shift",
  ].filter(Boolean).join("+");

  const code = event.code;
  const lookupKey = modifierPrefix ? `${modifierPrefix}+${code}` : code;
  const config = ActivationKeys[lookupKey];

  if (!config) return;

  preventEventDefaults(event);

  HintState = {
    status: HintStatus.active,
    clickMode: config.clickMode,
    scope: config.scope,
    hints: new Map(),
    overlays: [],
    typed: "",
  };

  showHints(HintState);
}

function handleKeydown(event: KeyboardEvent): void {
  /**
   * Do not trigger hints if an input field is focused
   * to avoid interfering with user typing. This also means
   * if a user focuses on an input field even after activating
   * hints, the hints will not process further input.
   */
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
      handleInactiveState(event);
      break;
  }
}

document.addEventListener("keydown", handleKeydown, true);

console.log(`[Keyboard Hints] Loaded config: ${CurrentSiteConfig.name}`);
console.log("[Keyboard Hints] Shortcuts: ;, Shift+;, Ctrl+;, Ctrl+Shift+;, Esc");

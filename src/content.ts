import { type SiteConfig, getConfigForUrl } from "./config";

const ClickMode = {
  left: "left",
  right: "right",
} as const

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

type HintScopeType = typeof HintScope[keyof typeof HintScope];
type ClickModeType = typeof ClickMode[keyof typeof ClickMode];

type HintStateType = {
  active: false;
} | {
  active: true;
  clickMode: ClickModeType;
  scope: HintScopeType;
  hints: Map<string, HTMLElement>;
  overlays: HTMLElement[];
  typed: string;
}

type KeyModifier = "ctrl" | "alt" | "shift" | "meta";

type Shortcut = {
  key: string;
  modifiers: KeyModifier[];
  transition?: () => HintStateType;
  action: () => void;
}

const Shortcuts: Shortcut[] = [
  {
    key: "f",
    modifiers: [],
    transition: () => ({ active: true, clickMode: "left", scope: "configured", hints: new Map(), overlays: [], typed: "" }),
    action: () => showHints()
  },
  {
    key: "f",
    modifiers: ["shift"],
    transition: () => ({ active: true, clickMode: "right", scope: "configured", hints: new Map(), overlays: [], typed: "" }),
    action: () => showHints()
  },
  {
    key: "f",
    modifiers: ["ctrl"],
    transition: () => ({ active: true, clickMode: "left", scope: "all", hints: new Map(), overlays: [], typed: "" }),
    action: () => showHints()
  },
  {
    key: "f",
    modifiers: ["ctrl", "shift"],
    transition: () => ({ active: true, clickMode: "right", scope: "all", hints: new Map(), overlays: [], typed: "" }),
    action: () => showHints()
  }
]
const HintCharacters = ["a", "s", "d", "f", "g", "h", "j", "k", "l", "q", "w", "e", "r", "u", "i", "o", "p"];
const HintContainerId = "keyboard-hints-container";
const MenuSelectors = [
  '[role="menuitem"]',
  '[role="option"]',
  "a[href]",
  "button",
];

const CurrentSiteConfig: SiteConfig = getConfigForUrl(window.location.href);
let HintState: HintStateType = { active: false };

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

function getClickableElements(): HTMLElement[] {
  if (HintState.active === false) {
    return [];
  }

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
    const selectors = HintState.scope === "configured" ? CurrentSiteConfig.configuredSelectors : CurrentSiteConfig.allSelectors;
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

function showHints(): void {
  // Ideally this should not happen, but just a safeguard and helps with type narrowing.
  if (HintState.active === false) return;

  const elements = getClickableElements();
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
    HintState.hints.set(label, element);
    HintState.overlays.push(overlay);
    container.appendChild(overlay);
  }

  console.debug(`[Keyboard Hints] Showing ${elements.length} hints (${HintState.clickMode}-click mode)`);
}

function hideHints(): void {
  const container = document.getElementById(HintContainerId);
  if (container) {
    container.innerHTML = "";
  }

  HintState = { active: false };
}

function updateHintVisibility(): void {
  if (HintState.active === false) return;

  for (const overlay of HintState.overlays) {
    const hint = overlay.dataset.hint ?? "";
    if (hint.startsWith(HintState.typed)) {
      overlay.style.display = "block";
      const matched = hint.slice(0, HintState.typed.length);
      const remaining = hint.slice(HintState.typed.length);
      overlay.innerHTML = `<span style="opacity: 0.5">${matched.toUpperCase()}</span>${remaining.toUpperCase()}`;
    } else {
      overlay.style.display = "none";
    }
  }
}

function executeClick(element: HTMLElement): void {
  if (HintState.active === false) return;

  if (HintState.clickMode === ClickMode.right) {
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

function handleHintInput(key: string): void {
  if (HintState.active === false) return;
  if (!HintCharacters.includes(key) && key !== "backspace" && key !== "escape") return;

  switch (key) {
    case "escape":
      hideHints();
      break;
    case "backspace":
      HintState.typed = HintState.typed.slice(0, -1);
      updateHintVisibility();
      break;
    default: {
      HintState.typed += key.toLowerCase();
      const currentTypedHint = HintState.typed;
      const matchingHints = Array.from(
        HintState.hints.keys().filter((hint) =>
          hint.startsWith(currentTypedHint)
        )
      );

      /**
       * In case of no matches, remove the last typed character,
       * saves the user from having to press backspace repeatedly.
       */
      if (matchingHints.length === 0) {
        HintState.typed = HintState.typed.slice(0, -1);
        return;
      }

      /**
       * In case partial match leads to a single hint, immediately execute the click
       * Example: [aa, ab, jk] are hints, if user types 'j' it matches to single hint 'jk'
       * so we can directly execute the click. The same cannot be done for 'a' as it matches to
       * multiple hints.
       */
      if (matchingHints.length === 1) {
        const label = matchingHints[0];
        if (!label) {
          console.error("[Keyboard Hints] Unexpected error: matching hint label is undefined.");
          hideHints()
          return;
        }

        const element = HintState.hints.get(label);
        if (element) {
          executeClick(element);
          hideHints();
          return;
        }
      }

      updateHintVisibility();
    }
  }
}

function preventEventDefaults(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
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

  if (HintState.active) {
    preventEventDefaults(event)
    handleHintInput(key);
    return;
  }

  const modifiers: KeyModifier[] = [];
  if (event.ctrlKey) modifiers.push("ctrl");
  if (event.altKey) modifiers.push("alt");
  if (event.shiftKey) modifiers.push("shift");
  if (event.metaKey) modifiers.push("meta");

  const shortcut = Shortcuts.find(shortcut => shortcut.key === key && shortcut.modifiers.every(modifier => modifiers.includes(modifier)));
  if (!shortcut) return;

  preventEventDefaults(event);
  HintState = shortcut.transition ? shortcut.transition() : HintState;
  shortcut.action();
}

document.addEventListener("keydown", handleKeydown, true);

console.log(`[Keyboard Hints] Loaded config: ${CurrentSiteConfig.name}`);
console.log("[Keyboard Hints] Shortcuts: f, Shift+F, Ctrl+f, Ctrl+Shift+F, Esc");

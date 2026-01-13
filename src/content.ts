import { type SiteConfig, getConfigForUrl } from "./config";

type ClickMode = "left" | "right";
type HintScope = "common" | "all";

interface HintState {
  active: boolean;
  mode: ClickMode;
  scope: HintScope;
  hints: Map<string, HTMLElement>;
  overlays: HTMLElement[];
  typed: string;
}

const HINT_CHARS = "asdfghjklqweruiop";
const HINT_CONTAINER_ID = "keyboard-hints-container";

const currentConfig: SiteConfig = getConfigForUrl(window.location.href);

const state: HintState = {
  active: false,
  mode: "left",
  scope: "common",
  hints: new Map(),
  overlays: [],
  typed: "",
};

function generateHintLabels(count: number): string[] {
  const labels: string[] = [];
  const chars = HINT_CHARS.split("");

  if (count <= chars.length) {
    return chars.slice(0, count);
  }

  for (const c1 of chars) {
    for (const c2 of chars) {
      labels.push(c1 + c2);
      if (labels.length >= count) return labels;
    }
  }

  return labels;
}

function getActivePopup(): HTMLElement | null {
  if (!currentConfig.popupSelector) return null;

  const popup = document.querySelector<HTMLElement>(currentConfig.popupSelector);
  if (popup && popup.offsetParent !== null) {
    return popup;
  }
  return null;
}

function getClickableElements(scope: HintScope): HTMLElement[] {
  const popup = getActivePopup();

  let elements: HTMLElement[];

  if (popup) {
    const menuSelectors = [
      '[role="menuitem"]',
      '[role="option"]',
      "a[href]",
      "button",
    ];
    elements = Array.from(popup.querySelectorAll<HTMLElement>(menuSelectors.join(", ")));
  } else {
    const selectors = scope === "common" ? currentConfig.commonSelectors : currentConfig.allSelectors;
    const selectorString = selectors.join(", ");
    elements = Array.from(document.querySelectorAll<HTMLElement>(selectorString));
  }

  return elements.filter((el) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

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

  overlay.className = "keyboard-hint";
  overlay.textContent = label.toUpperCase();
  overlay.dataset.hint = label;

  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top + rect.height / 2 - 10}px;
    left: ${rect.left + rect.width / 2 - 10}px;
    background: #ffcc00;
    color: #000;
    font-size: 11px;
    font-weight: bold;
    font-family: monospace;
    padding: 2px 5px;
    border-radius: 3px;
    z-index: 2147483647;
    pointer-events: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 1px solid #cc9900;
  `;

  return overlay;
}

function showHints(mode: ClickMode, scope: HintScope): void {
  if (state.active) {
    hideHints();
  }

  const elements = getClickableElements(scope);
  if (elements.length === 0) return;

  const labels = generateHintLabels(elements.length);

  let container = document.getElementById(HINT_CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = HINT_CONTAINER_ID;
    document.body.appendChild(container);
  }

  state.hints.clear();
  state.overlays = [];
  state.typed = "";
  state.mode = mode;
  state.scope = scope;
  state.active = true;

  elements.forEach((el, i) => {
    const label = labels[i];
    const overlay = createHintOverlay(label, el);
    container!.appendChild(overlay);
    state.hints.set(label, el);
    state.overlays.push(overlay);
  });

  console.log(`[Keyboard Hints] Showing ${elements.length} hints (${mode}-click mode)`);
}

function hideHints(): void {
  const container = document.getElementById(HINT_CONTAINER_ID);
  if (container) {
    container.innerHTML = "";
  }

  state.active = false;
  state.hints.clear();
  state.overlays = [];
  state.typed = "";
}

function updateHintVisibility(): void {
  state.overlays.forEach((overlay) => {
    const hint = overlay.dataset.hint || "";
    if (hint.startsWith(state.typed)) {
      overlay.style.display = "block";
      if (state.typed.length > 0) {
        const matched = hint.slice(0, state.typed.length);
        const remaining = hint.slice(state.typed.length);
        overlay.innerHTML = `<span style="opacity: 0.5">${matched.toUpperCase()}</span>${remaining.toUpperCase()}`;
      }
    } else {
      overlay.style.display = "none";
    }
  });
}

function executeClick(element: HTMLElement, mode: ClickMode): void {
  if (mode === "right") {
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
  if (!state.active) return;

  if (key === "Escape") {
    hideHints();
    return;
  }

  if (key === "Backspace") {
    state.typed = state.typed.slice(0, -1);
    updateHintVisibility();
    return;
  }

  if (!HINT_CHARS.includes(key.toLowerCase())) {
    return;
  }

  state.typed += key.toLowerCase();

  const exactMatch = state.hints.get(state.typed);
  if (exactMatch) {
    hideHints();
    executeClick(exactMatch, state.mode);
    return;
  }

  const matchingHints = Array.from(state.hints.keys()).filter((h) =>
    h.startsWith(state.typed)
  );

  if (matchingHints.length === 0) {
    state.typed = state.typed.slice(0, -1);
    return;
  }

  if (matchingHints.length === 1) {
    const element = state.hints.get(matchingHints[0]);
    if (element) {
      hideHints();
      executeClick(element, state.mode);
    }
    return;
  }

  updateHintVisibility();
}

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    (active as HTMLElement).isContentEditable
  );
}

function preventEventDefaults(event: KeyboardEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function handleKeydown(e: KeyboardEvent): void {
  if (state.active) {
    e.preventDefault();
    e.stopPropagation();
    handleHintInput(e.key);
    return;
  }

  if (isInputFocused()) return;

  // 'f' for left-click hints (common elements)
  if (e.key === "f" && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    showHints("left", "common");
    return;
  }

  // 'Shift+F' for right-click (context menu) hints (common elements)
  if (e.key === "F" && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    showHints("right", "common");
    return;
  }

  // 'Ctrl+F' for left-click hints (ALL elements)
  if (e.key === "f" && e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    showHints("left", "all");
    return;
  }

  // 'Ctrl+Shift+F' for right-click hints (ALL elements)
  if (e.key === "F" && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    e.stopPropagation();
    showHints("right", "all");
    return;
  }
}

document.addEventListener("keydown", handleKeydown, true);

console.log(`[Keyboard Hints] Loaded config: ${currentConfig.name}`);
console.log("[Keyboard Hints] Shortcuts: f, Shift+F, Ctrl+f, Ctrl+Shift+F, Esc");

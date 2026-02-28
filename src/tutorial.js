// Purpose: In-app guided tour with anchored bubble and highlighted targets.
// Contract: Each tutorial step can request a route change before rendering.
// Verify: Step 2 opens the find view and highlights the search input.

const TUTORIAL_KEY = "hasSeenTutorial";

function removeExisting() {
  document.querySelector(".tutorial-overlay")?.remove();
  document.querySelector(".tutorial-target-ring")?.remove();
}

function getTargetRect(selector) {
  const node = document.querySelector(selector);
  if (!node) {
    return null;
  }
  return node.getBoundingClientRect();
}

function placeRing(rect) {
  const ring = document.createElement("div");
  ring.className = "tutorial-target-ring";
  ring.style.left = `${Math.max(rect.left - 6, 4)}px`;
  ring.style.top = `${Math.max(rect.top - 6, 4)}px`;
  ring.style.width = `${rect.width + 12}px`;
  ring.style.height = `${rect.height + 12}px`;
  document.body.appendChild(ring);
  return ring;
}

function buildOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "tutorial-overlay";
  return overlay;
}

export function hasSeenTutorial() {
  return localStorage.getItem(TUTORIAL_KEY) === "true";
}

export function markTutorialSeen() {
  localStorage.setItem(TUTORIAL_KEY, "true");
}

function waitForPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function positionBubble(card, rect) {
  const margin = 12;
  const cardRect = card.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!rect) {
    card.style.left = `${clamp(viewportWidth / 2 - cardRect.width / 2, margin, viewportWidth - cardRect.width - margin)}px`;
    card.style.top = `${clamp(viewportHeight - cardRect.height - margin, margin, viewportHeight - cardRect.height - margin)}px`;
    return;
  }

  const fitsBelow = rect.bottom + margin + cardRect.height <= viewportHeight - margin;
  const top = fitsBelow ? rect.bottom + margin : rect.top - cardRect.height - margin;
  const left = clamp(rect.left, margin, viewportWidth - cardRect.width - margin);
  card.style.left = `${left}px`;
  card.style.top = `${clamp(top, margin, viewportHeight - cardRect.height - margin)}px`;
}

export function startTutorial(steps, options = {}) {
  removeExisting();
  const overlay = buildOverlay();
  let index = 0;
  let isClosed = false;
  let activeRect = null;
  let onResize = null;

  function finish() {
    if (isClosed) {
      return;
    }
    isClosed = true;
    if (onResize) {
      window.removeEventListener("resize", onResize);
    }
    markTutorialSeen();
    removeExisting();
    options.onFinish?.();
  }

  async function renderStep() {
    if (isClosed) {
      return;
    }
    overlay.innerHTML = "";
    document.querySelector(".tutorial-target-ring")?.remove();
    const step = steps[index];
    if (typeof options.onStepChange === "function") {
      await options.onStepChange(step, index);
      await waitForPaint();
    }

    const rect = getTargetRect(step.targetSelector);
    activeRect = rect;
    if (rect) {
      placeRing(rect);
    }

    const card = document.createElement("div");
    card.className = "tutorial-card tutorial-bubble";
    card.innerHTML = `
      <h3 class="title">Kurzanleitung (${index + 1}/${steps.length})</h3>
      <p>${step.text}</p>
      <div class="stack">
        <button class="ghost-btn" data-action="skip">Überspringen</button>
        <button class="primary-btn" data-action="next">${index === steps.length - 1 ? "Fertig" : "Weiter"}</button>
      </div>
    `;

    card.querySelector('[data-action="skip"]').addEventListener("click", finish);
    card.querySelector('[data-action="next"]').addEventListener("click", async () => {
      if (index === steps.length - 1) {
        finish();
        return;
      }
      index += 1;
      await renderStep();
    });

    overlay.appendChild(card);
    positionBubble(card, rect);
  }

  document.body.appendChild(overlay);
  renderStep();

  onResize = () => {
    const bubble = document.querySelector(".tutorial-bubble");
    if (!bubble) {
      return;
    }
    activeRect = getTargetRect(steps[index].targetSelector);
    positionBubble(bubble, activeRect);
  };
  window.addEventListener("resize", onResize);

  return () => {
    window.removeEventListener("resize", onResize);
    removeExisting();
  };
}

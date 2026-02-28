// Purpose: Minimal reusable tutorial overlay with highlight ring.
// Contract: startTutorial() returns a cleanup function and persists completion.
// Verify: On first visit it auto-opens once; "?" can trigger it again anytime.

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

export function startTutorial(steps) {
  removeExisting();
  const overlay = buildOverlay();
  let index = 0;

  function finish() {
    markTutorialSeen();
    removeExisting();
  }

  function renderStep() {
    overlay.innerHTML = "";
    document.querySelector(".tutorial-target-ring")?.remove();
    const step = steps[index];
    const rect = getTargetRect(step.targetSelector);
    if (rect) {
      placeRing(rect);
    }

    const card = document.createElement("div");
    card.className = "tutorial-card";
    card.innerHTML = `
      <h3 class="title">Kurzanleitung (${index + 1}/${steps.length})</h3>
      <p>${step.text}</p>
      <div class="stack">
        <button class="ghost-btn" data-action="skip">Skip</button>
        <button class="primary-btn" data-action="next">${index === steps.length - 1 ? "Fertig" : "Next"}</button>
      </div>
    `;

    card.querySelector('[data-action="skip"]').addEventListener("click", finish);
    card.querySelector('[data-action="next"]').addEventListener("click", () => {
      if (index === steps.length - 1) {
        finish();
        return;
      }
      index += 1;
      renderStep();
    });

    overlay.appendChild(card);
  }

  renderStep();
  document.body.appendChild(overlay);

  return () => {
    removeExisting();
  };
}

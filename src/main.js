import { deleteDoc, getDoc, listAllDocs, listRecentDocs, saveDoc } from "./db.js";
import { processImageForStorage } from "./image.js";
import { scoreDocs } from "./search.js";
import { hasSeenTutorial, startTutorial } from "./tutorial.js";

// Purpose: Single-file app controller for showcase navigation and UI events.
// Contract: Keeps state in memory and persists NoteDoc records via db.js.
// Verify: Run all manual smoke flows from the implementation plan.

const app = document.querySelector("#app");

const state = {
  route: "home",
  docs: [],
  recent: [],
  query: "",
  selectedId: null,
  addDraft: {
    originalFile: null,
    processed: null,
    description: "",
  },
  toastMessage: "",
  zoomUrl: "",
};

function formatDateTime(ts) {
  return new Date(ts).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function defaultDescription() {
  return `Note - ${formatDateTime(Date.now())}`;
}

function baseLayout(content) {
  return `
    <main class="page">
      <div class="topbar">
        <div class="brand">Finest Properties</div>
        <button class="help-btn" id="help-btn" aria-label="Tutorial starten">?</button>
      </div>
      ${content}
    </main>
    ${state.toastMessage ? `<div class="toast">${state.toastMessage}</div>` : ""}
    ${
      state.zoomUrl
        ? `<div class="zoom-overlay" id="zoom-overlay"><img src="${state.zoomUrl}" alt="Zoomed note image" /></div>`
        : ""
    }
  `;
}

function docListTemplate(docs) {
  if (!docs.length) {
    return `<p class="hint">Noch keine Dokumente vorhanden.</p>`;
  }

  const items = docs
    .map((doc) => {
      const url = URL.createObjectURL(doc.blob);
      return `
        <li>
          <button class="doc-link" data-open-id="${doc.id}">
            <article class="doc-item">
              <img src="${url}" alt="Dokument Vorschau" />
              <div>
                <div>${escapeHtml(doc.description)}</div>
                <div class="meta">${formatDateTime(doc.createdAt)}</div>
              </div>
            </article>
          </button>
        </li>
      `;
    })
    .join("");

  return `<ul class="docs-list">${items}</ul>`;
}

function viewHome() {
  return `
    <section class="card stack">
      <h1 class="title">Notes Showcase</h1>
      <p class="hint">Schnell Notizen/Bilder speichern und später wiederfinden.</p>
      <button class="primary-btn" id="go-add">Dokument hinzufügen</button>
      <button class="secondary-btn" id="go-find">Dokument finden</button>
    </section>
  `;
}

function viewAdd() {
  const hasFile = Boolean(state.addDraft.processed);
  return `
    <section class="card stack">
      <h1 class="title">Dokument hinzufügen</h1>
      <p class="hint">Foto aufnehmen oder Datei hochladen, danach Beschreibung ergänzen.</p>
      <div class="stack">
        <button class="primary-btn" id="pick-camera">Foto aufnehmen</button>
        <button class="secondary-btn" id="pick-upload">Hochladen</button>
      </div>
      <input id="file-input" class="hidden" type="file" accept="image/*,.heic,.heif" />
      ${
        hasFile
          ? `<img class="file-preview" src="${state.addDraft.processed.previewUrl}" alt="Vorschau des Dokuments" />`
          : '<p class="hint">Noch kein Bild ausgewählt.</p>'
      }
      <label>
        Kurzbeschreibung (Pflichtfeld)
        <input id="description-input" type="text" maxlength="120" value="${escapeHtml(state.addDraft.description)}" />
      </label>
      <button class="primary-btn" id="save-doc" ${hasFile ? "" : "disabled"}>Save</button>
      <button class="ghost-btn" id="back-home">Back</button>
    </section>
  `;
}

function viewFind() {
  const query = state.query.trim();
  const scored = query ? scoreDocs(state.docs, query) : [];
  const noResults = query && scored.length === 0;
  const suggestion = state.recent[0];
  return `
    <section class="card stack">
      <h1 class="title">Dokument finden</h1>
      <input id="search-input" type="search" placeholder="Beschreibung suchen..." value="${escapeHtml(state.query)}" />
      ${
        noResults
          ? `<p class="hint">Leider nichts gefunden "${escapeHtml(query)}".</p>`
          : query
            ? "<p class=\"hint\">Suchergebnisse</p>"
            : "<p class=\"hint\">kürzlich hochgeladen</p>"
      }
      ${query ? docListTemplate(scored) : docListTemplate(state.recent)}
      ${
        noResults && suggestion
          ? `<div class="card">
              <strong>Vorschlag:</strong>
              <button class="doc-link" data-open-id="${suggestion.id}">
                ${escapeHtml(suggestion.description)} (${formatDateTime(suggestion.createdAt)})
              </button>
            </div>`
          : ""
      }
      ${
        noResults
          ? `<div class="stack">
               <p class="hint">kürzlich hochgeladen</p>
               ${docListTemplate(state.recent)}
             </div>`
          : ""
      }
      <button class="ghost-btn" id="back-home">Back</button>
    </section>
  `;
}

async function viewDetail() {
  const doc = state.selectedId ? await getDoc(state.selectedId) : null;
  if (!doc) {
    return `
      <section class="card stack">
        <h1 class="title">Document Detail</h1>
        <p class="hint">Dokument nicht gefunden.</p>
        <button class="ghost-btn" id="go-find">Zurück zu Dokument finden</button>
      </section>
    `;
  }
  const imageUrl = URL.createObjectURL(doc.blob);
  return `
    <section class="card stack">
      <h1 class="title">Document Detail</h1>
      <div class="image-panel">
        <img id="detail-image" src="${imageUrl}" alt="Gespeichertes Dokument" />
      </div>
      <label>
        Beschreibung
        <input id="detail-description" type="text" value="${escapeHtml(doc.description)}" />
      </label>
      <div class="stack">
        <button class="secondary-btn" id="save-detail">Beschreibung speichern</button>
        <button class="danger-btn" id="delete-doc">Löschen</button>
        <button class="ghost-btn" id="back-find">Back</button>
      </div>
      <div class="meta">${formatDateTime(doc.createdAt)}</div>
    </section>
  `;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Silent fallback: showcase should still run without SW.
    });
  }
}

function showToast(message) {
  state.toastMessage = message;
  render();
  setTimeout(() => {
    if (state.toastMessage === message) {
      state.toastMessage = "";
      render();
    }
  }, 1700);
}

async function refreshCollections() {
  state.docs = (await listAllDocs()).sort((a, b) => b.createdAt - a.createdAt);
  state.recent = await listRecentDocs(10);
}

async function navigate(route, selectedId = null) {
  state.route = route;
  state.selectedId = selectedId;
  await render();
}

function getTutorialSteps() {
  return [
    {
      targetSelector: "#go-add",
      text: "Tippe auf Dokument hinzufügen, um ein Foto einer Notiz oder Karte schnell abzulegen.",
    },
    {
      targetSelector: "#go-find",
      text: "Mit Dokument finden suchst und öffnest du gespeicherte Notizen später wieder.",
    },
    {
      targetSelector: "#description-input",
      text: "Eine kurze Beschreibung wie 'Muller - Ruckruf' hilft beim schnellen Wiederfinden.",
    },
    {
      targetSelector: "#help-btn",
      text: "Fertig. Mit dem Fragezeichen kannst du das Tutorial jederzeit wieder starten.",
    },
  ];
}

function openTutorial() {
  startTutorial(getTutorialSteps());
}

async function handleFilePick(file) {
  state.addDraft.originalFile = file;
  state.addDraft.processed = await processImageForStorage(file);
  if (!state.addDraft.description) {
    state.addDraft.description = defaultDescription();
  }
  await render();
}

async function bindEvents() {
  document.querySelector("#help-btn")?.addEventListener("click", () => openTutorial());
  document.querySelector("#go-add")?.addEventListener("click", () => navigate("add"));
  document.querySelector("#go-find")?.addEventListener("click", () => navigate("find"));
  document.querySelector("#back-home")?.addEventListener("click", () => navigate("home"));
  document.querySelector("#back-find")?.addEventListener("click", () => navigate("find"));

  document.querySelectorAll("[data-open-id]").forEach((node) => {
    node.addEventListener("click", () => navigate("detail", node.getAttribute("data-open-id")));
  });

  const searchInput = document.querySelector("#search-input");
  if (searchInput) {
    searchInput.addEventListener("input", async (event) => {
      state.query = event.target.value;
      await render();
    });
  }

  const fileInput = document.querySelector("#file-input");
  if (fileInput) {
    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      try {
        await handleFilePick(file);
      } catch (error) {
        console.error(error);
        showToast("Bild konnte nicht verarbeitet werden");
      }
    });
  }

  document.querySelector("#pick-upload")?.addEventListener("click", () => {
    const input = document.querySelector("#file-input");
    input?.removeAttribute("capture");
    input?.click();
  });

  document.querySelector("#pick-camera")?.addEventListener("click", () => {
    const input = document.querySelector("#file-input");
    input?.setAttribute("capture", "environment");
    input?.click();
  });

  const descriptionInput = document.querySelector("#description-input");
  if (descriptionInput) {
    descriptionInput.addEventListener("input", (event) => {
      state.addDraft.description = event.target.value;
    });
  }

  document.querySelector("#save-doc")?.addEventListener("click", async () => {
    const description = state.addDraft.description.trim();
    if (!description || !state.addDraft.processed) {
      showToast("Beschreibung und Bild sind erforderlich");
      return;
    }
    await saveDoc({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      description,
      mimeType: state.addDraft.processed.mimeType,
      blob: state.addDraft.processed.blob,
    });
    state.addDraft = { originalFile: null, processed: null, description: defaultDescription() };
    await refreshCollections();
    showToast("Gespeichert");
    await navigate("find");
  });

  document.querySelector("#save-detail")?.addEventListener("click", async () => {
    const doc = await getDoc(state.selectedId);
    if (!doc) {
      return;
    }
    const description = document.querySelector("#detail-description")?.value?.trim() || doc.description;
    await saveDoc({
      ...doc,
      description,
    });
    await refreshCollections();
    showToast("Beschreibung gespeichert");
    await render();
  });

  document.querySelector("#delete-doc")?.addEventListener("click", async () => {
    if (!state.selectedId) {
      return;
    }
    if (!window.confirm("Dokument wirklich löschen?")) {
      return;
    }
    await deleteDoc(state.selectedId);
    await refreshCollections();
    showToast("Dokument gelöscht");
    await navigate("find");
  });

  document.querySelector("#detail-image")?.addEventListener("click", (event) => {
    state.zoomUrl = event.target.getAttribute("src");
    render();
  });

  document.querySelector("#zoom-overlay")?.addEventListener("click", () => {
    state.zoomUrl = "";
    render();
  });
}

async function render() {
  let content = "";
  if (state.route === "home") {
    content = viewHome();
  } else if (state.route === "add") {
    content = viewAdd();
  } else if (state.route === "find") {
    content = viewFind();
  } else if (state.route === "detail") {
    content = await viewDetail();
  }
  app.innerHTML = baseLayout(content);
  await bindEvents();
}

async function boot() {
  registerServiceWorker();
  state.addDraft.description = defaultDescription();
  await refreshCollections();
  await render();
  console.info("[health] App booted and initial data loaded");

  if (!hasSeenTutorial()) {
    openTutorial();
  }
}

boot();

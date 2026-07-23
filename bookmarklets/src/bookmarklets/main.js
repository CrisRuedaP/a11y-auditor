/**
 * MAIN BOOKMARKLET - A11Y AUDITOR
 *
 * This file is the orchestration logic for the main bookmarklet.
 * `build.js` concatenates it together with all the classes from src/core
 * and src/analyzers into a single IIFE to generate the final bookmarklet
 * (see bookmarklets/dist/ after running `npm run build`).
 */

(async function initAuditBookmarklet() {
  try {
    // Avoid running multiple times
    if (window.a11yAuditRunning) {
      console.warn("Auditoría ya en ejecución");
      return;
    }

    window.a11yAuditRunning = true;

    // Create UI
    const ui = new AuditUI();

    // Create auditor
    const auditor = new Auditor(ui);

    // Open panel
    ui.open();

    // Non-blocking: never delays or interrupts opening the panel
    checkForUpdates(ui);

    // Create options menu
    const contentContainer = ui.container.querySelector(".a11y-audit-content");
    const analyzerIcons = {
      Headings:
        '<line x1="6" y1="4" x2="6" y2="18" /><line x1="16" y1="4" x2="16" y2="18" /><line x1="6" y1="11" x2="16" y2="11" />',
      "Axe-Core":
        '<circle cx="12" cy="12" r="8" /><polyline points="8.5 12 11 14.5 16 9" />',
      Imágenes:
        '<rect x="3" y="4" width="18" height="14" rx="2" /><circle cx="8.5" cy="9.5" r="1.4" /><polyline points="21 15 15 9 4.5 18" />',
      Contraste:
        '<circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />',
      ARIA: '<path d="M3 11V5a2 2 0 0 1 2-2h6l10 10-8 8L3 11z" /><circle cx="7.5" cy="7.5" r="1.2" />',
      Formularios:
        '<rect x="5" y="3" width="14" height="18" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" />',
      Semántica:
        '<rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="10" width="7" height="10" rx="1" /><rect x="12" y="10" width="9" height="10" rx="1" />',
      Teclado:
        '<rect x="2" y="6" width="20" height="12" rx="2" /><rect x="5" y="9" width="2" height="2" fill="currentColor" stroke="none" /><rect x="9" y="9" width="2" height="2" fill="currentColor" stroke="none" /><rect x="13" y="9" width="2" height="2" fill="currentColor" stroke="none" /><rect x="17" y="9" width="2" height="2" fill="currentColor" stroke="none" /><rect x="7" y="13" width="10" height="2" fill="currentColor" stroke="none" />',
      Links:
        '<path d="M9 15l6-6" /><path d="M8 12l-2.5 2.5a3 3 0 0 0 4 4L12 16" /><path d="M16 12l2.5-2.5a3 3 0 0 0-4-4L12 8" />',
    };
    const analyzerBtn = (name) => `
      <button class="analyzer-btn" data-analyzer="${name}" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #ffffff; border: 1px solid #c7c3c2; border-radius: 4px; cursor: pointer; font-size: 16px; color: #1a1a1a; text-align: left;">
        <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">${analyzerIcons[name]}</svg>
        ${name}
      </button>
    `;
    contentContainer.innerHTML = `
      <div style="padding: 16px;">
        <div style="margin-bottom: 16px;">
          <button id="run-all" style="width: 100%; padding: 12px; background: #1a1a1a; color: #f0f0f0; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 16px; margin-bottom: 8px;">
            ▶ Ejecutar Todos
          </button>
        </div>

        <div style="font-size: 14px; color: #6b6866; margin-bottom: 16px; text-align: center;">
          O selecciona un análisis específico:
        </div>

        <div id="analyzer-buttons" style="display: grid; grid-template-columns: 1fr; gap: 8px;">
          ${analyzerBtn("Headings")}
          ${analyzerBtn("Axe-Core")}
          ${analyzerBtn("Imágenes")}
          ${analyzerBtn("Contraste")}
          ${analyzerBtn("ARIA")}
          ${analyzerBtn("Formularios")}
          ${analyzerBtn("Semántica")}
          ${analyzerBtn("Teclado")}
          ${analyzerBtn("Links")}
        </div>
      </div>
    `;

    // Event listeners
    // Looked up inside contentContainer, not document: the bookmarklet is
    // injected into third-party pages that may have their own elements with
    // id="run-all" or class "analyzer-btn", and a global lookup could latch
    // onto the wrong element from the site instead of the panel's own.
    contentContainer
      .querySelector("#run-all")
      .addEventListener("click", async () => {
        contentContainer.innerHTML =
          '<div class="a11y-audit-loading">Ejecutando auditoría completa...</div>';
        const results = await auditor.runAll();
        window.a11yAuditResults = results;
        JsonUtils.logResults(results);
        JsonUtils.copyToClipboard(results);
      });

    contentContainer.querySelectorAll(".analyzer-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const analyzerName = btn.dataset.analyzer;
        contentContainer.innerHTML = `<div class="a11y-audit-loading">Ejecutando ${analyzerName}...</div>`;
        const result = await auditor.runAnalyzer(analyzerName);
        const fullResults = auditor.getResults();
        window.a11yAuditResults = fullResults;
        JsonUtils.logResults(fullResults);
        JsonUtils.copyToClipboard(fullResults);
      });
    });

    console.log(
      "%cA11Y AUDITOR INICIADO",
      "color: #1a1a1a; font-weight: bold; font-size: 16px;",
    );
    console.log("Panel abierto. Selecciona un análisis para comenzar.");
  } catch (error) {
    console.error("Error iniciando auditoría:", error);
    alert("Error iniciando auditoría: " + error.message);
  } finally {
    window.a11yAuditRunning = false;
  }
})();

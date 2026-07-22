/**
 * BOOKMARKLET PRINCIPAL - A11Y AUDITOR
 *
 * Este archivo es la lógica de orquestación del bookmarklet principal.
 * `build.js` lo concatena junto con todas las clases de src/core y
 * src/analyzers dentro de un único IIFE para generar el bookmarklet final
 * (ver bookmarklets/dist/ tras ejecutar `npm run build`).
 */

(async function initAuditBookmarklet() {
  try {
    // Evitar ejecutarse múltiples veces
    if (window.a11yAuditRunning) {
      console.warn("Auditoría ya en ejecución");
      return;
    }

    window.a11yAuditRunning = true;

    // Crear UI
    const ui = new AuditUI();

    // Crear auditor
    const auditor = new Auditor(ui);

    // Abrir panel
    ui.open();

    // Crear menú de opciones
    const contentContainer = ui.container.querySelector(".a11y-audit-content");
    contentContainer.innerHTML = `
      <div style="padding: 16px;">
        <div style="margin-bottom: 16px;">
          <button id="run-all" style="width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; margin-bottom: 8px;">
            ▶ Ejecutar Todos
          </button>
        </div>

        <div style="font-size: 12px; color: #6b7280; margin-bottom: 16px; text-align: center;">
          O selecciona un análisis específico:
        </div>

        <div id="analyzer-buttons" style="display: grid; grid-template-columns: 1fr; gap: 8px;">
          <button class="analyzer-btn" data-analyzer="Headings" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">📋 Headings</button>
          <button class="analyzer-btn" data-analyzer="Axe-Core" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">🔍 Axe-Core</button>
          <button class="analyzer-btn" data-analyzer="Imágenes" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">🖼️ Imágenes</button>
          <button class="analyzer-btn" data-analyzer="Contraste" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">🎨 Contraste</button>
          <button class="analyzer-btn" data-analyzer="ARIA" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">🏷️ ARIA</button>
          <button class="analyzer-btn" data-analyzer="Formularios" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">📝 Formularios</button>
          <button class="analyzer-btn" data-analyzer="Semántica" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">🏗️ Semántica</button>
          <button class="analyzer-btn" data-analyzer="Teclado" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">⌨️ Teclado</button>
          <button class="analyzer-btn" data-analyzer="Links" style="padding: 8px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;">🔗 Links</button>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById("run-all").addEventListener("click", async () => {
      contentContainer.innerHTML =
        '<div class="a11y-audit-loading">Ejecutando auditoría completa...</div>';
      const results = await auditor.runAll();
      window.a11yAuditResults = results;
      JsonUtils.logResults(results);
      JsonUtils.copyToClipboard(results);
    });

    document.querySelectorAll(".analyzer-btn").forEach((btn) => {
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
      "%c♿ A11Y AUDITOR INICIADO",
      "color: #2563eb; font-weight: bold; font-size: 16px;",
    );
    console.log("Panel abierto. Selecciona un análisis para comenzar.");
  } catch (error) {
    console.error("Error iniciando auditoría:", error);
    alert("Error iniciando auditoría: " + error.message);
  } finally {
    window.a11yAuditRunning = false;
  }
})();

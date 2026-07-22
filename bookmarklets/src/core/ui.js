/**
 * Módulo UI para el panel lateral (sidebar) de auditoría
 * Maneja la visualización de resultados y la interacción del usuario
 */
class AuditUI {
  constructor() {
    this.isOpen = false;
    this.container = null;
    this.highlightedElements = new Set();
    this.results = {};
    this.activeTab = null;
  }

  /**
   * Inicializa y abre el panel sidebar
   */
  open() {
    if (this.isOpen) return;

    this._injectStyles();
    this._createPanel();
    this.isOpen = true;
    this.container?.classList.add("a11y-audit-open");
  }

  /**
   * Cierra el panel sidebar
   */
  close() {
    if (!this.isOpen) return;
    this._clearHighlights();
    this.container?.classList.remove("a11y-audit-open");
    this.isOpen = false;
  }

  /**
   * Alterna entre abrir y cerrar el panel
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Agrega resultados de un analizador al panel
   * @param {string} analyzerName - Nombre del analizador
   * @param {object} results - Resultados del análisis
   */
  addResults(analyzerName, results) {
    this.results[analyzerName] = results;
    this._updateUI();
  }

  /**
   * Inyecta los estilos CSS necesarios
   * @private
   */
  _injectStyles() {
    if (document.getElementById("a11y-audit-styles")) return;

    const style = document.createElement("style");
    style.id = "a11y-audit-styles";
    style.textContent = `
      /* Panel Principal */
      .a11y-audit-sidebar {
        display: none;
        position: fixed;
        right: 0;
        top: 0;
        width: 400px;
        height: 100vh;
        background: #fff;
        border-left: 3px solid #2563eb;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        flex-direction: column;
        overflow: hidden;
      }

      .a11y-audit-sidebar.a11y-audit-open {
        display: flex;
        animation: slideIn 0.3s ease-out;
      }

      @media (prefers-reduced-motion: reduce) {
        .a11y-audit-sidebar.a11y-audit-open {
          animation: none;
        }
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      /* Header */
      .a11y-audit-header {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        color: white;
      }

      .a11y-audit-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .a11y-audit-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .a11y-audit-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Resumen */
      .a11y-audit-summary {
        padding: 12px 16px;
        background: #f3f4f6;
        border-bottom: 1px solid #e5e7eb;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        font-size: 12px;
      }

      .a11y-audit-stat {
        text-align: center;
      }

      .a11y-audit-stat-value {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
      }

      .a11y-audit-stat-label {
        color: #6b7280;
        font-size: 11px;
        margin-top: 2px;
      }

      .a11y-audit-stat.errors .a11y-audit-stat-value {
        color: #dc2626;
      }

      .a11y-audit-stat.warnings .a11y-audit-stat-value {
        color: #f59e0b;
      }

      .a11y-audit-stat.passed .a11y-audit-stat-value {
        color: #16a34a;
      }

      /* Tabs */
      .a11y-audit-tabs {
        display: flex;
        border-bottom: 1px solid #e5e7eb;
        overflow-x: auto;
        background: #f9fafb;
      }

      .a11y-audit-tab {
        padding: 12px 14px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 13px;
        color: #6b7280;
        white-space: nowrap;
        transition: all 0.2s;
        border-bottom: 2px solid transparent;
      }

      .a11y-audit-tab:hover {
        color: #2563eb;
      }

      .a11y-audit-tab.active {
        color: #2563eb;
        border-bottom-color: #2563eb;
        font-weight: 600;
      }

      /* Contenido */
      .a11y-audit-content {
        flex: 1;
        overflow-y: auto;
        padding: 12px 0;
      }

      .a11y-audit-tab-pane {
        display: none;
        padding: 0 12px;
      }

      .a11y-audit-tab-pane.active {
        display: block;
      }

      /* Issues */
      .a11y-audit-issue {
        padding: 10px;
        margin-bottom: 8px;
        border-left: 4px solid;
        background: #f9fafb;
        border-radius: 4px;
        font-size: 12px;
      }

      .a11y-audit-issue.error {
        border-color: #dc2626;
        background: #fee2e2;
      }

      .a11y-audit-issue.warning {
        border-color: #f59e0b;
        background: #fef3c7;
      }

      .a11y-audit-issue.info {
        border-color: #3b82f6;
        background: #dbeafe;
      }

      .a11y-audit-issue-message {
        font-weight: 500;
        color: #1f2937;
        margin-bottom: 4px;
      }

      .a11y-audit-issue-selector {
        color: #6b7280;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        word-break: break-all;
        margin-top: 4px;
      }

      .a11y-audit-issue-metadata {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        color: #6b7280;
        font-size: 11px;
      }

      /* Empty State */
      .a11y-audit-empty {
        padding: 24px 16px;
        text-align: center;
        color: #9ca3af;
      }

      .a11y-audit-loading {
        padding: 24px 16px;
        text-align: center;
        color: #6b7280;
      }

      /* Footer */
      .a11y-audit-footer {
        padding: 12px 16px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
        display: flex;
        gap: 8px;
        font-size: 12px;
      }

      .a11y-audit-button {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .a11y-audit-button:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .a11y-audit-button.primary {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
      }

      .a11y-audit-button.primary:hover {
        background: #1d4ed8;
        border-color: #1d4ed8;
      }

      /* Highlight en elementos */
      .a11y-audit-highlight {
        outline: 2px solid #dc2626 !important;
        outline-offset: 2px !important;
        background-color: rgba(220, 38, 38, 0.1) !important;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .a11y-audit-sidebar {
          width: 100%;
          border-left: none;
          border-bottom: 3px solid #2563eb;
          height: 50vh;
        }

        .a11y-audit-summary {
          grid-template-columns: 1fr 1fr 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Crea la estructura del panel sidebar
   * @private
   */
  _createPanel() {
    if (this.container) return;

    this.container = document.createElement("div");
    this.container.id = "a11y-audit-sidebar";
    this.container.className = "a11y-audit-sidebar";

    this.container.innerHTML = `
      <div class="a11y-audit-header">
        <h2 class="a11y-audit-title">
          ♿ Auditoría de Accesibilidad
        </h2>
        <button class="a11y-audit-close" aria-label="Cerrar panel">✕</button>
      </div>

      <div class="a11y-audit-summary">
        <div class="a11y-audit-stat errors">
          <div class="a11y-audit-stat-value" data-stat="errors">0</div>
          <div class="a11y-audit-stat-label">Errores</div>
        </div>
        <div class="a11y-audit-stat warnings">
          <div class="a11y-audit-stat-value" data-stat="warnings">0</div>
          <div class="a11y-audit-stat-label">Advertencias</div>
        </div>
        <div class="a11y-audit-stat passed">
          <div class="a11y-audit-stat-value" data-stat="passed">0</div>
          <div class="a11y-audit-stat-label">Aprobados</div>
        </div>
      </div>

      <div class="a11y-audit-tabs"></div>
      <div class="a11y-audit-content"></div>

      <div class="a11y-audit-footer">
        <button class="a11y-audit-button primary" id="a11y-copy-json">Copiar JSON</button>
        <button class="a11y-audit-button" id="a11y-clear-highlights">Limpiar</button>
      </div>
    `;

    document.body.appendChild(this.container);

    // Event listeners
    this.container
      .querySelector(".a11y-audit-close")
      .addEventListener("click", () => this.close());
    this.container
      .querySelector("#a11y-copy-json")
      .addEventListener("click", () => this._copyResultsToClipboard());
    this.container
      .querySelector("#a11y-clear-highlights")
      .addEventListener("click", () => this._clearHighlights());
  }

  /**
   * Actualiza la interfaz con los resultados
   * @private
   */
  _updateUI() {
    if (!this.container) return;

    const tabsContainer = this.container.querySelector(".a11y-audit-tabs");
    const contentContainer = this.container.querySelector(
      ".a11y-audit-content",
    );

    tabsContainer.innerHTML = "";
    contentContainer.innerHTML = "";

    let totalErrors = 0;
    let totalWarnings = 0;
    let totalPassed = 0;

    // Cada analizador termina en un momento distinto (axe-core en particular
    // puede tardar bastante en páginas grandes), y cada uno dispara un
    // re-render completo. Si no recordáramos qué pestaña eligió la persona
    // usuaria, cada re-render la resetearía a la primera pestaña disponible.
    const activeTabExists =
      this.activeTab && Object.prototype.hasOwnProperty.call(this.results, this.activeTab);
    if (!activeTabExists) {
      this.activeTab = Object.keys(this.results)[0] || null;
    }

    Object.entries(this.results).forEach(([name, result]) => {
      const isActive = name === this.activeTab;

      // Crear tab
      const tab = document.createElement("button");
      tab.className = `a11y-audit-tab ${isActive ? "active" : ""}`;
      tab.textContent = name;
      tab.addEventListener("click", () => this._switchTab(name));
      tabsContainer.appendChild(tab);

      // Crear contenido
      const pane = document.createElement("div");
      pane.className = `a11y-audit-tab-pane ${isActive ? "active" : ""}`;
      pane.dataset.analyzer = name;

      if (result.issues && result.issues.length > 0) {
        result.issues.forEach((issue) => {
          const issueEl = document.createElement("div");
          issueEl.className = `a11y-audit-issue ${issue.severity}`;
          issueEl.innerHTML = `
            <div class="a11y-audit-issue-message">${this._escapeHtml(issue.message)}</div>
            ${issue.selector ? `<div class="a11y-audit-issue-selector">${this._escapeHtml(issue.selector)}</div>` : ""}
            ${issue.elementInfo ? `<div class="a11y-audit-issue-metadata">${this._escapeHtml(issue.elementInfo.tag)}</div>` : ""}
          `;
          pane.appendChild(issueEl);
        });
      } else {
        pane.innerHTML =
          '<div class="a11y-audit-empty">✓ Sin problemas detectados</div>';
      }

      contentContainer.appendChild(pane);

      // Contar totales
      totalErrors += result.failed || 0;
      totalWarnings += result.warnings || 0;
      totalPassed += result.passed || 0;
    });

    // Actualizar resumen
    this.container.querySelector('[data-stat="errors"]').textContent =
      totalErrors;
    this.container.querySelector('[data-stat="warnings"]').textContent =
      totalWarnings;
    this.container.querySelector('[data-stat="passed"]').textContent =
      totalPassed;

    if (tabsContainer.children.length === 0) {
      this.container.querySelector(".a11y-audit-content").innerHTML =
        '<div class="a11y-audit-loading">Esperando resultados...</div>';
    }
  }

  /**
   * Cambia a una pestaña específica
   * @private
   */
  _switchTab(analyzerName) {
    this.activeTab = analyzerName;

    const tabs = this.container?.querySelectorAll(".a11y-audit-tab");
    const panes = this.container?.querySelectorAll(".a11y-audit-tab-pane");

    tabs?.forEach((tab) => tab.classList.remove("active"));
    panes?.forEach((pane) => pane.classList.remove("active"));

    Array.from(tabs || [])
      .find((tab) => tab.textContent === analyzerName)
      ?.classList.add("active");
    Array.from(panes || [])
      .find((pane) => pane.dataset.analyzer === analyzerName)
      ?.classList.add("active");
  }

  /**
   * Resalta un elemento en la página
   * @private
   */
  highlightElement(element) {
    if (!element) return;
    element.classList.add("a11y-audit-highlight");
    this.highlightedElements.add(element);
  }

  /**
   * Limpia todos los resaltados
   * @private
   */
  _clearHighlights() {
    this.highlightedElements.forEach((el) => {
      el.classList.remove("a11y-audit-highlight");
    });
    this.highlightedElements.clear();
  }

  /**
   * Copia los resultados al portapapeles en formato JSON
   * @private
   */
  _copyResultsToClipboard() {
    const json = JSON.stringify(this.results, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      // Feedback visual
      const button = this.container?.querySelector("#a11y-copy-json");
      const originalText = button?.textContent;
      button.textContent = "✓ Copiado!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);

      // También loguear en consola
      console.log("📋 Resultados de auditoría copiados al portapapeles");
      console.log(JSON.parse(json));
    });
  }

  /**
   * Escapa caracteres HTML
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destruye el panel y limpia
   */
  destroy() {
    this._clearHighlights();
    this.container?.remove();
    this.container = null;
    this.isOpen = false;
    document.getElementById("a11y-audit-styles")?.remove();
  }
}

export default AuditUI;

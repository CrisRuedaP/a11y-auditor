(function () {
"use strict";
/**
 * Clase base para todos los analizadores de accesibilidad
 * Proporciona estructura común y métodos estándar
 */
class Analyzer {
  constructor(name, description) {
    this.name = name;
    this.description = description;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: [],
    };
  }

  /**
   * Ejecuta el análisis
   * Debe ser sobrescrito por subclases
   */
  async run() {
    throw new Error(
      `run() method must be implemented by ${this.constructor.name}`,
    );
  }

  /**
   * Valida que los resultados tengan la estructura correcta
   */
  validate() {
    return (
      this.results &&
      typeof this.results.passed === "number" &&
      typeof this.results.failed === "number" &&
      Array.isArray(this.results.issues)
    );
  }

  /**
   * Formatea un issue para los resultados
   * @param {string} severity - 'error', 'warning', 'info'
   * @param {string} message - Descripción del problema
   * @param {HTMLElement} element - Elemento problemático (opcional)
   * @param {object} metadata - Información adicional
   */
  addIssue(severity, message, element = null, metadata = {}) {
    const issue = {
      severity,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    };

    if (element && element.tagName) {
      issue.selector = this._generateSelector(element);
      issue.elementInfo = {
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        classes: element.className || null,
        text: element.textContent?.substring(0, 100) || null,
      };
    }

    this.results.issues.push(issue);

    // Contar por severidad
    if (severity === "error") {
      this.results.failed++;
    } else if (severity === "warning") {
      this.results.warnings++;
    }
  }

  /**
   * Genera un selector CSS único para un elemento
   * @private
   */
  _generateSelector(element) {
    if (element.id) return `#${element.id}`;

    let path = [];
    let current = element;

    while (current && current.tagName && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }

      const siblings = Array.from(current.parentNode?.children || []);
      const index = siblings
        .filter((s) => s.tagName.toLowerCase() === selector)
        .indexOf(current);

      if (index > 0) {
        selector += `:nth-of-type(${index + 1})`;
      }

      path.unshift(selector);
      current = current.parentNode;
    }

    return path.join(" > ");
  }

  /**
   * Resetea los resultados
   */
  reset() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: [],
    };
  }

  /**
   * Obtiene un resumen de los resultados
   */
  getSummary() {
    return {
      name: this.name,
      description: this.description,
      ...this.results,
      total: this.results.passed + this.results.failed + this.results.warnings,
    };
  }

  /**
   * Marca un análisis como pasado
   */
  markPassed() {
    this.results.passed++;
  }

  /**
   * Obtiene elementos de un tipo específico con un filtro.
   * Excluye el propio panel del auditor: si no, cada analizador terminaría
   * auditando su propia UI en vez de (solo) la página de la persona usuaria.
   * @protected
   */
  _querySelectorAll(selector) {
    return Array.from(document.querySelectorAll(selector)).filter(
      (element) => !element.closest("#a11y-audit-sidebar"),
    );
  }

  /**
   * Obtiene estilos computados de un elemento
   * @protected
   */
  _getComputedStyle(element) {
    return window.getComputedStyle(element);
  }
}

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

/**
 * Analizador de Headings (h1-h6)
 * Valida jerarquía, detecta saltos de nivel, h1 duplicados, etc
 */

class HeadingsAnalyzer extends Analyzer {
  constructor() {
    super("Headings", "Análisis de encabezados y jerarquía");
  }

  async run() {
    this.reset();
    const headings = this._querySelectorAll("h1, h2, h3, h4, h5, h6");

    if (headings.length === 0) {
      this.addIssue(
        "warning",
        "No se encontraron encabezados en la página",
        null,
        { severity: "critical" },
      );
      return this.getSummary();
    }

    const headingLevels = headings.map((h) => ({
      element: h,
      level: parseInt(h.tagName[1]),
      text: h.textContent.trim().substring(0, 60),
    }));

    // Verificar H1 único
    const h1Count = headingLevels.filter((h) => h.level === 1).length;
    if (h1Count === 0) {
      this.addIssue("error", "No hay H1 en la página", null, {
        severity: "critical",
      });
    } else if (h1Count > 1) {
      this.addIssue(
        "warning",
        `Se encontraron ${h1Count} H1 (debe haber solo 1)`,
        null,
        { count: h1Count },
      );
    } else {
      this.markPassed();
    }

    // Verificar saltos de nivel
    let lastLevel = 0;
    for (let i = 0; i < headingLevels.length; i++) {
      const { element, level, text } = headingLevels[i];
      const diff = level - lastLevel;

      if (i === 0 && level !== 1) {
        this.addIssue(
          "warning",
          `El primer encabezado es H${level}, debería ser H1`,
          element,
          { level, expectedLevel: 1 },
        );
      } else if (diff > 1 && lastLevel !== 0) {
        this.addIssue(
          "warning",
          `Salto de jerarquía: de H${lastLevel} a H${level}`,
          element,
          { from: lastLevel, to: level },
        );
      } else {
        this.markPassed();
      }

      lastLevel = level;
    }

    // Verificar headings vacíos
    headingLevels.forEach(({ element, level, text }) => {
      if (!text) {
        this.addIssue("error", `H${level} vacío sin texto`, element, { level });
      }
    });

    return this.getSummary();
  }
}

/**
 * Analizador Axe-Core
 * Ejecuta la librería axe-core para detectar problemas de accesibilidad
 */

class AxeCoreAnalyzer extends Analyzer {
  constructor() {
    super("Axe-Core", "Análisis automático con axe-core");
  }

  async run() {
    this.reset();

    // Inyectar axe-core si no está cargado
    if (!window.axe) {
      await this._loadAxeCore();
    }

    if (!window.axe) {
      this.addIssue("error", "No se pudo cargar axe-core", null, {
        severity: "critical",
      });
      return this.getSummary();
    }

    try {
      // Excluir el propio panel del auditor: si no, axe-core también analiza
      // el sidebar que acabamos de inyectar y contamina los resultados.
      const context = document.getElementById("a11y-audit-sidebar")
        ? { exclude: [["#a11y-audit-sidebar"]] }
        : document;

      const results = await new Promise((resolve) => {
        window.axe.run(context, (err, results) => {
          resolve(results || { violations: [], passes: [], inapplicable: [] });
        });
      });

      // Procesar violations
      results.violations?.forEach((violation) => {
        violation.nodes?.forEach((node) => {
          const element = this._safeQuerySelector(node.target?.[0]);
          this.addIssue(
            "error",
            `[${violation.id}] ${violation.help}`,
            element,
            {
              ruleId: violation.id,
              description: violation.description,
              impact: violation.impact,
            },
          );
        });
      });

      // Contar passes
      results.passes?.forEach((pass) => {
        pass.nodes?.forEach(() => {
          this.markPassed();
        });
      });

      // Agregar metadata
      this.results.inapplicable = results.inapplicable?.length || 0;
      this.results.timestamp = new Date().toISOString();

      return this.getSummary();
    } catch (error) {
      this.addIssue(
        "error",
        `Error ejecutando axe-core: ${error.message}`,
        null,
        {
          error: error.toString(),
        },
      );
      return this.getSummary();
    }
  }

  /**
   * axe-core a veces devuelve selectores compuestos (arrays, para elementos
   * dentro de iframes/shadow DOM) o selectores que document.querySelector
   * no puede resolver. Nunca debe tirar abajo el resto del análisis.
   * @private
   */
  _safeQuerySelector(target) {
    if (!target) return null;
    const selector = Array.isArray(target) ? target.join(" ") : target;
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  /**
   * Carga axe-core desde CDN
   * @private
   */
  _loadAxeCore() {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js";
      script.onload = () => resolve();
      script.onerror = () => resolve(); // Resolver aunque falle
      document.head.appendChild(script);
    });
  }
}

/**
 * Analizador de Imágenes
 * Valida alt text, detecta imágenes decorativas, etc
 */

class ImagesAnalyzer extends Analyzer {
  constructor() {
    super("Imágenes", "Análisis de imágenes y alt text");
  }

  async run() {
    this.reset();

    // Encontrar todas las imágenes
    const images = this._querySelectorAll("img");
    const svgs = this._querySelectorAll("svg");
    const backgroundImages = this._findBackgroundImages();

    const totalImages = images.length + svgs.length + backgroundImages.length;

    if (totalImages === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analizar IMG tags
    images.forEach((img) => {
      const alt = img.getAttribute("alt");
      const ariaLabel = img.getAttribute("aria-label");
      const ariaLabelledBy = img.getAttribute("aria-labelledby");
      const role = img.getAttribute("role");

      if (!alt && !ariaLabel && !ariaLabelledBy) {
        this.addIssue("error", "Imagen sin atributo alt", img, {
          src: img.src?.substring(0, 100),
        });
      } else if (alt === "") {
        // alt vacío es válido si es decorativa
        if (role !== "presentation" && role !== "none") {
          this.addIssue(
            "warning",
            "Imagen con alt vacío (verificar si es decorativa)",
            img,
            {
              src: img.src?.substring(0, 100),
            },
          );
        } else {
          this.markPassed();
        }
      } else if (alt && alt.length > 125) {
        this.addIssue("warning", "Alt text muy largo (> 125 caracteres)", img, {
          length: alt.length,
          alt: alt.substring(0, 50) + "...",
        });
      } else {
        this.markPassed();
      }
    });

    // Analizar SVGs
    svgs.forEach((svg) => {
      const title = svg.querySelector("title");
      const desc = svg.querySelector("desc");
      const ariaLabel = svg.getAttribute("aria-label");
      const ariaLabelledBy = svg.getAttribute("aria-labelledby");
      const role = svg.getAttribute("role");

      if (!title && !desc && !ariaLabel && !ariaLabelledBy) {
        this.addIssue("error", "SVG sin descripción accesible", svg, {
          tag: "svg",
        });
      } else {
        this.markPassed();
      }
    });

    // Analizar background images
    backgroundImages.forEach(({ element, url }) => {
      const ariaLabel = element.getAttribute("aria-label");
      const role = element.getAttribute("role");

      if (!ariaLabel && role !== "presentation" && role !== "none") {
        this.addIssue("warning", "Background image sin aria-label", element, {
          url: url.substring(0, 100),
        });
      }
    });

    return this.getSummary();
  }

  /**
   * Encuentra elementos con background-image
   * @private
   */
  _findBackgroundImages() {
    const elements = [];
    this._querySelectorAll("*").forEach((el) => {
      const style = this._getComputedStyle(el);
      const bgImage = style.backgroundImage;

      if (bgImage && bgImage !== "none") {
        const url = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];
        if (url) {
          elements.push({ element: el, url });
        }
      }
    });

    return elements;
  }
}

/**
 * Analizador de Contraste
 * Valida relación de contraste según WCAG
 */

class ContrastAnalyzer extends Analyzer {
  constructor() {
    super("Contraste", "Análisis de contraste WCAG");
  }

  async run() {
    this.reset();

    // Obtener todos los elementos con texto
    const textElements = this._querySelectorAll(
      "p, span, a, h1, h2, h3, h4, h5, h6, button, label, li, td, th, div",
    );

    let checkedCount = 0;

    textElements.forEach((element) => {
      // Saltar elementos sin texto visible
      if (!element.textContent.trim()) return;

      // Saltar elementos ocultos
      const style = this._getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return;

      const colors = this._getColorInfo(element);
      if (!colors) return;

      checkedCount++;

      const ratio = this._calculateContrastRatio(
        colors.foreground,
        colors.background,
      );
      const wcagAA = this._isWCAGAA(ratio, element);

      if (wcagAA.passed) {
        this.markPassed();
      } else {
        this.addIssue(
          "error",
          `Contraste insuficiente: ${ratio.toFixed(2)}:1 (se requieren ${wcagAA.required}:1)`,
          element,
          {
            ratio: ratio.toFixed(2),
            required: wcagAA.required,
            foreground: colors.foreground,
            background: colors.background,
            level: wcagAA.level,
          },
        );
      }
    });

    if (checkedCount === 0) {
      this.markPassed();
    }

    return this.getSummary();
  }

  /**
   * Obtiene información de colores de un elemento
   * @private
   */
  _getColorInfo(element) {
    const style = this._getComputedStyle(element);
    const color = style.color;
    let backgroundColor = style.backgroundColor;

    // Si el background es transparent, buscar en padres
    if (
      backgroundColor === "rgba(0, 0, 0, 0)" ||
      backgroundColor === "transparent"
    ) {
      let parent = element.parentElement;
      while (parent) {
        const parentStyle = this._getComputedStyle(parent);
        const parentBg = parentStyle.backgroundColor;
        if (parentBg !== "rgba(0, 0, 0, 0)" && parentBg !== "transparent") {
          backgroundColor = parentBg;
          break;
        }
        parent = parent.parentElement;
      }
    }

    if (!color || !backgroundColor) return null;

    return {
      foreground: this._rgbToHex(color),
      background: this._rgbToHex(backgroundColor),
    };
  }

  /**
   * Convierte RGB a Hex
   * @private
   */
  _rgbToHex(rgb) {
    if (rgb.startsWith("#")) return rgb;

    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return null;

    return (
      "#" +
      [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  /**
   * Calcula la relación de contraste WCAG
   * @private
   */
  _calculateContrastRatio(foreground, background) {
    if (!foreground || !background) return 1;

    const fgLum = this._getLuminance(foreground);
    const bgLum = this._getLuminance(background);

    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calcula la luminancia relativa de un color
   * @private
   */
  _getLuminance(hex) {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;

    const [rs, gs, bs] = [r, g, b].map((x) => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Verifica si cumple WCAG AA (4.5:1 normal, 3:1 large)
   * @private
   */
  _isWCAGAA(ratio, element) {
    const style = this._getComputedStyle(element);
    const fontSize = parseInt(style.fontSize);
    const fontWeight = style.fontWeight;

    // Large text: 18pt (24px) o 14pt (18.66px) bold
    const isLargeText =
      fontSize >= 24 ||
      (fontSize >= 18 &&
        (fontWeight === "bold" || parseInt(fontWeight) >= 700));

    const required = isLargeText ? 3 : 4.5;
    const passed = ratio >= required;

    return { passed, required, level: isLargeText ? "large" : "normal" };
  }
}

/**
 * Analizador de ARIA
 * Valida atributos ARIA, roles, propiedades, etc
 */

class AriaAnalyzer extends Analyzer {
  constructor() {
    super("ARIA", "Análisis de atributos ARIA");
  }

  async run() {
    this.reset();

    const ariaElements = this._querySelectorAll(
      "[role], [aria-label], [aria-labelledby], [aria-describedby], [aria-hidden], [aria-live]",
    );

    if (ariaElements.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    const validRoles = [
      "alert",
      "alertdialog",
      "application",
      "article",
      "banner",
      "button",
      "checkbox",
      "columnheader",
      "combobox",
      "complementary",
      "contentinfo",
      "definition",
      "dialog",
      "directory",
      "document",
      "feed",
      "figure",
      "form",
      "grid",
      "gridcell",
      "group",
      "heading",
      "img",
      "link",
      "list",
      "listbox",
      "listitem",
      "log",
      "main",
      "marquee",
      "math",
      "menu",
      "menubar",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "navigation",
      "none",
      "note",
      "option",
      "presentation",
      "progressbar",
      "radio",
      "radiogroup",
      "region",
      "row",
      "rowgroup",
      "rowheader",
      "scrollbar",
      "search",
      "searchbox",
      "separator",
      "slider",
      "spinbutton",
      "status",
      "switch",
      "tab",
      "table",
      "tablist",
      "tabpanel",
      "term",
      "textbox",
      "timer",
      "toolbar",
      "tooltip",
      "tree",
      "treegrid",
      "treeitem",
    ];

    ariaElements.forEach((element) => {
      const role = element.getAttribute("role");
      const ariaLabel = element.getAttribute("aria-label");
      const ariaLabelledBy = element.getAttribute("aria-labelledby");
      const ariaDescribedBy = element.getAttribute("aria-describedby");

      // Validar role
      if (role && !validRoles.includes(role)) {
        this.addIssue("error", `Rol ARIA inválido: "${role}"`, element, {
          invalidRole: role,
        });
      } else if (role) {
        this.markPassed();
      }

      // Validar aria-labelledby
      if (ariaLabelledBy) {
        const ids = ariaLabelledBy.split(" ");
        let allExist = true;
        ids.forEach((id) => {
          if (!document.getElementById(id)) {
            allExist = false;
          }
        });

        if (!allExist) {
          this.addIssue(
            "error",
            "aria-labelledby referencia IDs inexistentes",
            element,
            {
              aria_labelledby: ariaLabelledBy,
            },
          );
        } else {
          this.markPassed();
        }
      }

      // Validar aria-describedby
      if (ariaDescribedBy) {
        const ids = ariaDescribedBy.split(" ");
        let allExist = true;
        ids.forEach((id) => {
          if (!document.getElementById(id)) {
            allExist = false;
          }
        });

        if (!allExist) {
          this.addIssue(
            "error",
            "aria-describedby referencia IDs inexistentes",
            element,
            {
              aria_describedby: ariaDescribedBy,
            },
          );
        } else {
          this.markPassed();
        }
      }

      // Validar que elementos interactivos tengan accesibilidad
      const tagName = element.tagName.toLowerCase();
      const isInteractive = [
        "button",
        "a",
        "input",
        "select",
        "textarea",
      ].includes(tagName);

      if (
        isInteractive &&
        !ariaLabel &&
        !ariaLabelledBy &&
        !element.textContent.trim()
      ) {
        this.addIssue(
          "error",
          "Elemento interactivo sin etiqueta accesible",
          element,
          {
            tag: tagName,
          },
        );
      }
    });

    return this.getSummary();
  }
}

/**
 * Analizador de Formularios
 * Valida labels, inputs, validación accesible, etc
 */

class FormsAnalyzer extends Analyzer {
  constructor() {
    super("Formularios", "Análisis de formularios y accesibilidad");
  }

  async run() {
    this.reset();

    const inputs = this._querySelectorAll("input, select, textarea");
    const labels = this._querySelectorAll("label");

    if (inputs.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analizar inputs
    inputs.forEach((input) => {
      const id = input.getAttribute("id");
      const name = input.getAttribute("name");
      const type = input.getAttribute("type") || "text";
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      const required =
        input.getAttribute("required") || input.getAttribute("aria-required");
      const disabled = input.disabled;

      // Validar tipo
      const validTypes = [
        "text",
        "password",
        "email",
        "number",
        "tel",
        "url",
        "search",
        "date",
        "time",
        "datetime-local",
        "month",
        "week",
        "color",
        "range",
        "file",
        "submit",
        "reset",
        "button",
        "checkbox",
        "radio",
        "hidden",
      ];

      if (!validTypes.includes(type)) {
        this.addIssue(
          "warning",
          `Tipo de input no estándar: "${type}"`,
          input,
          { type },
        );
      }

      // Validar etiqueta
      let hasLabel = false;

      if (ariaLabel || ariaLabelledBy) {
        hasLabel = true;
      } else if (id) {
        const associatedLabel = document.querySelector(`label[for="${id}"]`);
        if (associatedLabel) {
          hasLabel = true;
        }
      }

      // Algunos tipos no requieren label
      if (
        !hasLabel &&
        type !== "hidden" &&
        type !== "submit" &&
        type !== "reset" &&
        type !== "button"
      ) {
        this.addIssue(
          "error",
          `Input sin label asociado (id: ${id || "sin id"})`,
          input,
          {
            type,
            id: id || null,
          },
        );
      } else {
        this.markPassed();
      }

      // Validar atributos requeridos
      if (required) {
        this.markPassed();
      }

      // Validar que input disabled tenga indicación visual
      if (disabled) {
        const style = this._getComputedStyle(input);
        if (style.opacity !== "1") {
          this.markPassed();
        }
      }
    });

    // Analizar labels
    labels.forEach((label) => {
      const forAttr = label.getAttribute("for");
      const text = label.textContent.trim();

      if (!forAttr) {
        this.addIssue("warning", 'Label sin atributo "for"', label, {
          text: text.substring(0, 50),
        });
      } else {
        const input = document.getElementById(forAttr);
        if (!input) {
          this.addIssue(
            "error",
            `Label con "for" que no existe: ${forAttr}`,
            label,
            {
              for: forAttr,
            },
          );
        } else {
          this.markPassed();
        }
      }

      if (!text) {
        this.addIssue("error", "Label vacío sin texto", label, {
          for: forAttr || null,
        });
      }
    });

    return this.getSummary();
  }
}

/**
 * Analizador de Semántica HTML
 * Valida el uso correcto de etiquetas semánticas
 */

class SemanticAnalyzer extends Analyzer {
  constructor() {
    super("Semántica", "Análisis de estructura semántica HTML");
  }

  async run() {
    this.reset();

    const semanticElements = [
      "header",
      "nav",
      "main",
      "article",
      "section",
      "aside",
      "footer",
    ];
    const divCount = this._querySelectorAll("div").length;
    const spanCount = this._querySelectorAll("span").length;

    let hasMainIssue = false;
    let hasNavIssue = false;
    let mainCount = 0;

    // Verificar main
    const mains = this._querySelectorAll("main");
    if (mains.length === 0 && divCount > 10) {
      this.addIssue("warning", "No se encontró etiqueta <main>", null, {
        divCount,
        severity: "medium",
      });
      hasMainIssue = true;
    } else if (mains.length > 1) {
      this.addIssue(
        "warning",
        `Se encontraron ${mains.length} elementos <main> (debe haber solo 1)`,
        null,
        {
          count: mains.length,
        },
      );
    } else {
      this.markPassed();
      mainCount++;
    }

    // Verificar nav
    const navs = this._querySelectorAll("nav");
    if (navs.length === 0 && this._querySelectorAll("ul, ol").length > 0) {
      this.addIssue(
        "warning",
        "Se encontraron listas pero no hay <nav>",
        null,
        {
          severity: "low",
        },
      );
      hasNavIssue = true;
    } else if (navs.length > 0) {
      this.markPassed();
    }

    // Verificar header
    const headers = this._querySelectorAll("header");
    if (headers.length === 0) {
      this.addIssue("warning", "No se encontró etiqueta <header>", null, {
        severity: "low",
      });
    } else {
      this.markPassed();
    }

    // Verificar footer
    const footers = this._querySelectorAll("footer");
    if (footers.length === 0) {
      this.addIssue("warning", "No se encontró etiqueta <footer>", null, {
        severity: "low",
      });
    } else {
      this.markPassed();
    }

    // Verificar sections
    const sections = this._querySelectorAll("section");
    sections.forEach((section) => {
      const heading = section.querySelector("h1, h2, h3, h4, h5, h6");
      if (!heading) {
        this.addIssue("warning", "<section> sin encabezado", section, {
          tag: "section",
        });
      } else {
        this.markPassed();
      }
    });

    // Verificar articles
    const articles = this._querySelectorAll("article");
    articles.forEach((article) => {
      const heading = article.querySelector("h1, h2, h3, h4, h5, h6");
      if (!heading) {
        this.addIssue("warning", "<article> sin encabezado", article, {
          tag: "article",
        });
      } else {
        this.markPassed();
      }
    });

    // Advertencia si hay muchos divs
    if (divCount > 50 && divCount > spanCount * 2) {
      this.addIssue(
        "info",
        `Muchos divs (${divCount}) - considera usar etiquetas semánticas`,
        null,
        {
          divCount,
          spanCount,
          severity: "suggestion",
        },
      );
    } else {
      this.markPassed();
    }

    return this.getSummary();
  }
}

/**
 * Analizador de Teclado/Navegación
 * Valida navegación por teclado, focus, tabindex, traps, etc
 */

class KeyboardAnalyzer extends Analyzer {
  constructor() {
    super("Teclado", "Análisis de navegación por teclado");
  }

  async run() {
    this.reset();

    const interactiveElements = this._querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="menuitem"], [onclick]',
    );

    if (interactiveElements.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analizar elementos interactivos
    interactiveElements.forEach((element) => {
      const tabindex = element.getAttribute("tabindex");
      const disabled = element.disabled;
      const role = element.getAttribute("role");
      const hasClick = element.hasAttribute("onclick");

      // Verificar tabindex negativo en elementos que deberían ser accesibles
      if (tabindex && parseInt(tabindex) < 0) {
        const isNaturallyFocusable = [
          "button",
          "a",
          "input",
          "select",
          "textarea",
        ].includes(element.tagName.toLowerCase());

        if (isNaturallyFocusable) {
          this.addIssue(
            "warning",
            "Elemento nativo con tabindex negativo",
            element,
            {
              tabindex,
              tag: element.tagName.toLowerCase(),
            },
          );
        }
      }

      // Verificar tabindex > 0 (evitar)
      if (tabindex && parseInt(tabindex) > 0) {
        this.addIssue(
          "warning",
          "tabindex > 0 (considerar reordenar DOM)",
          element,
          {
            tabindex,
          },
        );
      } else {
        this.markPassed();
      }

      // Verificar divs/spans con click handlers
      if (
        hasClick &&
        !["button", "a"].includes(element.tagName.toLowerCase())
      ) {
        if (!role || !["button", "link"].includes(role)) {
          this.addIssue(
            "error",
            'Elemento con onclick sin role="button"',
            element,
            {
              tag: element.tagName.toLowerCase(),
            },
          );
        }

        // Verificar que sea navegable por teclado
        if (tabindex === null || tabindex === undefined) {
          this.addIssue(
            "error",
            "Elemento con onclick no es navegable por teclado",
            element,
            {
              tag: element.tagName.toLowerCase(),
            },
          );
        }
      }

      // Verificar focus visible
      const style = this._getComputedStyle(element);
      const outline = style.outline || style.outlineWidth;
      const boxShadow = style.boxShadow;

      if (
        (outline === "none" || outline === "0px") &&
        !boxShadow?.includes("rgb")
      ) {
        this.addIssue("info", "Sin indicador visual de focus", element, {
          tag: element.tagName.toLowerCase(),
        });
      } else {
        this.markPassed();
      }
    });

    // Buscar modal traps (focus no puede escapar)
    const modals = this._querySelectorAll('[role="dialog"], dialog');
    modals.forEach((modal) => {
      const focusableElements = modal.querySelectorAll(
        "button, a, input, select, textarea, [tabindex]",
      );

      if (focusableElements.length === 0) {
        this.addIssue(
          "warning",
          "Modal/dialog sin elementos focusables",
          modal,
          {
            tag: modal.tagName.toLowerCase(),
          },
        );
      }
    });

    return this.getSummary();
  }
}

/**
 * Analizador de Links
 * Valida texto de enlace, destino real y avisos de nueva pestaña
 */

const GENERIC_LINK_TEXTS = [
  "click aquí",
  "clic aquí",
  "aquí",
  "click here",
  "here",
  "leer más",
  "read more",
  "more",
  "más información",
  "more information",
  "link",
  "enlace",
  "ver más",
  "más",
];

const NEW_TAB_WARNING_PATTERN =
  /nueva pesta|nueva ventana|new tab|new window|abre en|se abre en/i;

class LinksAnalyzer extends Analyzer {
  constructor() {
    super("Links", "Análisis de enlaces: texto, destino y nuevas pestañas");
  }

  async run() {
    this.reset();

    const links = this._querySelectorAll("a");

    if (links.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    links.forEach((link) => {
      const text = link.textContent.trim();
      const ariaLabel = link.getAttribute("aria-label");
      const hasImgAlt = !!link.querySelector("img[alt]:not([alt=''])");
      const accessibleName = ariaLabel || text;

      // Texto de enlace
      if (!accessibleName && !hasImgAlt) {
        this.addIssue("error", "Enlace sin texto ni etiqueta accesible", link, {});
      } else if (
        !ariaLabel &&
        GENERIC_LINK_TEXTS.includes(text.toLowerCase())
      ) {
        this.addIssue(
          "warning",
          `Texto de enlace genérico: "${text}" (no describe el destino)`,
          link,
          { text },
        );
      } else {
        this.markPassed();
      }

      // Destino real
      const href = link.getAttribute("href");
      if (href === null) {
        this.addIssue(
          "warning",
          "Elemento <a> sin atributo href (no es navegable ni focuseable)",
          link,
          {},
        );
      } else if (href === "" || href === "#" || /^javascript:void\(0?\)$/.test(href)) {
        this.addIssue(
          "warning",
          "Enlace sin destino real (href vacío, '#' o javascript:void(0))",
          link,
          { href },
        );
      } else {
        this.markPassed();
      }

      // Nueva pestaña sin aviso
      if (link.getAttribute("target") === "_blank") {
        const warnsUser = NEW_TAB_WARNING_PATTERN.test(
          `${ariaLabel || ""} ${text}`,
        );

        if (!warnsUser) {
          this.addIssue(
            "warning",
            "Se abre en una pestaña nueva sin avisarlo en el texto o aria-label",
            link,
            { target: "_blank" },
          );
        } else {
          this.markPassed();
        }

        const rel = link.getAttribute("rel") || "";
        if (!rel.includes("noopener")) {
          this.addIssue(
            "warning",
            'target="_blank" sin rel="noopener" (riesgo de seguridad y rendimiento)',
            link,
            { rel },
          );
        } else {
          this.markPassed();
        }
      }
    });

    return this.getSummary();
  }
}

/**
 * Motor principal de auditoría
 * Orquesta la ejecución de todos los analizadores y compila resultados
 */









class Auditor {
  constructor(ui) {
    this.ui = ui;
    this.analyzers = [
      new HeadingsAnalyzer(),
      new AxeCoreAnalyzer(),
      new ImagesAnalyzer(),
      new ContrastAnalyzer(),
      new AriaAnalyzer(),
      new FormsAnalyzer(),
      new SemanticAnalyzer(),
      new KeyboardAnalyzer(),
      new LinksAnalyzer(),
    ];
    this.results = {};
    this.isRunning = false;
  }

  /**
   * Ejecuta todos los analizadores
   */
  async runAll() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.results = {};

    this.ui?.open();

    // Ejecutar todos los analizadores
    const promises = this.analyzers.map((analyzer) =>
      this._runAnalyzer(analyzer),
    );

    await Promise.all(promises);

    this.isRunning = false;
    return this.getResults();
  }

  /**
   * Ejecuta un analizador específico
   */
  async runAnalyzer(analyzerName) {
    const analyzer = this.analyzers.find((a) => a.name === analyzerName);

    if (!analyzer) {
      console.error("Analizador no encontrado: %s", analyzerName);
      return null;
    }

    this.ui?.open();
    await this._runAnalyzer(analyzer);

    return this.getResults(analyzerName);
  }

  /**
   * Ejecuta un analizador y maneja errores
   * @private
   */
  async _runAnalyzer(analyzer) {
    try {
      const summary = await analyzer.run();
      this.results[analyzer.name] = summary;

      if (this.ui) {
        this.ui.addResults(analyzer.name, summary);
      }
    } catch (error) {
      console.error("Error ejecutando %s:", analyzer.name, error);
      this.results[analyzer.name] = {
        name: analyzer.name,
        description: analyzer.description,
        error: error.message,
        passed: 0,
        failed: 1,
        issues: [
          {
            severity: "error",
            message: `Error durante auditoría: ${error.message}`,
          },
        ],
      };
    }
  }

  /**
   * Obtiene los resultados compilados
   */
  getResults(analyzerName = null) {
    if (analyzerName) {
      return this.results[analyzerName] || null;
    }

    return {
      metadata: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        userAgent: navigator.userAgent.substring(0, 100),
      },
      summary: this._generateSummary(),
      results: this.results,
    };
  }

  /**
   * Genera un resumen de todos los resultados
   * @private
   */
  _generateSummary() {
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;
    let totalIssues = 0;

    Object.values(this.results).forEach((result) => {
      if (result) {
        totalPassed += result.passed || 0;
        totalFailed += result.failed || 0;
        totalWarnings += result.warnings || 0;
        totalIssues += result.issues?.length || 0;
      }
    });

    return {
      totalPassed,
      totalFailed,
      totalWarnings,
      totalIssues,
      analyzersRun: Object.keys(this.results).length,
      timestamp: new Date().toISOString(),
      severity: this._calculateSeverity(totalFailed, totalWarnings),
    };
  }

  /**
   * Calcula la severidad general
   * @private
   */
  _calculateSeverity(errors, warnings) {
    if (errors > 0) return "critical";
    if (warnings > 5) return "high";
    if (warnings > 0) return "medium";
    return "low";
  }

  /**
   * Obtiene el nombre de todos los analizadores
   */
  getAnalyzerNames() {
    return this.analyzers.map((a) => a.name);
  }

  /**
   * Limpia todos los resultados
   */
  reset() {
    this.results = {};
    this.analyzers.forEach((a) => a.reset());
  }
}

/**
 * Utilidades para manejo de JSON y portapapeles
 */
class JsonUtils {
  /**
   * Serializa resultados a JSON
   */
  static stringify(results, pretty = true) {
    try {
      return JSON.stringify(results, null, pretty ? 2 : 0);
    } catch (error) {
      console.error("Error serializando JSON:", error);
      return JSON.stringify({ error: error.message });
    }
  }

  /**
   * Copia JSON al portapapeles
   */
  static async copyToClipboard(results) {
    try {
      const json = this.stringify(results, true);
      await navigator.clipboard.writeText(json);

      console.log(
        "%c✓ Auditoría copiada al portapapeles",
        "color: #16a34a; font-weight: bold; font-size: 14px;",
      );

      return true;
    } catch (error) {
      console.error("Error copiando al portapapeles:", error);

      // Fallback si clipboard API no funciona
      try {
        const textArea = document.createElement("textarea");
        textArea.value = this.stringify(results, true);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);

        console.log("✓ Auditoría copiada al portapapeles (método alternativo)");
        return true;
      } catch (fallbackError) {
        console.error("Error con método alternativo:", fallbackError);
        return false;
      }
    }
  }

  /**
   * Loguea resultados en consola de forma legible
   */
  static logResults(results) {
    console.group(
      "%c♿ AUDITORÍA DE ACCESIBILIDAD",
      "color: #2563eb; font-weight: bold; font-size: 16px;",
    );

    // Metadata
    console.group("%cℹ️ Información", "color: #3b82f6; font-weight: bold;");
    console.log("URL:", results.metadata?.url);
    console.log("Timestamp:", results.metadata?.timestamp);
    console.log("Viewport:", results.metadata?.viewport);
    console.groupEnd();

    // Summary
    console.group("%c📊 Resumen", "color: #8b5cf6; font-weight: bold;");
    const summary = results.summary;
    console.log("✓ Aprobados: %s", summary.totalPassed);
    console.log(
      "✗ Errores: %c%s",
      summary.totalFailed > 0 ? "color: #dc2626; font-weight: bold;" : "",
      summary.totalFailed,
    );
    console.log(
      "⚠️  Advertencias: %c%s",
      summary.totalWarnings > 0 ? "color: #f59e0b; font-weight: bold;" : "",
      summary.totalWarnings,
    );
    console.log("Total de issues: %s", summary.totalIssues);
    console.log("Severidad: %c%s", "font-weight: bold;", summary.severity);
    console.groupEnd();

    // Resultados por analizador
    console.group(
      "%c📋 Resultados por Analizador",
      "color: #06b6d4; font-weight: bold;",
    );
    Object.entries(results.results).forEach(([name, result]) => {
      if (result) {
        const hasIssues = result.issues && result.issues.length > 0;
        console.group(
          "%c%s %s (%s/%s/%s)",
          hasIssues ? "color: #f59e0b;" : "color: #16a34a;",
          hasIssues ? "⚠️" : "✓",
          name,
          result.passed,
          result.failed,
          result.warnings,
        );

        if (result.issues && result.issues.length > 0) {
          result.issues.forEach((issue) => {
            const icon =
              issue.severity === "error"
                ? "❌"
                : issue.severity === "warning"
                  ? "⚠️"
                  : "ℹ️";
            console.log("%s %s", icon, issue.message);
            if (issue.selector) {
              console.log("  → %s", issue.selector);
            }
          });
        } else {
          console.log("Sin problemas detectados");
        }

        console.groupEnd();
      }
    });
    console.groupEnd();

    console.groupEnd();
  }

  /**
   * Exporta resultados a CSV
   */
  static exportToCsv(results) {
    const rows = [];
    rows.push(["Analizador", "Severidad", "Mensaje", "Selector", "Metadata"]);

    Object.entries(results.results).forEach(([analyzerName, result]) => {
      if (result.issues) {
        result.issues.forEach((issue) => {
          rows.push([
            analyzerName,
            issue.severity,
            issue.message,
            issue.selector || "",
            JSON.stringify(issue.metadata || {}),
          ]);
        });
      }
    });

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    return csv;
  }

  /**
   * Descarga resultados como archivo JSON
   */
  static downloadJson(results, filename = "a11y-audit.json") {
    const json = this.stringify(results, true);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Descarga resultados como archivo CSV
   */
  static downloadCsv(results, filename = "a11y-audit.csv") {
    const csv = this.exportToCsv(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

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
})();
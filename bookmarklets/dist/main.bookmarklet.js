(function () {
"use strict";
const A11Y_AUDITOR_VERSION = "1.0.0";

/**
 * Base class for all accessibility analyzers
 * Provides shared structure and standard methods
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
   * Runs the analysis
   * Must be overridden by subclasses
   */
  async run() {
    throw new Error(
      `run() method must be implemented by ${this.constructor.name}`,
    );
  }

  /**
   * Validates that the results have the correct structure
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
   * Formats an issue for the results
   * @param {string} severity - 'error', 'warning', 'info'
   * @param {string} message - Description of the problem
   * @param {HTMLElement} element - Problematic element (optional)
   * @param {object} metadata - Additional information
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

    // Count by severity
    if (severity === "error") {
      this.results.failed++;
    } else if (severity === "warning") {
      this.results.warnings++;
    }
  }

  /**
   * Generates a unique CSS selector for an element
   * @private
   */
  _generateSelector(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;

    let path = [];
    let current = element;

    while (current && current.tagName && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${CSS.escape(current.id)}`;
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
   * Resets the results
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
   * Gets a summary of the results
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
   * Marks a check as passed
   */
  markPassed() {
    this.results.passed++;
  }

  /**
   * Gets elements of a given type with a filter applied.
   * Excludes the auditor's own panel: otherwise every analyzer would end up
   * auditing its own UI instead of (only) the user's page.
   * @protected
   */
  _querySelectorAll(selector) {
    return Array.from(document.querySelectorAll(selector)).filter(
      (element) => !element.closest("#a11y-audit-sidebar"),
    );
  }

  /**
   * Gets an element's computed styles
   * @protected
   */
  _getComputedStyle(element) {
    return window.getComputedStyle(element);
  }

  /**
   * An element hidden via CSS (display:none or visibility:hidden) isn't
   * perceivable by anyone right now, so it shouldn't count for checks that
   * depend on what the page actually shows.
   * @protected
   */
  _isVisible(element) {
    const style = this._getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }
}

/**
 * UI module for the audit sidebar panel
 * Handles displaying results and user interaction
 */
class AuditUI {
  constructor() {
    this.isOpen = false;
    this.container = null;
    this.highlightedElements = new Set();
    this.floatingTag = null;
    this.results = {};
    this.activeTab = null;
    this._onResize = () => {
      if (this.isOpen) this._shiftPage();
    };
  }

  /**
   * Initializes and opens the sidebar panel
   */
  open() {
    if (this.isOpen) return;

    this._injectStyles();
    this._createPanel();
    this.isOpen = true;
    this.container?.classList.add("a11y-audit-open");
    this._shiftPage();
    window.addEventListener("resize", this._onResize);
  }

  /**
   * Closes the sidebar panel
   */
  close() {
    if (!this.isOpen) return;
    this._clearHighlights();
    this.container?.classList.remove("a11y-audit-open");
    this.isOpen = false;
    this._unshiftPage();
    window.removeEventListener("resize", this._onResize);
  }

  /**
   * Shifts the page content (same as WAVE) so it doesn't end up underneath
   * the panel: instead of overlapping, it pushes the <html> element with a
   * margin the same size as the panel. Under the mobile layout (panel at
   * the bottom, full width) it pushes up instead of to the right.
   * @private
   */
  _shiftPage() {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const isBottomLayout = window.matchMedia("(max-width: 768px)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const html = document.documentElement;

    html.style.transition = reduceMotion ? "none" : "margin 0.2s ease";
    if (isBottomLayout) {
      html.style.marginRight = "";
      html.style.marginBottom = `${rect.height}px`;
    } else {
      html.style.marginBottom = "";
      html.style.marginRight = `${rect.width}px`;
    }
  }

  /**
   * Undoes the shift applied by _shiftPage()
   * @private
   */
  _unshiftPage() {
    const html = document.documentElement;
    html.style.marginRight = "";
    html.style.marginBottom = "";
    html.style.transition = "";
  }

  /**
   * Toggles the panel open/closed
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Adds an analyzer's results to the panel
   * @param {string} analyzerName - Analyzer name
   * @param {object} results - Analysis results
   */
  addResults(analyzerName, results) {
    this.results[analyzerName] = results;
    this._updateUI();
  }

  /**
   * Injects the required CSS styles
   * @private
   */
  _injectStyles() {
    // The tag's content is always overwritten instead of skipping injection
    // when it already exists: if the page was left over from a previous run
    // of the bookmarklet (old code) without a reload, the CSS would stay
    // stale while the HTML does get rebuilt with the new structure,
    // producing a mismatch (unsized icons, old colors).
    let style = document.getElementById("a11y-audit-styles");
    if (!style) {
      style = document.createElement("style");
      style.id = "a11y-audit-styles";
      document.head.appendChild(style);
    }
    style.textContent = `
      /* Main panel */
      .a11y-audit-sidebar {
        display: none;
        position: fixed;
        right: 0;
        top: 0;
        width: 400px;
        height: 100vh;
        background: #ffffff;
        border-left: 3px solid #1a1a1a;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        flex-direction: column;
        overflow: hidden;
      }

      .a11y-audit-sidebar .icon {
        width: 1em;
        height: 1em;
        flex: none;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
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
        border-bottom: 1px solid #e1dedd;
        background: #1a1a1a;
        color: #f0f0f0;
      }

      .a11y-audit-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .a11y-audit-mark {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: #f0f0f0;
        color: #1a1a1a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .a11y-audit-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        color: #f0f0f0;
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

      .a11y-audit-close .icon {
        width: 16px;
        height: 16px;
      }

      .a11y-audit-close:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      /* Summary */
      .a11y-audit-summary {
        padding: 12px 16px;
        background: #f0f0f0;
        border-bottom: 1px solid #e1dedd;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        font-size: 14px;
      }

      .a11y-audit-stat {
        text-align: center;
      }

      .a11y-audit-stat-value {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
      }

      .a11y-audit-stat-label {
        color: #6b6866;
        font-size: 14px;
        margin-top: 2px;
      }

      .a11y-audit-stat.errors .a11y-audit-stat-value {
        color: #a6331f;
      }

      .a11y-audit-stat.warnings .a11y-audit-stat-value {
        color: #7a5206;
      }

      .a11y-audit-stat.passed .a11y-audit-stat-value {
        color: #2e6b4c;
      }

      /* Tabs */
      .a11y-audit-tabs {
        display: flex;
        border-bottom: 1px solid #e1dedd;
        overflow-x: auto;
        background: #f0f0f0;
      }

      .a11y-audit-tab {
        padding: 12px 14px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 16px;
        color: #6b6866;
        white-space: nowrap;
        transition: all 0.2s;
        border-bottom: 2px solid transparent;
      }

      .a11y-audit-tab:hover {
        color: #1a1a1a;
      }

      .a11y-audit-tab.active {
        color: #1a1a1a;
        border-bottom-color: #1a1a1a;
        font-weight: 600;
      }

      /* Content */
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
        background: #f0f0f0;
        border-radius: 4px;
        font-size: 16px;
      }

      .a11y-audit-issue.error {
        border-color: #a6331f;
        background: #f5e1de;
      }

      .a11y-audit-issue.warning {
        border-color: #7a5206;
        background: #f2e9d8;
      }

      .a11y-audit-issue.info {
        border-color: #1a1a1a;
        background: #e6e6e6;
      }

      .a11y-audit-issue-message {
        font-weight: 500;
        color: #1a1a1a;
        margin-bottom: 4px;
      }

      .a11y-audit-issue-wcag {
        display: inline-block;
        font-size: 14px;
        font-weight: 600;
        color: #6b6866;
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 999px;
        padding: 1px 8px;
        margin-bottom: 4px;
      }

      .a11y-audit-issue-selector {
        color: #6b6866;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        word-break: break-all;
        margin-top: 4px;
      }

      .a11y-audit-issue-metadata {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        color: #6b6866;
        font-size: 14px;
      }

      .a11y-audit-issue[role="button"] {
        cursor: pointer;
      }

      .a11y-audit-issue[role="button"]:hover {
        filter: brightness(0.97);
      }

      .a11y-audit-issue[role="button"]:focus-visible {
        outline: 2px solid #1a1a1a;
        outline-offset: 2px;
      }

      .a11y-audit-issue-hint {
        margin-top: 6px;
        font-size: 14px;
        font-weight: 600;
        color: #1a1a1a;
      }

      /* "Just clicked" highlight on the audited page, to tell it apart
         from other elements already highlighted before */
      .a11y-audit-highlight-pulse {
        animation: a11yAuditPulse 1.6s ease-out;
      }

      @keyframes a11yAuditPulse {
        0%,
        100% {
          outline-color: #a6331f;
          outline-width: 2px;
        }
        50% {
          outline-color: #7a5206;
          outline-width: 4px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .a11y-audit-highlight-pulse {
          animation: none;
          outline-width: 4px !important;
          outline-color: #7a5206 !important;
        }
      }

      /* Floating tag over the highlighted element on the page */
      .a11y-audit-floating-tag {
        position: fixed;
        z-index: 1000000;
        max-width: 300px;
        padding: 6px 12px;
        border-radius: 999px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        animation: a11yAuditFadeIn 0.15s ease-out;
      }

      .a11y-audit-floating-tag.error {
        background: #a6331f;
      }

      .a11y-audit-floating-tag.warning {
        background: #7a5206;
      }

      .a11y-audit-floating-tag.info {
        background: #1a1a1a;
      }

      @keyframes a11yAuditFadeIn {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .a11y-audit-floating-tag {
          animation: none;
        }
      }

      /* Empty State */
      .a11y-audit-empty {
        padding: 24px 16px;
        text-align: center;
        color: #797676;
      }

      .a11y-audit-loading {
        padding: 24px 16px;
        text-align: center;
        color: #6b6866;
      }

      /* Footer */
      .a11y-audit-footer {
        padding: 12px 16px;
        border-top: 1px solid #e1dedd;
        background: #f0f0f0;
        display: flex;
        gap: 8px;
        font-size: 16px;
      }

      .a11y-audit-button {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        border: 1px solid #c7c3c2;
        background: #ffffff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .a11y-audit-button:hover {
        background: #f0f0f0;
        border-color: #1a1a1a;
      }

      .a11y-audit-button.primary {
        background: #1a1a1a;
        color: #f0f0f0;
        border-color: #1a1a1a;
      }

      .a11y-audit-button.primary:hover {
        background: #333333;
        border-color: #333333;
      }

      /* Update notice */
      .a11y-audit-update-notice {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: #f0f0f0;
        border-bottom: 1px solid #e1dedd;
        font-size: 14px;
        color: #1a1a1a;
      }

      .a11y-audit-update-notice span {
        flex: 1;
      }

      .a11y-audit-update-notice a {
        color: #1a1a1a;
        font-weight: 600;
        white-space: nowrap;
      }

      .a11y-audit-update-dismiss {
        flex: none;
        width: 24px;
        height: 24px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: none;
        color: #6b6866;
        cursor: pointer;
        border-radius: 4px;
      }

      .a11y-audit-update-dismiss:hover {
        background: #e1dedd;
        color: #1a1a1a;
      }

      .a11y-audit-update-dismiss .icon {
        width: 14px;
        height: 14px;
      }

      /* Element highlight */
      .a11y-audit-highlight {
        outline: 2px solid #a6331f !important;
        outline-offset: 2px !important;
        background-color: rgba(166, 51, 31, 0.1) !important;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .a11y-audit-sidebar {
          width: 100%;
          border-left: none;
          border-bottom: 3px solid #1a1a1a;
          height: 50vh;
        }

        .a11y-audit-summary {
          grid-template-columns: 1fr 1fr 1fr;
        }
      }
    `;
  }

  /**
   * Builds the sidebar panel's structure
   * @private
   */
  _createPanel() {
    if (this.container) return;

    // If the bookmarklet already ran before in this same tab (without a
    // reload), an old panel may still be sitting in the DOM that this new
    // AuditUI instance doesn't know about: remove it to avoid duplicate IDs.
    document.getElementById("a11y-audit-sidebar")?.remove();

    this.container = document.createElement("div");
    this.container.id = "a11y-audit-sidebar";
    this.container.className = "a11y-audit-sidebar";

    this.container.innerHTML = `
      <div class="a11y-audit-header">
        <h2 class="a11y-audit-title">
          <span class="a11y-audit-mark" aria-hidden="true">A11Y</span>
          Auditoría de Accesibilidad
        </h2>
        <button class="a11y-audit-close" aria-label="Cerrar panel">
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </div>

      <div class="a11y-audit-update-notice" id="a11y-update-notice" hidden>
        <span data-update-message></span>
        <a href="https://github.com/CrisRuedaP/a11y-auditor" target="_blank" rel="noopener">Ver más</a>
        <button class="a11y-audit-update-dismiss" aria-label="Cerrar aviso de actualización">
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
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
        <button class="a11y-audit-button primary" id="a11y-copy-json">
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <rect x="9" y="9" width="10" height="10" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          Copiar JSON
        </button>
        <button class="a11y-audit-button" id="a11y-clear-highlights">
          <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
            <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          Limpiar
        </button>
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
    this.container
      .querySelector("#a11y-update-notice .a11y-audit-update-dismiss")
      .addEventListener("click", () => {
        this.container.querySelector("#a11y-update-notice").hidden = true;
      });
  }

  /**
   * Shows the "a newer version is available" notice. Called by
   * checkForUpdates() only when a real update was found — never shown by
   * default, and dismissing it just hides it for this session (nothing is
   * persisted).
   */
  showUpdateNotice(remoteVersion) {
    const notice = this.container?.querySelector("#a11y-update-notice");
    if (!notice) return;

    notice.querySelector("[data-update-message]").textContent =
      `Hay una nueva versión disponible (${remoteVersion}).`;
    notice.hidden = false;
  }

  /**
   * Refreshes the UI with the results
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

    // Each analyzer finishes at a different time (axe-core in particular
    // can take a while on large pages), and each one triggers a full
    // re-render. If we didn't remember which tab the user picked, every
    // re-render would reset it back to the first available tab.
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
          pane.appendChild(this._buildIssueElement(issue));
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
   * Switches to a specific tab
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
   * Builds an issue row. If it has a selector, it's clickable (mouse and
   * keyboard) to highlight and scroll to the real element.
   * @private
   */
  _buildIssueElement(issue) {
    const issueEl = document.createElement("div");
    issueEl.className = `a11y-audit-issue ${issue.severity}`;

    const messageEl = document.createElement("div");
    messageEl.className = "a11y-audit-issue-message";
    messageEl.textContent = issue.message;
    issueEl.appendChild(messageEl);

    if (issue.metadata?.wcag) {
      const wcagEl = document.createElement("span");
      wcagEl.className = "a11y-audit-issue-wcag";
      wcagEl.textContent = this._describeWcag(issue.metadata.wcag);
      issueEl.appendChild(wcagEl);
    }

    if (issue.elementInfo) {
      const metaEl = document.createElement("div");
      metaEl.className = "a11y-audit-issue-metadata";
      metaEl.textContent = this._describeElement(issue.elementInfo);
      issueEl.appendChild(metaEl);
    }

    if (issue.selector) {
      const selectorEl = document.createElement("div");
      selectorEl.className = "a11y-audit-issue-selector";
      selectorEl.textContent = issue.selector;
      issueEl.appendChild(selectorEl);

      const hintEl = document.createElement("div");
      hintEl.className = "a11y-audit-issue-hint";
      hintEl.textContent = "👁 Ver en la página";
      issueEl.appendChild(hintEl);

      issueEl.setAttribute("role", "button");
      issueEl.setAttribute("tabindex", "0");
      issueEl.setAttribute("aria-label", `${issue.message}. Ver elemento en la página`);

      const jump = () => this._jumpToIssue(issue, issueEl, hintEl);
      issueEl.addEventListener("click", jump);
      issueEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          jump();
        }
      });
    }

    return issueEl;
  }

  /**
   * "1.4.3 · Nivel AA" (or "Buena práctica" / best practice) when no strict
   * WCAG criterion applies.
   * @private
   */
  _describeWcag(wcag) {
    if (!wcag.criterion) return "Buena práctica";
    return `WCAG ${wcag.criterion} · Nivel ${wcag.level}`;
  }

  /**
   * Builds a readable description of the element (better than just the tag)
   * @private
   */
  _describeElement(info) {
    let label = `<${info.tag}>`;
    if (info.id) label += `#${info.id}`;
    if (info.text) {
      const text = info.text.length > 40 ? `${info.text.slice(0, 40)}…` : info.text;
      label += ` — "${text}"`;
    }
    return label;
  }

  /**
   * Finds the real element by its selector, scrolls to it and highlights it.
   * @private
   */
  _jumpToIssue(issue, issueEl, hintEl) {
    let element = null;
    try {
      element = document.querySelector(issue.selector);
    } catch {
      element = null;
    }

    if (!element) {
      this._flashHint(hintEl, "No se encontró (¿cambió la página?)");
      return;
    }

    // Only one highlighted element at a time: if we let previous clicks
    // pile up, after a while it's impossible to tell which finding is which.
    this._clearHighlights();
    this.highlightElement(element);
    element.classList.add("a11y-audit-highlight-pulse");
    setTimeout(() => element.classList.remove("a11y-audit-highlight-pulse"), 1600);
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // The smooth scroll takes a moment; only once it's done do we know
    // where the element will land on screen to place the tag.
    setTimeout(() => this._showFloatingTag(element, issue), 350);
  }

  /**
   * Floating tag over the highlighted element, with the finding's real
   * message — the same visual language used on the install page.
   * @private
   */
  _showFloatingTag(element, issue) {
    this._removeFloatingTag();

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // no longer on screen

    const tag = document.createElement("div");
    tag.className = `a11y-audit-floating-tag ${issue.severity}`;
    tag.textContent = issue.message;
    tag.style.top = `${Math.max(8, rect.top - 34)}px`;
    tag.style.left = `${Math.min(
      Math.max(8, rect.left),
      window.innerWidth - 320,
    )}px`;

    document.body.appendChild(tag);
    this.floatingTag = tag;
  }

  /**
   * @private
   */
  _removeFloatingTag() {
    this.floatingTag?.remove();
    this.floatingTag = null;
  }

  /**
   * Temporarily swaps a hint's text and restores it afterwards
   * @private
   */
  _flashHint(hintEl, text) {
    if (!hintEl) return;
    const original = hintEl.textContent;
    hintEl.textContent = text;
    setTimeout(() => {
      hintEl.textContent = original;
    }, 2000);
  }

  /**
   * Highlights an element on the page
   * @private
   */
  highlightElement(element) {
    if (!element) return;
    element.classList.add("a11y-audit-highlight");
    this.highlightedElements.add(element);
  }

  /**
   * Clears all highlights
   * @private
   */
  _clearHighlights() {
    this._removeFloatingTag();
    this.highlightedElements.forEach((el) => {
      el.classList.remove("a11y-audit-highlight");
    });
    this.highlightedElements.clear();
  }

  /**
   * Copies the results to the clipboard as JSON
   * @private
   */
  _copyResultsToClipboard() {
    // If an Auditor is connected, use the full JSON (metadata + summary +
    // results) — the same format the results viewer expects. Without an
    // Auditor, fall back to the internal map like before.
    const payload =
      typeof this.getFullResults === "function"
        ? this.getFullResults()
        : this.results;
    const json = JSON.stringify(payload, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      // Visual feedback
      const button = this.container?.querySelector("#a11y-copy-json");
      const originalText = button?.textContent;
      button.textContent = "✓ Copiado!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);

      // Also log to the console
      console.log("📋 Resultados de auditoría copiados al portapapeles");
      console.log(JSON.parse(json));
    });
  }

  /**
   * Escapes HTML characters
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroys the panel and cleans up
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
 * Shared constants for tagging each finding with its WCAG criterion
 * (2.1/2.2) and conformance level, or "buena práctica" (best practice) when
 * the check is a reasonable convention but WCAG doesn't strictly require it.
 *
 * Imported by every analyzer — lives in a single place so build.js can
 * concatenate it without name clashes across files.
 */
const BEST_PRACTICE = { criterion: null, level: "buena práctica" };

const WCAG = {
  NON_TEXT_CONTENT: { criterion: "1.1.1", level: "A" },
  INFO_RELATIONSHIPS: { criterion: "1.3.1", level: "A" },
  CONTRAST_MINIMUM: { criterion: "1.4.3", level: "AA" },
  KEYBOARD: { criterion: "2.1.1", level: "A" },
  BYPASS_BLOCKS: { criterion: "2.4.1", level: "A" },
  FOCUS_ORDER: { criterion: "2.4.3", level: "A" },
  LINK_PURPOSE: { criterion: "2.4.4", level: "A" },
  CHANGE_ON_REQUEST: { criterion: "3.2.5", level: "AAA" },
  LABELS_INSTRUCTIONS: { criterion: "3.3.2", level: "A" },
  NAME_ROLE_VALUE: { criterion: "4.1.2", level: "A" },
};

/**
 * Optional, non-blocking check for a newer bookmarklet version. Fetches a
 * small static JSON file hosted alongside the project and compares it
 * against the version baked into this bundle at build time. Never sends
 * anything about the audited page or the audit results — just a plain GET
 * for a static file. Fails silently on any error (offline, blocked,
 * hosting down, unreachable, etc): it must never interrupt the audit
 * itself.
 */
const VERSION_CHECK_URL =
  "https://raw.githubusercontent.com/CrisRuedaP/a11y-auditor/main/bookmarklets/page/version.json";
const VERSION_CHECK_TIMEOUT_MS = 4000;

function isNewerVersion(remote, current) {
  const r = String(remote).split(".").map(Number);
  const c = String(current).split(".").map(Number);

  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rv = r[i] || 0;
    const cv = c[i] || 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }

  return false;
}

async function checkForUpdates(ui) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS);

    const response = await fetch(VERSION_CHECK_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return;

    const data = await response.json();
    if (data?.version && isNewerVersion(data.version, A11Y_AUDITOR_VERSION)) {
      ui?.showUpdateNotice(data.version);
    }
  } catch {
    // Silent on purpose: no network, blocked by CSP, hosting down, aborted
    // by the timeout, malformed JSON, etc.
  }
}

/**
 * Headings analyzer (h1-h6)
 * Validates hierarchy, detects level jumps, duplicate h1s, etc
 */


class HeadingsAnalyzer extends Analyzer {
  constructor() {
    super("Headings", "Análisis de encabezados y jerarquía");
  }

  async run() {
    this.reset();
    const headings = this._querySelectorAll("h1, h2, h3, h4, h5, h6").filter(
      (heading) => this._isVisible(heading),
    );

    if (headings.length === 0) {
      this.addIssue(
        "warning",
        "No se encontraron encabezados en la página",
        null,
        { severity: "critical", wcag: WCAG.INFO_RELATIONSHIPS },
      );
      return this.getSummary();
    }

    const headingLevels = headings.map((h) => ({
      element: h,
      level: parseInt(h.tagName[1]),
      text: h.textContent.trim().substring(0, 60),
    }));

    // Check for a single H1
    const h1Count = headingLevels.filter((h) => h.level === 1).length;
    if (h1Count === 0) {
      this.addIssue("error", "No hay H1 en la página", null, {
        severity: "critical",
        wcag: BEST_PRACTICE,
      });
    } else if (h1Count > 1) {
      this.addIssue(
        "warning",
        `Se encontraron ${h1Count} H1 (debe haber solo 1)`,
        null,
        { count: h1Count, wcag: BEST_PRACTICE },
      );
    } else {
      this.markPassed();
    }

    // Check for level jumps
    let lastLevel = 0;
    for (let i = 0; i < headingLevels.length; i++) {
      const { element, level, text } = headingLevels[i];
      const diff = level - lastLevel;

      if (i === 0 && level !== 1) {
        this.addIssue(
          "warning",
          `El primer encabezado es H${level}, debería ser H1`,
          element,
          { level, expectedLevel: 1, wcag: BEST_PRACTICE },
        );
      } else if (diff > 1 && lastLevel !== 0) {
        this.addIssue(
          "warning",
          `Salto de jerarquía: de H${lastLevel} a H${level}`,
          element,
          { from: lastLevel, to: level, wcag: WCAG.INFO_RELATIONSHIPS },
        );
      } else {
        this.markPassed();
      }

      lastLevel = level;
    }

    // Check for empty headings
    headingLevels.forEach(({ element, level, text }) => {
      if (!text) {
        this.addIssue("error", `H${level} vacío sin texto`, element, {
          level,
          wcag: WCAG.INFO_RELATIONSHIPS,
        });
      }
    });

    return this.getSummary();
  }
}

/**
 * Axe-Core analyzer
 * Runs the axe-core library to detect accessibility issues
 */


class AxeCoreAnalyzer extends Analyzer {
  constructor() {
    super("Axe-Core", "Análisis automático con axe-core");
  }

  async run() {
    this.reset();

    // Inject axe-core if it isn't loaded yet
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
      // Exclude the auditor's own panel: otherwise axe-core also analyzes
      // the sidebar we just injected and contaminates the results.
      const context = document.getElementById("a11y-audit-sidebar")
        ? { exclude: [["#a11y-audit-sidebar"]] }
        : document;

      const results = await new Promise((resolve) => {
        window.axe.run(context, (err, results) => {
          resolve(results || { violations: [], passes: [], inapplicable: [] });
        });
      });

      // Process violations
      results.violations?.forEach((violation) => {
        const wcag = this._parseWcagTags(violation.tags);
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
              wcag: wcag || BEST_PRACTICE,
            },
          );
        });
      });

      // Count passes
      results.passes?.forEach((pass) => {
        pass.nodes?.forEach(() => {
          this.markPassed();
        });
      });

      // Add metadata
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
   * axe-core already ships its own WCAG tags on every rule (e.g.
   * ["wcag2aa", "wcag143", ...] for contrast) — we read those instead of
   * guessing a criterion ourselves.
   * @private
   */
  _parseWcagTags(tags) {
    if (!Array.isArray(tags)) return null;

    const scTag = tags.find((tag) => /^wcag\d{3,5}$/.test(tag));
    const levelTag = tags.find((tag) => /^wcag(2|21|22)?(aaa|aa|a)$/.test(tag));

    if (!scTag && !levelTag) return null;

    let criterion = null;
    if (scTag) {
      const digits = scTag.replace("wcag", "");
      criterion = `${digits[0]}.${digits[1]}.${digits.slice(2)}`;
    }

    const levelMatch = levelTag?.match(/(aaa|aa|a)$/);
    const level = levelMatch ? levelMatch[1].toUpperCase() : null;

    return { criterion, level };
  }

  /**
   * axe-core sometimes returns composite selectors (arrays, for elements
   * inside iframes/shadow DOM) or selectors that document.querySelector
   * can't resolve. This should never take down the rest of the analysis.
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
   * Loads axe-core from a CDN
   * @private
   */
  _loadAxeCore() {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js";
      script.onload = () => resolve();
      script.onerror = () => resolve(); // Resolve even if it fails
      document.head.appendChild(script);
    });
  }
}

/**
 * Images analyzer
 * Validates alt text, detects decorative images, etc
 */


class ImagesAnalyzer extends Analyzer {
  constructor() {
    super("Imágenes", "Análisis de imágenes y alt text");
  }

  async run() {
    this.reset();

    // Find all images
    const images = this._querySelectorAll("img").filter((img) => this._isVisible(img));
    const svgs = this._querySelectorAll("svg").filter((svg) => this._isVisible(svg));
    const backgroundImages = this._findBackgroundImages();

    const totalImages = images.length + svgs.length + backgroundImages.length;

    if (totalImages === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analyze IMG tags
    images.forEach((img) => {
      const alt = img.getAttribute("alt");
      const ariaLabel = img.getAttribute("aria-label");
      const ariaLabelledBy = img.getAttribute("aria-labelledby");
      const role = img.getAttribute("role");

      if (alt === null && !ariaLabel && !ariaLabelledBy) {
        this.addIssue("error", "Imagen sin atributo alt", img, {
          src: img.src?.substring(0, 100),
          wcag: WCAG.NON_TEXT_CONTENT,
        });
      } else if (alt === "") {
        // an empty alt is valid if the image is decorative
        if (role !== "presentation" && role !== "none") {
          this.addIssue(
            "warning",
            "Imagen con alt vacío (verificar si es decorativa)",
            img,
            {
              src: img.src?.substring(0, 100),
              wcag: WCAG.NON_TEXT_CONTENT,
            },
          );
        } else {
          this.markPassed();
        }
      } else if (alt && alt.length > 125) {
        this.addIssue("warning", "Alt text muy largo (> 125 caracteres)", img, {
          length: alt.length,
          alt: alt.substring(0, 50) + "...",
          wcag: BEST_PRACTICE,
        });
      } else {
        this.markPassed();
      }
    });

    // Analyze SVGs
    svgs.forEach((svg) => {
      const title = svg.querySelector("title");
      const desc = svg.querySelector("desc");
      const ariaLabel = svg.getAttribute("aria-label");
      const ariaLabelledBy = svg.getAttribute("aria-labelledby");
      const role = svg.getAttribute("role");

      const hasAccessibleName = !!(title || desc || ariaLabel || ariaLabelledBy);
      // A decorative icon is deliberately hidden from screen readers — that
      // is correct, it doesn't need any description at all. aria-hidden
      // cascades to descendants, so an ancestor marked aria-hidden="true"
      // (a common wrapper pattern, e.g. <div class="icon-tile" aria-hidden>)
      // already hides this SVG too, even without the attribute on the SVG
      // itself.
      const isMarkedDecorative =
        svg.closest('[aria-hidden="true"]') !== null ||
        role === "presentation" ||
        role === "none";

      if (hasAccessibleName || isMarkedDecorative) {
        this.markPassed();
      } else {
        this.addIssue(
          "warning",
          'SVG sin aria-hidden ni descripción accesible — si es decorativo, agrega aria-hidden="true"; si transmite información, agrega <title> o aria-label',
          svg,
          { tag: "svg", wcag: WCAG.NON_TEXT_CONTENT },
        );
      }
    });

    // Analyze background images
    backgroundImages.forEach(({ element, url }) => {
      const ariaLabel = element.getAttribute("aria-label");
      const role = element.getAttribute("role");

      if (!ariaLabel && role !== "presentation" && role !== "none") {
        this.addIssue("warning", "Background image sin aria-label", element, {
          url: url.substring(0, 100),
          wcag: WCAG.NON_TEXT_CONTENT,
        });
      }
    });

    return this.getSummary();
  }

  /**
   * Finds elements with a background-image
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
 * Contrast analyzer
 * Validates contrast ratio per WCAG
 */


class ContrastAnalyzer extends Analyzer {
  constructor() {
    super("Contraste", "Análisis de contraste WCAG");
  }

  async run() {
    this.reset();

    // Get all elements with text
    const textElements = this._querySelectorAll(
      "p, span, a, h1, h2, h3, h4, h5, h6, button, label, li, td, th, div",
    );

    let checkedCount = 0;
    let skippedCount = 0;

    textElements.forEach((element) => {
      // Only evaluate elements that render text directly. A <div> that
      // just wraps a <span> with its own color isn't the one painting the
      // text: comparing ITS color against the background gives a result
      // that doesn't correspond to anything visible on the page.
      if (!this._hasOwnVisibleText(element)) return;

      // Skip hidden elements
      const style = this._getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return;

      const colors = this._getColorInfo(element);
      if (!colors) {
        skippedCount++;
        return;
      }

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
            textSize: wcagAA.level,
            wcag: WCAG.CONTRAST_MINIMUM,
          },
        );
      }
    });

    if (checkedCount === 0 && skippedCount === 0) {
      // There was no text element on the page to evaluate.
      this.markPassed();
    } else if (skippedCount > 0) {
      this.addIssue(
        "info",
        `No se pudo determinar el fondo real de ${skippedCount} elemento(s) con imagen/gradiente de fondo — revisar el contraste ahí manualmente`,
        null,
        { skipped: skippedCount },
      );
    }

    return this.getSummary();
  }

  /**
   * Detects whether an element has its own text node (a direct child),
   * instead of text that only exists because a descendant provides it.
   * @private
   */
  _hasOwnVisibleText(element) {
    return Array.from(element.childNodes).some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 0,
    );
  }

  /**
   * @private
   */
  _isTransparent(backgroundColor) {
    return (
      !backgroundColor ||
      backgroundColor === "rgba(0, 0, 0, 0)" ||
      backgroundColor === "transparent"
    );
  }

  /**
   * Gets color information for an element
   * @private
   */
  _getColorInfo(element) {
    const style = this._getComputedStyle(element);
    const color = style.color;
    let backgroundColor = style.backgroundColor;
    let sawBackgroundImage =
      style.backgroundImage && style.backgroundImage !== "none";

    // If the background is transparent, look up through the ancestors
    let parent = element.parentElement;
    while (this._isTransparent(backgroundColor) && parent) {
      const parentStyle = this._getComputedStyle(parent);
      if (parentStyle.backgroundImage && parentStyle.backgroundImage !== "none") {
        sawBackgroundImage = true;
      }
      if (!this._isTransparent(parentStyle.backgroundColor)) {
        backgroundColor = parentStyle.backgroundColor;
      }
      parent = parent.parentElement;
    }

    if (this._isTransparent(backgroundColor)) {
      if (sawBackgroundImage) {
        // The real background comes from an image or gradient
        // (background-image): we can't reliably calculate it without
        // rendering the element. Better to skip than assume a wrong color.
        return null;
      }
      // Nobody set a background-color or background-image anywhere in the
      // chain: it's the browser's default white canvas.
      backgroundColor = "rgb(255, 255, 255)";
    }

    if (!color) return null;

    return {
      foreground: this._rgbToHex(color),
      background: this._rgbToHex(backgroundColor),
    };
  }

  /**
   * Converts RGB to Hex
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
   * Calculates the WCAG contrast ratio
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
   * Calculates a color's relative luminance
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
   * Checks whether it meets WCAG AA (4.5:1 normal, 3:1 large)
   * @private
   */
  _isWCAGAA(ratio, element) {
    const style = this._getComputedStyle(element);
    const fontSize = parseInt(style.fontSize);
    const fontWeight = style.fontWeight;

    // Large text: 18pt (24px) or 14pt (18.66px) bold
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
 * ARIA analyzer
 * Validates ARIA attributes, roles, properties, etc
 */


class AriaAnalyzer extends Analyzer {
  constructor() {
    super("ARIA", "Análisis de atributos ARIA");
  }

  async run() {
    this.reset();

    const ariaElements = this._querySelectorAll(
      "[role], [aria-label], [aria-labelledby], [aria-describedby], [aria-hidden], [aria-live]",
    ).filter((element) => this._isVisible(element));

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

      // Validate role
      if (role && !validRoles.includes(role)) {
        this.addIssue("error", `Rol ARIA inválido: "${role}"`, element, {
          invalidRole: role,
          wcag: WCAG.NAME_ROLE_VALUE,
        });
      } else if (role) {
        this.markPassed();
      }

      // Validate aria-labelledby
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
              wcag: WCAG.NAME_ROLE_VALUE,
            },
          );
        } else {
          this.markPassed();
        }
      }

      // Validate aria-describedby
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
              wcag: WCAG.NAME_ROLE_VALUE,
            },
          );
        } else {
          this.markPassed();
        }
      }

      // Validate that interactive elements have an accessible name
      const tagName = element.tagName.toLowerCase();
      const isInteractive = [
        "button",
        "a",
        "input",
        "select",
        "textarea",
      ].includes(tagName);

      // aria-hidden="true" deliberately removes the element from the
      // accessibility tree: requiring an accessible name there makes no sense.
      const isHiddenFromAT = element.getAttribute("aria-hidden") === "true";

      if (
        isInteractive &&
        !isHiddenFromAT &&
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
            wcag: WCAG.NAME_ROLE_VALUE,
          },
        );
      }
    });

    return this.getSummary();
  }
}

/**
 * Forms analyzer
 * Validates labels, inputs, accessible validation, etc
 */


class FormsAnalyzer extends Analyzer {
  constructor() {
    super("Formularios", "Análisis de formularios y accesibilidad");
  }

  async run() {
    this.reset();

    const inputs = this._querySelectorAll("input, select, textarea").filter(
      (input) => this._isVisible(input),
    );
    const labels = this._querySelectorAll("label");

    if (inputs.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analyze inputs
    inputs.forEach((input) => {
      const id = input.getAttribute("id");
      const name = input.getAttribute("name");
      const type = input.getAttribute("type") || "text";
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      const required =
        input.getAttribute("required") || input.getAttribute("aria-required");
      const disabled = input.disabled;

      // Validate type
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
          { type, wcag: BEST_PRACTICE },
        );
      }

      // Validate label
      let hasLabel = false;

      if (ariaLabel || ariaLabelledBy) {
        hasLabel = true;
      } else if (id && document.querySelector(`label[for="${id}"]`)) {
        hasLabel = true;
      } else if (input.closest("label")) {
        // Implicit label: <label>Name <input></label>, valid without for/id
        hasLabel = true;
      }

      // Some types don't require a label
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
            wcag: WCAG.LABELS_INSTRUCTIONS,
          },
        );
      } else {
        this.markPassed();
      }

      // Validate required attributes
      if (required) {
        this.markPassed();
      }

      // Validate that a disabled input has a visual indication
      if (disabled) {
        const style = this._getComputedStyle(input);
        if (style.opacity !== "1") {
          this.markPassed();
        }
      }
    });

    // Analyze labels
    labels.forEach((label) => {
      const forAttr = label.getAttribute("for");
      const text = label.textContent.trim();
      const wrapsAControl = !!label.querySelector("input, select, textarea");

      if (!forAttr && wrapsAControl) {
        // Implicit label: <label>Name <input></label>, doesn't need "for"
        this.markPassed();
      } else if (!forAttr) {
        this.addIssue(
          "warning",
          'Label sin atributo "for" y sin ningún campo adentro',
          label,
          { text: text.substring(0, 50), wcag: WCAG.INFO_RELATIONSHIPS },
        );
      } else {
        const input = document.getElementById(forAttr);
        if (!input) {
          this.addIssue(
            "error",
            `Label con "for" que no existe: ${forAttr}`,
            label,
            {
              for: forAttr,
              wcag: WCAG.INFO_RELATIONSHIPS,
            },
          );
        } else {
          this.markPassed();
        }
      }

      if (!text) {
        this.addIssue("error", "Label vacío sin texto", label, {
          for: forAttr || null,
          wcag: WCAG.LABELS_INSTRUCTIONS,
        });
      }
    });

    return this.getSummary();
  }
}

/**
 * HTML Semantics analyzer
 * Validates correct use of semantic tags
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

    // Check main
    const mains = this._querySelectorAll("main");
    if (mains.length === 0 && divCount > 10) {
      this.addIssue("warning", "No se encontró etiqueta <main>", null, {
        divCount,
        severity: "medium",
        wcag: WCAG.BYPASS_BLOCKS,
      });
      hasMainIssue = true;
    } else if (mains.length > 1) {
      this.addIssue(
        "warning",
        `Se encontraron ${mains.length} elementos <main> (debe haber solo 1)`,
        null,
        {
          count: mains.length,
          wcag: BEST_PRACTICE,
        },
      );
    } else {
      this.markPassed();
      mainCount++;
    }

    // Check nav
    const navs = this._querySelectorAll("nav");
    if (navs.length === 0 && this._querySelectorAll("ul, ol").length > 0) {
      this.addIssue(
        "warning",
        "Se encontraron listas pero no hay <nav>",
        null,
        {
          severity: "low",
          wcag: BEST_PRACTICE,
        },
      );
      hasNavIssue = true;
    } else if (navs.length > 0) {
      this.markPassed();
    }

    // Check header
    const headers = this._querySelectorAll("header");
    if (headers.length === 0) {
      this.addIssue("warning", "No se encontró etiqueta <header>", null, {
        severity: "low",
        wcag: BEST_PRACTICE,
      });
    } else {
      this.markPassed();
    }

    // Check footer
    const footers = this._querySelectorAll("footer");
    if (footers.length === 0) {
      this.addIssue("warning", "No se encontró etiqueta <footer>", null, {
        severity: "low",
        wcag: BEST_PRACTICE,
      });
    } else {
      this.markPassed();
    }

    // Check sections
    const sections = this._querySelectorAll("section");
    sections.forEach((section) => {
      const heading = section.querySelector("h1, h2, h3, h4, h5, h6");
      if (!heading) {
        this.addIssue("warning", "<section> sin encabezado", section, {
          tag: "section",
          wcag: BEST_PRACTICE,
        });
      } else {
        this.markPassed();
      }
    });

    // Check articles
    const articles = this._querySelectorAll("article");
    articles.forEach((article) => {
      const heading = article.querySelector("h1, h2, h3, h4, h5, h6");
      if (!heading) {
        this.addIssue("warning", "<article> sin encabezado", article, {
          tag: "article",
          wcag: BEST_PRACTICE,
        });
      } else {
        this.markPassed();
      }
    });

    // Warn if there are too many divs
    if (divCount > 50 && divCount > spanCount * 2) {
      this.addIssue(
        "info",
        `Muchos divs (${divCount}) - considera usar etiquetas semánticas`,
        null,
        {
          divCount,
          spanCount,
          severity: "suggestion",
          wcag: BEST_PRACTICE,
        },
      );
    } else {
      this.markPassed();
    }

    return this.getSummary();
  }
}

/**
 * Keyboard/Navigation analyzer
 * Validates keyboard navigation, focus, tabindex, traps, etc
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

    // Analyze interactive elements
    interactiveElements.forEach((element) => {
      const tabindex = element.getAttribute("tabindex");
      const disabled = element.disabled;
      const role = element.getAttribute("role");
      const hasClick = element.hasAttribute("onclick");

      // Check for negative tabindex on elements that should be accessible
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
              wcag: WCAG.KEYBOARD,
            },
          );
        }
      }

      // Check for tabindex > 0 (should be avoided)
      if (tabindex && parseInt(tabindex) > 0) {
        this.addIssue(
          "warning",
          "tabindex > 0 (considerar reordenar DOM)",
          element,
          {
            tabindex,
            wcag: WCAG.FOCUS_ORDER,
          },
        );
      } else {
        this.markPassed();
      }

      // Check for divs/spans with click handlers
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
              wcag: WCAG.NAME_ROLE_VALUE,
            },
          );
        }

        // Check that it's keyboard-navigable
        if (tabindex === null || tabindex === undefined) {
          this.addIssue(
            "error",
            "Elemento con onclick no es navegable por teclado",
            element,
            {
              tag: element.tagName.toLowerCase(),
              wcag: WCAG.KEYBOARD,
            },
          );
        }
      }

    });

    // Note: the visible focus indicator (:focus-visible) CANNOT be
    // checked from here — see "Limitations" in the usage guide. Reporting a
    // "don't know" as if it were an audit finding wouldn't make sense.

    // Look for modal traps (focus can't escape)
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
            wcag: WCAG.KEYBOARD,
          },
        );
      }
    });

    return this.getSummary();
  }
}

/**
 * Links analyzer
 * Validates link text, the real destination, and new-tab warnings
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

    const links = this._querySelectorAll("a").filter((link) =>
      this._isVisible(link),
    );

    if (links.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    links.forEach((link) => {
      const text = link.textContent.trim();
      const ariaLabel = link.getAttribute("aria-label");
      const hasImgAlt = !!link.querySelector("img[alt]:not([alt=''])");
      const accessibleName = ariaLabel || text;

      // Link text
      if (!accessibleName && !hasImgAlt) {
        this.addIssue("error", "Enlace sin texto ni etiqueta accesible", link, {
          wcag: WCAG.LINK_PURPOSE,
        });
      } else if (
        !ariaLabel &&
        GENERIC_LINK_TEXTS.includes(text.toLowerCase())
      ) {
        this.addIssue(
          "warning",
          `Texto de enlace genérico: "${text}" (no describe el destino)`,
          link,
          { text, wcag: WCAG.LINK_PURPOSE },
        );
      } else {
        this.markPassed();
      }

      // Real destination
      const href = link.getAttribute("href");
      if (href === null) {
        this.addIssue(
          "warning",
          "Elemento <a> sin atributo href (no es navegable ni focuseable)",
          link,
          { wcag: WCAG.KEYBOARD },
        );
      } else if (href === "" || href === "#" || /^javascript:void\(0?\)$/.test(href)) {
        this.addIssue(
          "warning",
          "Enlace sin destino real (href vacío, '#' o javascript:void(0))",
          link,
          { href, wcag: WCAG.LINK_PURPOSE },
        );
      } else {
        this.markPassed();
      }

      // New tab without a warning
      if (link.getAttribute("target") === "_blank") {
        const warnsUser = NEW_TAB_WARNING_PATTERN.test(
          `${ariaLabel || ""} ${text}`,
        );

        if (!warnsUser) {
          this.addIssue(
            "warning",
            "Se abre en una pestaña nueva sin avisarlo en el texto o aria-label",
            link,
            { target: "_blank", wcag: WCAG.CHANGE_ON_REQUEST },
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
            { rel, wcag: BEST_PRACTICE },
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
 * Main audit engine
 * Orchestrates running all the analyzers and compiles the results
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

    // Gives the panel a way to request the full JSON (with metadata and
    // summary), not just the internal analyzer map it uses to render tabs.
    if (this.ui) {
      this.ui.getFullResults = () => this.getResults();
    }
  }

  /**
   * Runs all the analyzers
   */
  async runAll() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.results = {};

    this.ui?.open();

    // Run every analyzer
    const promises = this.analyzers.map((analyzer) =>
      this._runAnalyzer(analyzer),
    );

    await Promise.all(promises);

    this.isRunning = false;
    return this.getResults();
  }

  /**
   * Runs a specific analyzer
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
   * Runs an analyzer and handles errors
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
   * Gets the compiled results
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
   * Generates a summary of all the results
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
   * Calculates overall severity
   * @private
   */
  _calculateSeverity(errors, warnings) {
    if (errors > 0) return "critical";
    if (warnings > 5) return "high";
    if (warnings > 0) return "medium";
    return "low";
  }

  /**
   * Gets the names of all the analyzers
   */
  getAnalyzerNames() {
    return this.analyzers.map((a) => a.name);
  }

  /**
   * Clears all results
   */
  reset() {
    this.results = {};
    this.analyzers.forEach((a) => a.reset());
  }
}

/**
 * Utilities for handling JSON and the clipboard
 */
class JsonUtils {
  /**
   * Serializes results to JSON
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
   * Copies JSON to the clipboard
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

      // Fallback in case the clipboard API doesn't work
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
   * Logs results to the console in a readable way
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

    // Results per analyzer
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
   * Exports results to CSV
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
   * Downloads results as a JSON file
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
   * Downloads results as a CSV file
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
})();
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

export default AuditUI;

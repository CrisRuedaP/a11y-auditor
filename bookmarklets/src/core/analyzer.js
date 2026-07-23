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

export default Analyzer;

/**
 * Axe-Core analyzer
 * Runs the axe-core library to detect accessibility issues
 */
import Analyzer from "../core/analyzer.js";
import { BEST_PRACTICE } from "../core/wcag.js";

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

export default AxeCoreAnalyzer;

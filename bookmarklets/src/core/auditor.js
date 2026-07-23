/**
 * Main audit engine
 * Orchestrates running all the analyzers and compiles the results
 */
import HeadingsAnalyzer from "../analyzers/headings.js";
import AxeCoreAnalyzer from "../analyzers/axeCore.js";
import ImagesAnalyzer from "../analyzers/images.js";
import ContrastAnalyzer from "../analyzers/contrast.js";
import AriaAnalyzer from "../analyzers/aria.js";
import FormsAnalyzer from "../analyzers/forms.js";
import SemanticAnalyzer from "../analyzers/semantic.js";
import KeyboardAnalyzer from "../analyzers/keyboard.js";
import LinksAnalyzer from "../analyzers/links.js";

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

export default Auditor;

/**
 * Motor principal de auditoría
 * Orquesta la ejecución de todos los analizadores y compila resultados
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

    // Le da al panel una forma de pedir el JSON completo (con metadata y
    // summary), no solo el mapa interno de analizadores que usa para
    // pintar las pestañas.
    if (this.ui) {
      this.ui.getFullResults = () => this.getResults();
    }
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

export default Auditor;

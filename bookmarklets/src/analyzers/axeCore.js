/**
 * Analizador Axe-Core
 * Ejecuta la librería axe-core para detectar problemas de accesibilidad
 */
import Analyzer from "../core/analyzer.js";

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

export default AxeCoreAnalyzer;

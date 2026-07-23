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

  /**
   * Un elemento oculto por CSS (display:none o visibility:hidden) no es
   * perceivable por nadie ahora mismo, así que no debería contar para
   * chequeos que dependen de lo que la página muestra realmente.
   * @protected
   */
  _isVisible(element) {
    const style = this._getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  }
}

export default Analyzer;

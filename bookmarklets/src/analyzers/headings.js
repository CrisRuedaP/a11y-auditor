/**
 * Analizador de Headings (h1-h6)
 * Valida jerarquía, detecta saltos de nivel, h1 duplicados, etc
 */
import Analyzer from "../core/analyzer.js";

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

export default HeadingsAnalyzer;

/**
 * Analizador de Semántica HTML
 * Valida el uso correcto de etiquetas semánticas
 */
import Analyzer from "../core/analyzer.js";
import { WCAG, BEST_PRACTICE } from "../core/wcag.js";

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

    // Verificar nav
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

    // Verificar header
    const headers = this._querySelectorAll("header");
    if (headers.length === 0) {
      this.addIssue("warning", "No se encontró etiqueta <header>", null, {
        severity: "low",
        wcag: BEST_PRACTICE,
      });
    } else {
      this.markPassed();
    }

    // Verificar footer
    const footers = this._querySelectorAll("footer");
    if (footers.length === 0) {
      this.addIssue("warning", "No se encontró etiqueta <footer>", null, {
        severity: "low",
        wcag: BEST_PRACTICE,
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
          wcag: BEST_PRACTICE,
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
          wcag: BEST_PRACTICE,
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
          wcag: BEST_PRACTICE,
        },
      );
    } else {
      this.markPassed();
    }

    return this.getSummary();
  }
}

export default SemanticAnalyzer;

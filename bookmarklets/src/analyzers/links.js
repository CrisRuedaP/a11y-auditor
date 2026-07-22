/**
 * Analizador de Links
 * Valida texto de enlace, destino real y avisos de nueva pestaña
 */
import Analyzer from "../core/analyzer.js";

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

      // Texto de enlace
      if (!accessibleName && !hasImgAlt) {
        this.addIssue("error", "Enlace sin texto ni etiqueta accesible", link, {});
      } else if (
        !ariaLabel &&
        GENERIC_LINK_TEXTS.includes(text.toLowerCase())
      ) {
        this.addIssue(
          "warning",
          `Texto de enlace genérico: "${text}" (no describe el destino)`,
          link,
          { text },
        );
      } else {
        this.markPassed();
      }

      // Destino real
      const href = link.getAttribute("href");
      if (href === null) {
        this.addIssue(
          "warning",
          "Elemento <a> sin atributo href (no es navegable ni focuseable)",
          link,
          {},
        );
      } else if (href === "" || href === "#" || /^javascript:void\(0?\)$/.test(href)) {
        this.addIssue(
          "warning",
          "Enlace sin destino real (href vacío, '#' o javascript:void(0))",
          link,
          { href },
        );
      } else {
        this.markPassed();
      }

      // Nueva pestaña sin aviso
      if (link.getAttribute("target") === "_blank") {
        const warnsUser = NEW_TAB_WARNING_PATTERN.test(
          `${ariaLabel || ""} ${text}`,
        );

        if (!warnsUser) {
          this.addIssue(
            "warning",
            "Se abre en una pestaña nueva sin avisarlo en el texto o aria-label",
            link,
            { target: "_blank" },
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
            { rel },
          );
        } else {
          this.markPassed();
        }
      }
    });

    return this.getSummary();
  }
}

export default LinksAnalyzer;

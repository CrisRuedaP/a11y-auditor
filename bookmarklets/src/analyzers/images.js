/**
 * Analizador de Imágenes
 * Valida alt text, detecta imágenes decorativas, etc
 */
import Analyzer from "../core/analyzer.js";

class ImagesAnalyzer extends Analyzer {
  constructor() {
    super("Imágenes", "Análisis de imágenes y alt text");
  }

  async run() {
    this.reset();

    // Encontrar todas las imágenes
    const images = this._querySelectorAll("img").filter((img) => this._isVisible(img));
    const svgs = this._querySelectorAll("svg").filter((svg) => this._isVisible(svg));
    const backgroundImages = this._findBackgroundImages();

    const totalImages = images.length + svgs.length + backgroundImages.length;

    if (totalImages === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analizar IMG tags
    images.forEach((img) => {
      const alt = img.getAttribute("alt");
      const ariaLabel = img.getAttribute("aria-label");
      const ariaLabelledBy = img.getAttribute("aria-labelledby");
      const role = img.getAttribute("role");

      if (!alt && !ariaLabel && !ariaLabelledBy) {
        this.addIssue("error", "Imagen sin atributo alt", img, {
          src: img.src?.substring(0, 100),
        });
      } else if (alt === "") {
        // alt vacío es válido si es decorativa
        if (role !== "presentation" && role !== "none") {
          this.addIssue(
            "warning",
            "Imagen con alt vacío (verificar si es decorativa)",
            img,
            {
              src: img.src?.substring(0, 100),
            },
          );
        } else {
          this.markPassed();
        }
      } else if (alt && alt.length > 125) {
        this.addIssue("warning", "Alt text muy largo (> 125 caracteres)", img, {
          length: alt.length,
          alt: alt.substring(0, 50) + "...",
        });
      } else {
        this.markPassed();
      }
    });

    // Analizar SVGs
    svgs.forEach((svg) => {
      const title = svg.querySelector("title");
      const desc = svg.querySelector("desc");
      const ariaLabel = svg.getAttribute("aria-label");
      const ariaLabelledBy = svg.getAttribute("aria-labelledby");
      const role = svg.getAttribute("role");

      if (!title && !desc && !ariaLabel && !ariaLabelledBy) {
        this.addIssue("error", "SVG sin descripción accesible", svg, {
          tag: "svg",
        });
      } else {
        this.markPassed();
      }
    });

    // Analizar background images
    backgroundImages.forEach(({ element, url }) => {
      const ariaLabel = element.getAttribute("aria-label");
      const role = element.getAttribute("role");

      if (!ariaLabel && role !== "presentation" && role !== "none") {
        this.addIssue("warning", "Background image sin aria-label", element, {
          url: url.substring(0, 100),
        });
      }
    });

    return this.getSummary();
  }

  /**
   * Encuentra elementos con background-image
   * @private
   */
  _findBackgroundImages() {
    const elements = [];
    this._querySelectorAll("*").forEach((el) => {
      const style = this._getComputedStyle(el);
      const bgImage = style.backgroundImage;

      if (bgImage && bgImage !== "none") {
        const url = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];
        if (url) {
          elements.push({ element: el, url });
        }
      }
    });

    return elements;
  }
}

export default ImagesAnalyzer;

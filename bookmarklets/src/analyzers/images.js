/**
 * Images analyzer
 * Validates alt text, detects decorative images, etc
 */
import Analyzer from "../core/analyzer.js";
import { WCAG, BEST_PRACTICE } from "../core/wcag.js";

class ImagesAnalyzer extends Analyzer {
  constructor() {
    super("Imágenes", "Análisis de imágenes y alt text");
  }

  async run() {
    this.reset();

    // Find all images
    const images = this._querySelectorAll("img").filter((img) => this._isVisible(img));
    const svgs = this._querySelectorAll("svg").filter((svg) => this._isVisible(svg));
    const backgroundImages = this._findBackgroundImages();

    const totalImages = images.length + svgs.length + backgroundImages.length;

    if (totalImages === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analyze IMG tags
    images.forEach((img) => {
      const alt = img.getAttribute("alt");
      const ariaLabel = img.getAttribute("aria-label");
      const ariaLabelledBy = img.getAttribute("aria-labelledby");
      const role = img.getAttribute("role");

      if (alt === null && !ariaLabel && !ariaLabelledBy) {
        this.addIssue("error", "Imagen sin atributo alt", img, {
          src: img.src?.substring(0, 100),
          wcag: WCAG.NON_TEXT_CONTENT,
        });
      } else if (alt === "") {
        // an empty alt is valid if the image is decorative
        if (role !== "presentation" && role !== "none") {
          this.addIssue(
            "warning",
            "Imagen con alt vacío (verificar si es decorativa)",
            img,
            {
              src: img.src?.substring(0, 100),
              wcag: WCAG.NON_TEXT_CONTENT,
            },
          );
        } else {
          this.markPassed();
        }
      } else if (alt && alt.length > 125) {
        this.addIssue("warning", "Alt text muy largo (> 125 caracteres)", img, {
          length: alt.length,
          alt: alt.substring(0, 50) + "...",
          wcag: BEST_PRACTICE,
        });
      } else {
        this.markPassed();
      }
    });

    // Analyze SVGs
    svgs.forEach((svg) => {
      const title = svg.querySelector("title");
      const desc = svg.querySelector("desc");
      const ariaLabel = svg.getAttribute("aria-label");
      const ariaLabelledBy = svg.getAttribute("aria-labelledby");
      const role = svg.getAttribute("role");

      const hasAccessibleName = !!(title || desc || ariaLabel || ariaLabelledBy);
      // A decorative icon is deliberately hidden from screen readers — that
      // is correct, it doesn't need any description at all.
      const isMarkedDecorative =
        svg.getAttribute("aria-hidden") === "true" ||
        role === "presentation" ||
        role === "none";

      if (hasAccessibleName || isMarkedDecorative) {
        this.markPassed();
      } else {
        this.addIssue(
          "warning",
          'SVG sin aria-hidden ni descripción accesible — si es decorativo, agrega aria-hidden="true"; si transmite información, agrega <title> o aria-label',
          svg,
          { tag: "svg", wcag: WCAG.NON_TEXT_CONTENT },
        );
      }
    });

    // Analyze background images
    backgroundImages.forEach(({ element, url }) => {
      const ariaLabel = element.getAttribute("aria-label");
      const role = element.getAttribute("role");

      if (!ariaLabel && role !== "presentation" && role !== "none") {
        this.addIssue("warning", "Background image sin aria-label", element, {
          url: url.substring(0, 100),
          wcag: WCAG.NON_TEXT_CONTENT,
        });
      }
    });

    return this.getSummary();
  }

  /**
   * Finds elements with a background-image
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

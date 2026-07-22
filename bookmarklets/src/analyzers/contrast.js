/**
 * Analizador de Contraste
 * Valida relación de contraste según WCAG
 */
import Analyzer from "../core/analyzer.js";

class ContrastAnalyzer extends Analyzer {
  constructor() {
    super("Contraste", "Análisis de contraste WCAG");
  }

  async run() {
    this.reset();

    // Obtener todos los elementos con texto
    const textElements = this._querySelectorAll(
      "p, span, a, h1, h2, h3, h4, h5, h6, button, label, li, td, th, div",
    );

    let checkedCount = 0;
    let skippedCount = 0;

    textElements.forEach((element) => {
      // Solo evaluar elementos que renderizan texto directamente. Un <div>
      // que solo envuelve a un <span> con su propio color no es quien
      // pinta el texto: comparar SU color contra el fondo da un resultado
      // que no corresponde a nada visible en la página.
      if (!this._hasOwnVisibleText(element)) return;

      // Saltar elementos ocultos
      const style = this._getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return;

      const colors = this._getColorInfo(element);
      if (!colors) {
        skippedCount++;
        return;
      }

      checkedCount++;

      const ratio = this._calculateContrastRatio(
        colors.foreground,
        colors.background,
      );
      const wcagAA = this._isWCAGAA(ratio, element);

      if (wcagAA.passed) {
        this.markPassed();
      } else {
        this.addIssue(
          "error",
          `Contraste insuficiente: ${ratio.toFixed(2)}:1 (se requieren ${wcagAA.required}:1)`,
          element,
          {
            ratio: ratio.toFixed(2),
            required: wcagAA.required,
            foreground: colors.foreground,
            background: colors.background,
            level: wcagAA.level,
          },
        );
      }
    });

    if (checkedCount === 0 && skippedCount === 0) {
      // No había ningún elemento de texto que evaluar en la página.
      this.markPassed();
    } else if (skippedCount > 0) {
      this.addIssue(
        "info",
        `No se pudo determinar el fondo real de ${skippedCount} elemento(s) con imagen/gradiente de fondo — revisar el contraste ahí manualmente`,
        null,
        { skipped: skippedCount },
      );
    }

    return this.getSummary();
  }

  /**
   * Detecta si un elemento tiene un nodo de texto propio (hijo directo),
   * en vez de texto que solo existe porque un descendiente lo aporta.
   * @private
   */
  _hasOwnVisibleText(element) {
    return Array.from(element.childNodes).some(
      (node) => node.nodeType === 3 && node.textContent.trim().length > 0,
    );
  }

  /**
   * @private
   */
  _isTransparent(backgroundColor) {
    return (
      !backgroundColor ||
      backgroundColor === "rgba(0, 0, 0, 0)" ||
      backgroundColor === "transparent"
    );
  }

  /**
   * Obtiene información de colores de un elemento
   * @private
   */
  _getColorInfo(element) {
    const style = this._getComputedStyle(element);
    const color = style.color;
    let backgroundColor = style.backgroundColor;
    let sawBackgroundImage =
      style.backgroundImage && style.backgroundImage !== "none";

    // Si el background es transparente, buscar en los padres
    let parent = element.parentElement;
    while (this._isTransparent(backgroundColor) && parent) {
      const parentStyle = this._getComputedStyle(parent);
      if (parentStyle.backgroundImage && parentStyle.backgroundImage !== "none") {
        sawBackgroundImage = true;
      }
      if (!this._isTransparent(parentStyle.backgroundColor)) {
        backgroundColor = parentStyle.backgroundColor;
      }
      parent = parent.parentElement;
    }

    if (this._isTransparent(backgroundColor)) {
      if (sawBackgroundImage) {
        // El fondo real viene de una imagen o gradiente (background-image):
        // no podemos calcularlo de forma confiable sin renderizar el
        // elemento. Mejor no evaluar que asumir un color equivocado.
        return null;
      }
      // Nadie definió background-color ni background-image en la cadena:
      // es el lienzo blanco por defecto del navegador.
      backgroundColor = "rgb(255, 255, 255)";
    }

    if (!color) return null;

    return {
      foreground: this._rgbToHex(color),
      background: this._rgbToHex(backgroundColor),
    };
  }

  /**
   * Convierte RGB a Hex
   * @private
   */
  _rgbToHex(rgb) {
    if (rgb.startsWith("#")) return rgb;

    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return null;

    return (
      "#" +
      [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  /**
   * Calcula la relación de contraste WCAG
   * @private
   */
  _calculateContrastRatio(foreground, background) {
    if (!foreground || !background) return 1;

    const fgLum = this._getLuminance(foreground);
    const bgLum = this._getLuminance(background);

    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calcula la luminancia relativa de un color
   * @private
   */
  _getLuminance(hex) {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;

    const [rs, gs, bs] = [r, g, b].map((x) => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Verifica si cumple WCAG AA (4.5:1 normal, 3:1 large)
   * @private
   */
  _isWCAGAA(ratio, element) {
    const style = this._getComputedStyle(element);
    const fontSize = parseInt(style.fontSize);
    const fontWeight = style.fontWeight;

    // Large text: 18pt (24px) o 14pt (18.66px) bold
    const isLargeText =
      fontSize >= 24 ||
      (fontSize >= 18 &&
        (fontWeight === "bold" || parseInt(fontWeight) >= 700));

    const required = isLargeText ? 3 : 4.5;
    const passed = ratio >= required;

    return { passed, required, level: isLargeText ? "large" : "normal" };
  }
}

export default ContrastAnalyzer;

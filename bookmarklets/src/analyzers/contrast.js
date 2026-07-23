/**
 * Contrast analyzer
 * Validates contrast ratio per WCAG
 */
import Analyzer from "../core/analyzer.js";
import { WCAG } from "../core/wcag.js";

class ContrastAnalyzer extends Analyzer {
  constructor() {
    super("Contraste", "Análisis de contraste WCAG");
  }

  async run() {
    this.reset();

    // Get all elements with text
    const textElements = this._querySelectorAll(
      "p, span, a, h1, h2, h3, h4, h5, h6, button, label, li, td, th, div",
    );

    let checkedCount = 0;
    let skippedCount = 0;

    textElements.forEach((element) => {
      // Only evaluate elements that render text directly. A <div> that
      // just wraps a <span> with its own color isn't the one painting the
      // text: comparing ITS color against the background gives a result
      // that doesn't correspond to anything visible on the page.
      if (!this._hasOwnVisibleText(element)) return;

      // Skip hidden elements
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
            textSize: wcagAA.level,
            wcag: WCAG.CONTRAST_MINIMUM,
          },
        );
      }
    });

    if (checkedCount === 0 && skippedCount === 0) {
      // There was no text element on the page to evaluate.
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
   * Detects whether an element has its own text node (a direct child),
   * instead of text that only exists because a descendant provides it.
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
   * Gets color information for an element
   * @private
   */
  _getColorInfo(element) {
    const style = this._getComputedStyle(element);
    const color = style.color;
    let backgroundColor = style.backgroundColor;
    let sawBackgroundImage =
      style.backgroundImage && style.backgroundImage !== "none";

    // If the background is transparent, look up through the ancestors
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
        // The real background comes from an image or gradient
        // (background-image): we can't reliably calculate it without
        // rendering the element. Better to skip than assume a wrong color.
        return null;
      }
      // Nobody set a background-color or background-image anywhere in the
      // chain: it's the browser's default white canvas.
      backgroundColor = "rgb(255, 255, 255)";
    }

    if (!color) return null;

    return {
      foreground: this._rgbToHex(color),
      background: this._rgbToHex(backgroundColor),
    };
  }

  /**
   * Converts RGB to Hex
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
   * Calculates the WCAG contrast ratio
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
   * Calculates a color's relative luminance
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
   * Checks whether it meets WCAG AA (4.5:1 normal, 3:1 large)
   * @private
   */
  _isWCAGAA(ratio, element) {
    const style = this._getComputedStyle(element);
    const fontSize = parseInt(style.fontSize);
    const fontWeight = style.fontWeight;

    // Large text: 18pt (24px) or 14pt (18.66px) bold
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

/**
 * Keyboard/Navigation analyzer
 * Validates keyboard navigation, focus, tabindex, traps, etc
 */
import Analyzer from "../core/analyzer.js";
import { WCAG } from "../core/wcag.js";

class KeyboardAnalyzer extends Analyzer {
  constructor() {
    super("Teclado", "Análisis de navegación por teclado");
  }

  async run() {
    this.reset();

    const interactiveElements = this._querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="menuitem"], [onclick]',
    );

    if (interactiveElements.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analyze interactive elements
    interactiveElements.forEach((element) => {
      const tabindex = element.getAttribute("tabindex");
      const disabled = element.disabled;
      const role = element.getAttribute("role");
      const hasClick = element.hasAttribute("onclick");

      // Check for negative tabindex on elements that should be accessible
      if (tabindex && parseInt(tabindex) < 0) {
        const isNaturallyFocusable = [
          "button",
          "a",
          "input",
          "select",
          "textarea",
        ].includes(element.tagName.toLowerCase());

        if (isNaturallyFocusable) {
          this.addIssue(
            "warning",
            "Elemento nativo con tabindex negativo",
            element,
            {
              tabindex,
              tag: element.tagName.toLowerCase(),
              wcag: WCAG.KEYBOARD,
            },
          );
        }
      }

      // Check for tabindex > 0 (should be avoided)
      if (tabindex && parseInt(tabindex) > 0) {
        this.addIssue(
          "warning",
          "tabindex > 0 (considerar reordenar DOM)",
          element,
          {
            tabindex,
            wcag: WCAG.FOCUS_ORDER,
          },
        );
      } else {
        this.markPassed();
      }

      // Check for divs/spans with click handlers
      if (
        hasClick &&
        !["button", "a"].includes(element.tagName.toLowerCase())
      ) {
        if (!role || !["button", "link"].includes(role)) {
          this.addIssue(
            "error",
            'Elemento con onclick sin role="button"',
            element,
            {
              tag: element.tagName.toLowerCase(),
              wcag: WCAG.NAME_ROLE_VALUE,
            },
          );
        }

        // Check that it's keyboard-navigable
        if (tabindex === null || tabindex === undefined) {
          this.addIssue(
            "error",
            "Elemento con onclick no es navegable por teclado",
            element,
            {
              tag: element.tagName.toLowerCase(),
              wcag: WCAG.KEYBOARD,
            },
          );
        }
      }

    });

    // Note: the visible focus indicator (:focus-visible) CANNOT be
    // checked from here — see "Limitations" in the usage guide. Reporting a
    // "don't know" as if it were an audit finding wouldn't make sense.

    // Look for modal traps (focus can't escape)
    const modals = this._querySelectorAll('[role="dialog"], dialog');
    modals.forEach((modal) => {
      const focusableElements = modal.querySelectorAll(
        "button, a, input, select, textarea, [tabindex]",
      );

      if (focusableElements.length === 0) {
        this.addIssue(
          "warning",
          "Modal/dialog sin elementos focusables",
          modal,
          {
            tag: modal.tagName.toLowerCase(),
            wcag: WCAG.KEYBOARD,
          },
        );
      }
    });

    return this.getSummary();
  }
}

export default KeyboardAnalyzer;

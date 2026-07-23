/**
 * Analizador de Teclado/Navegación
 * Valida navegación por teclado, focus, tabindex, traps, etc
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

    // Analizar elementos interactivos
    interactiveElements.forEach((element) => {
      const tabindex = element.getAttribute("tabindex");
      const disabled = element.disabled;
      const role = element.getAttribute("role");
      const hasClick = element.hasAttribute("onclick");

      // Verificar tabindex negativo en elementos que deberían ser accesibles
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

      // Verificar tabindex > 0 (evitar)
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

      // Verificar divs/spans con click handlers
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

        // Verificar que sea navegable por teclado
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

    // Nota: el indicador de foco visible (:focus-visible) NO se puede
    // comprobar desde acá — ver "Limitaciones" en la guía de uso. No tiene
    // sentido reportar un "no sé" como si fuera un hallazgo de la auditoría.

    // Buscar modal traps (focus no puede escapar)
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

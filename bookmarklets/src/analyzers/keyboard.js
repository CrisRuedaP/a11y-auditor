/**
 * Analizador de Teclado/Navegación
 * Valida navegación por teclado, focus, tabindex, traps, etc
 */
import Analyzer from "../core/analyzer.js";

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
            },
          );
        }
      }

    });

    if (interactiveElements.length > 0) {
      // No podemos comprobar el indicador de foco automáticamente: el
      // propio bookmarklet solo se dispara con un clic de mouse, y en
      // cuanto el navegador registra un clic deja de aplicar
      // :focus-visible a los foco()s programáticos siguientes (es una
      // protección del navegador contra scripts que simulan teclado, no
      // algo que se pueda evitar). Revisar manualmente con Tab.
      this.addIssue(
        "info",
        "El indicador de foco (:focus-visible) no se puede comprobar desde un bookmarklet — navegá la página con Tab y revisalo a simple vista",
        null,
        { interactiveElements: interactiveElements.length },
      );
    }

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
          },
        );
      }
    });

    return this.getSummary();
  }
}

export default KeyboardAnalyzer;

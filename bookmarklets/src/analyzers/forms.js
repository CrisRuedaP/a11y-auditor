/**
 * Forms analyzer
 * Validates labels, inputs, accessible validation, etc
 */
import Analyzer from "../core/analyzer.js";
import { WCAG, BEST_PRACTICE } from "../core/wcag.js";

class FormsAnalyzer extends Analyzer {
  constructor() {
    super("Formularios", "Análisis de formularios y accesibilidad");
  }

  async run() {
    this.reset();

    const inputs = this._querySelectorAll("input, select, textarea").filter(
      (input) => this._isVisible(input),
    );
    const labels = this._querySelectorAll("label");

    if (inputs.length === 0) {
      this.markPassed();
      return this.getSummary();
    }

    // Analyze inputs
    inputs.forEach((input) => {
      const id = input.getAttribute("id");
      const name = input.getAttribute("name");
      const type = input.getAttribute("type") || "text";
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      const required =
        input.getAttribute("required") || input.getAttribute("aria-required");
      const disabled = input.disabled;

      // Validate type
      const validTypes = [
        "text",
        "password",
        "email",
        "number",
        "tel",
        "url",
        "search",
        "date",
        "time",
        "datetime-local",
        "month",
        "week",
        "color",
        "range",
        "file",
        "submit",
        "reset",
        "button",
        "checkbox",
        "radio",
        "hidden",
      ];

      if (!validTypes.includes(type)) {
        this.addIssue(
          "warning",
          `Tipo de input no estándar: "${type}"`,
          input,
          { type, wcag: BEST_PRACTICE },
        );
      }

      // Validate label
      let hasLabel = false;

      if (ariaLabel || ariaLabelledBy) {
        hasLabel = true;
      } else if (id && document.querySelector(`label[for="${id}"]`)) {
        hasLabel = true;
      } else if (input.closest("label")) {
        // Implicit label: <label>Name <input></label>, valid without for/id
        hasLabel = true;
      }

      // Some types don't require a label
      if (
        !hasLabel &&
        type !== "hidden" &&
        type !== "submit" &&
        type !== "reset" &&
        type !== "button"
      ) {
        this.addIssue(
          "error",
          `Input sin label asociado (id: ${id || "sin id"})`,
          input,
          {
            type,
            id: id || null,
            wcag: WCAG.LABELS_INSTRUCTIONS,
          },
        );
      } else {
        this.markPassed();
      }

      // Validate required attributes
      if (required) {
        this.markPassed();
      }

      // Validate that a disabled input has a visual indication
      if (disabled) {
        const style = this._getComputedStyle(input);
        if (style.opacity !== "1") {
          this.markPassed();
        }
      }
    });

    // Analyze labels
    labels.forEach((label) => {
      const forAttr = label.getAttribute("for");
      const text = label.textContent.trim();
      const wrapsAControl = !!label.querySelector("input, select, textarea");

      if (!forAttr && wrapsAControl) {
        // Implicit label: <label>Name <input></label>, doesn't need "for"
        this.markPassed();
      } else if (!forAttr) {
        this.addIssue(
          "warning",
          'Label sin atributo "for" y sin ningún campo adentro',
          label,
          { text: text.substring(0, 50), wcag: WCAG.INFO_RELATIONSHIPS },
        );
      } else {
        const input = document.getElementById(forAttr);
        if (!input) {
          this.addIssue(
            "error",
            `Label con "for" que no existe: ${forAttr}`,
            label,
            {
              for: forAttr,
              wcag: WCAG.INFO_RELATIONSHIPS,
            },
          );
        } else {
          this.markPassed();
        }
      }

      if (!text) {
        this.addIssue("error", "Label vacío sin texto", label, {
          for: forAttr || null,
          wcag: WCAG.LABELS_INSTRUCTIONS,
        });
      }
    });

    return this.getSummary();
  }
}

export default FormsAnalyzer;
